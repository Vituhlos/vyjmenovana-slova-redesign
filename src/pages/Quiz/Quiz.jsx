import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAiSentences, getAchievements, getMistakes, saveSession, getStreak } from "../../lib/api";
import { playSound } from "../../lib/audio";
import {
  CATEGORY_ORDER, SELECTABLE_CATS,
  pickSentences, getSeenSigs, addSeenSigs, sentenceSignature,
} from "../../lib/sentences";
import { LETTERS, TAB_META, MIX_META, REVIEW_META, getTabMeta } from "../../lib/theme";
import { getBankSummary } from "../../sentenceBank";
import Header from "../../components/layout/Header/Header";
import LetterTabs from "../../components/layout/LetterTabs/LetterTabs";
import SentenceRow from "../../components/quiz/SentenceRow/SentenceRow";
import ScoreCard from "../../components/quiz/ScoreCard/ScoreCard";
import Toast from "../../components/ui/Toast/Toast";
import TahakOverlay from "../../components/overlays/TahakOverlay/TahakOverlay";
import styles from "./Quiz.module.css";

const CAT_LABELS = {
  basicWords: "Základní",
  relatedWords: "Příbuzná",
  easySentences: "Lehké",
  mediumSentences: "Střední",
};

const COUNTS = [4, 6, 8, 10, 15];
const LETTERS_OBJ = (val) => Object.fromEntries(
  [...LETTERS, "MIX", "REVIEW"].map((l) => [l, val])
);

const _initCount = parseInt(localStorage.getItem("vs_count") || "6");
const _initCats = (() => {
  try {
    const c = JSON.parse(localStorage.getItem("vs_cats"));
    return Array.isArray(c) && c.length > 0
      ? c.filter((x) => x !== "trickQuestions")
      : [...SELECTABLE_CATS];
  } catch {
    return [...SELECTABLE_CATS];
  }
})();

export default function Quiz() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("M");
  const [sentenceCount, setSentenceCount] = useState(_initCount);
  const [activeCats, setActiveCats] = useState(_initCats);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("vs_sound") !== "false");

  const [sentences, setSentences] = useState(() => {
    const initial = pickSentences("M", _initCount, _initCats);
    return { ...LETTERS_OBJ(null), M: initial };
  });
  const [inputs, setInputs] = useState(() => {
    const initial = pickSentences("M", _initCount, _initCats);
    return {
      ...LETTERS_OBJ([]),
      M: initial.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")),
    };
  });
  const [checked, setChecked] = useState(() => LETTERS_OBJ(false));
  const [score, setScore] = useState(() => LETTERS_OBJ(null));

  const [streakData, setStreakData] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [showTahak, setShowTahak] = useState(false);

  const sessionStartRef = useRef(Date.now());
  const activeTabRef = useRef("M");
  const prevAchievementsRef = useRef(null);
  const toastTimerRef = useRef(null);
  const settingsKeyRef = useRef(`${_initCount}:${_initCats.join(",")}`);

  // ── Persist settings ─────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("vs_count", sentenceCount); }, [sentenceCount]);
  useEffect(() => { localStorage.setItem("vs_cats", JSON.stringify(activeCats)); }, [activeCats]);
  useEffect(() => { localStorage.setItem("vs_sound", soundOn); }, [soundOn]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // ── Load streak + achievements ────────────────────────────────────────
  const loadStreak = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const data = await getStreak(userId);
      setStreakData(data);
    } catch {}
  }, []);

  const loadAchievements = useCallback(async (userId, checkNew = false) => {
    if (!userId) return;
    try {
      const data = await getAchievements(userId);
      if (checkNew && prevAchievementsRef.current) {
        const prevEarned = new Set(
          prevAchievementsRef.current.filter((a) => a.earned).map((a) => a.id)
        );
        const newlyEarned = data.filter((a) => a.earned && !prevEarned.has(a.id));
        if (newlyEarned.length > 0) {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setAchievementToast(newlyEarned[0]);
          toastTimerRef.current = setTimeout(() => setAchievementToast(null), 4000);
        }
      }
      prevAchievementsRef.current = data;
      setAchievements(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadStreak(currentUser.id);
      loadAchievements(currentUser.id);
    }
  }, [currentUser?.id, loadStreak, loadAchievements]);

  // ── Reload sentences when settings change ────────────────────────────
  useEffect(() => {
    const key = `${sentenceCount}:${activeCats.join(",")}`;
    if (settingsKeyRef.current === key) return;
    settingsKeyRef.current = key;
    const letter = activeTabRef.current;
    const picked = pickSentences(letter, sentenceCount, activeCats);
    setSentences({ ...LETTERS_OBJ(null), [letter]: picked });
    setInputs({
      ...LETTERS_OBJ([]),
      [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")),
    });
    setChecked(LETTERS_OBJ(false));
    setScore(LETTERS_OBJ(null));
  }, [sentenceCount, activeCats]);

  // ── Load sentences for a tab ──────────────────────────────────────────
  const loadSentences = useCallback(async (letter) => {
    if (letter === "REVIEW") {
      const uid = currentUser?.id;
      if (!uid) {
        setSentences((prev) => ({ ...prev, REVIEW: [] }));
        return;
      }
      try {
        const mistakes = await getMistakes(uid, 15);
        const reviewSents = mistakes
          .filter((m) => m.parts)
          .map((m) => ({ parts: m.parts, _source: "review" }));
        setSentences((prev) => ({ ...prev, REVIEW: reviewSents }));
        setInputs((prev) => ({
          ...prev,
          REVIEW: reviewSents.map((s) =>
            s.parts.filter((p) => "blank" in p).map(() => "")
          ),
        }));
        setChecked((prev) => ({ ...prev, REVIEW: false }));
        setScore((prev) => ({ ...prev, REVIEW: null }));
        sessionStartRef.current = Date.now();
        return;
      } catch {
        setSentences((prev) => ({ ...prev, REVIEW: [] }));
        return;
      }
    }

    let aiSentences = [];
    try {
      if (letter === "MIX") {
        const results = await Promise.allSettled(
          LETTERS.map((l) => getAiSentences(l))
        );
        aiSentences = results.flatMap((r) =>
          r.status === "fulfilled" ? r.value : []
        );
      } else {
        aiSentences = await getAiSentences(letter);
      }
    } catch {}

    const seenSigs = getSeenSigs(letter);
    const picked = pickSentences(letter, sentenceCount, activeCats, aiSentences, seenSigs);
    addSeenSigs(
      letter,
      picked.map((s) => sentenceSignature(s))
    );

    setSentences((prev) => ({ ...prev, [letter]: picked }));
    setInputs((prev) => ({
      ...prev,
      [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")),
    }));
    setChecked((prev) => ({ ...prev, [letter]: false }));
    setScore((prev) => ({ ...prev, [letter]: null }));
    sessionStartRef.current = Date.now();
  }, [sentenceCount, activeCats, currentUser]);

  useEffect(() => {
    if (!sentences[activeTab]) loadSentences(activeTab);
  }, [activeTab, loadSentences, sentences]);

  // ── Tab selection ─────────────────────────────────────────────────────
  const handleSelectTab = (letter) => {
    if (letter === "REVIEW") {
      setSentences((prev) => ({ ...prev, REVIEW: null }));
    }
    setActiveTab(letter);
  };

  // ── Input handling ────────────────────────────────────────────────────
  const handleInput = (si, bi, value) => {
    setInputs((prev) => {
      const next = (prev[activeTab] || []).map((row, i) =>
        i === si ? row.map((v, j) => (j === bi ? value : v)) : row
      );
      return { ...prev, [activeTab]: next };
    });
    setChecked((prev) => ({ ...prev, [activeTab]: false }));
    setScore((prev) => ({ ...prev, [activeTab]: null }));
  };

  // ── Check answers ─────────────────────────────────────────────────────
  const checkAnswers = useCallback(() => {
    const currentSentences = sentences[activeTab];
    if (!currentSentences) return;

    let correct = 0;
    let total = 0;
    const mistakes = [];

    currentSentences.forEach((sentence, si) => {
      const sentenceText = sentence.parts
        .map((p) => ("text" in p ? p.text : p.blank))
        .join("");
      sentence.parts.filter((p) => "blank" in p).forEach((part, bi) => {
        total++;
        const given = inputs[activeTab]?.[si]?.[bi] || "";
        if (given.toLowerCase() === part.blank.toLowerCase()) {
          correct++;
        } else {
          mistakes.push({
            sentence: sentenceText,
            expected: part.blank,
            given: given || "—",
            parts: sentence.parts,
          });
        }
      });
    });

    setScore((prev) => ({ ...prev, [activeTab]: { correct, total } }));
    setChecked((prev) => ({ ...prev, [activeTab]: true }));
    if (soundOn) playSound(correct === total ? "correct" : "wrong");

    if (activeTab !== "REVIEW" && currentUser?.id) {
      const duration_s = Math.round((Date.now() - sessionStartRef.current) / 1000);
      saveSession({
        letter: activeTab,
        correct,
        total,
        mistakes,
        userId: currentUser.id,
        duration_s,
      })
        .then(() => {
          loadStreak(currentUser.id);
          loadAchievements(currentUser.id, true);
        })
        .catch(() => {});
    }
  }, [sentences, inputs, activeTab, currentUser, loadStreak, loadAchievements, soundOn]);

  const clearInputs = () => {
    const s = sentences[activeTab];
    setInputs((prev) => ({
      ...prev,
      [activeTab]: (s || []).map((s) =>
        s.parts.filter((p) => "blank" in p).map(() => "")
      ),
    }));
    setChecked((prev) => ({ ...prev, [activeTab]: false }));
    setScore((prev) => ({ ...prev, [activeTab]: null }));
  };

  const toggleCat = (cat) => {
    setActiveCats((prev) => {
      if (prev.includes(cat)) {
        const next = prev.filter((c) => c !== cat);
        return next.length > 0 ? next : prev;
      }
      return CATEGORY_ORDER.filter((c) => prev.includes(c) || c === cat);
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────
  const meta = getTabMeta(activeTab);
  const currentSentences = sentences[activeTab];
  const bankSummary = activeTab !== "MIX" && activeTab !== "REVIEW"
    ? getBankSummary(activeTab)
    : null;
  const numBg = `${meta.accent}18`;

  return (
    <div className={styles.page}>
      <Header
        streakData={streakData}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((s) => !s)}
        onOpenTahak={() => setShowTahak(true)}
      />

      <LetterTabs
        activeTab={activeTab}
        score={score}
        onSelect={handleSelectTab}
        showReview={currentUser?.role !== "parent"}
      />

      <main className={styles.main}>
        {/* Settings bar */}
        <div className={styles.settingsBar}>
          <div className={styles.settingsGroup}>
            <span className={styles.settingsLabel}>Vět:</span>
            {COUNTS.map((n) => (
              <button
                key={n}
                className={`chip ${sentenceCount === n ? styles.countActive : "chip-inactive"}`}
                style={sentenceCount === n ? { background: meta.accent, color: "white" } : {}}
                onClick={() => setSentenceCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          <div className={styles.settingsGroup}>
            <span className={styles.settingsLabel}>Typ:</span>
            {SELECTABLE_CATS.map((cat) => {
              const active = activeCats.includes(cat);
              return (
                <button
                  key={cat}
                  className={`chip ${active ? styles.catActive : "chip-inactive"}`}
                  style={active ? { background: meta.accent, color: "white" } : {}}
                  onClick={() => toggleCat(cat)}
                >
                  {CAT_LABELS[cat]}
                </button>
              );
            })}
            <span className={styles.alwaysNote}>+ Chytáky vždy</span>
          </div>
        </div>

        {/* Exercise card */}
        <div className={styles.card}>
          {/* Card header */}
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>
                <span className={styles.cardEmoji}>{meta.emoji}</span>
                <span style={{ color: meta.color }}>
                  {activeTab === "MIX"
                    ? "Všechna písmena"
                    : activeTab === "REVIEW"
                    ? "Procvič chyby"
                    : `Po ${activeTab}`}
                </span>
              </div>
              {bankSummary && (
                <div className={styles.bankInfo}>
                  Databáze: {bankSummary.total} / {bankSummary.targetTotal} vět
                </div>
              )}
            </div>
            <button
              className={`btn ${styles.newBtn}`}
              style={{ background: numBg, color: meta.accent, borderColor: meta.accent }}
              onClick={() => loadSentences(activeTab)}
            >
              ↻ Nové věty
            </button>
          </div>

          {/* Loading */}
          {currentSentences === null && (
            <div className={styles.loading}>Načítám věty…</div>
          )}

          {/* Empty (REVIEW) */}
          {currentSentences !== null && currentSentences.length === 0 && (
            <div className={styles.empty}>
              {activeTab === "REVIEW"
                ? "Zatím žádné chyby k procvičení. 🎉"
                : "Žádné věty k zobrazení."}
            </div>
          )}

          {/* Sentence list */}
          {currentSentences?.map((sentence, si) => (
            <SentenceRow
              key={`${activeTab}-${si}`}
              sentence={sentence}
              index={si}
              inputs={inputs[activeTab]?.[si] ?? []}
              checked={checked[activeTab]}
              accentColor={meta.accent}
              numBg={numBg}
              textColor="var(--text)"
              onInput={(bi, v) => handleInput(si, bi, v)}
              onEnter={checkAnswers}
            />
          ))}

          {/* Score card */}
          {checked[activeTab] && score[activeTab] && (
            <ScoreCard
              correct={score[activeTab].correct}
              total={score[activeTab].total}
            />
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            <button
              className="btn"
              style={{ background: meta.accent, color: "white" }}
              onClick={checkAnswers}
              disabled={!currentSentences || currentSentences.length === 0}
            >
              ✓ Zkontrolovat
            </button>
            <button className="btn btn-ghost" onClick={clearInputs}>
              ↺ Vymazat
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          Nové věty = náhodný výběr z místní databáze + AI vět (pokud jsou k dispozici).
        </div>
      </main>

      {/* Tahák overlay */}
      {showTahak && <TahakOverlay onClose={() => setShowTahak(false)} />}

      {/* Achievement toast */}
      <Toast
        achievement={achievementToast}
        onDone={() => setAchievementToast(null)}
      />
    </div>
  );
}
