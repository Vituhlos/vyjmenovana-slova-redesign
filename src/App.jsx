import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER, getBankSummary, getSentencePoolByCategories } from "./sentenceBank";

const TAB_META = {
  M: { color: "#c0392b", bg: "#fff5f5", accent: "#e74c3c", emoji: "🐭" },
  P: { color: "#6c3483", bg: "#fdf2ff", accent: "#8e44ad", emoji: "🎒" },
  L: { color: "#1a5e34", bg: "#f0fff5", accent: "#27ae60", emoji: "⛷️" },
  B: { color: "#154360", bg: "#f0f8ff", accent: "#2980b9", emoji: "🏠" },
  F: { color: "#7d3c00", bg: "#fff8f0", accent: "#e67e22", emoji: "🧪" },
  S: { color: "#1a4e0d", bg: "#f5fff0", accent: "#27ae60", emoji: "🧀" },
  V: { color: "#0d3b5e", bg: "#f0faff", accent: "#2471a3", emoji: "🦦" },
  Z: { color: "#4a0050", bg: "#fdf5ff", accent: "#8e44ad", emoji: "🔔" },
};

const CAT_LABELS = {
  basicWords: "Základní",
  relatedWords: "Příbuzná",
  easySentences: "Lehké",
  mediumSentences: "Střední",
  trickQuestions: "Chytáky",
};

const LETTERS = Object.keys(TAB_META);
const LETTERS_OBJ = (val) => Object.fromEntries(LETTERS.map((l) => [l, val]));
const COUNTS = [4, 6, 8, 10, 15];

// ── Themes ────────────────────────────────────────────────────────────────
const LIGHT = {
  appBg: "linear-gradient(160deg, #f5f7fa 0%, #e8ecf0 100%)",
  cardBg: "#ffffff",
  text: "#2c3e50",
  subtext: "#7f8c8d",
  muted: "#bbb",
  border: "#eee",
  borderMid: "#bdc3c7",
  rowBg: "#ffffff",
  panelBg: "#ffffff",
  overlayBg: "rgba(0,0,0,0.45)",
  pillBg: "#ecf0f1",
  pillText: "#7f8c8d",
  chipActiveBg: "#e8f4fd",
  chipActiveText: "#2471a3",
  chipInactiveBg: "#f0f0f0",
  chipInactiveText: "#999",
  tabInactiveBg: "white",
  scoreGood: "#d4edda",
  scoreMid: "#fff3cd",
  scoreBad: "#f8d7da",
  mistakeBg: "#fffaf9",
  barTrack: "#eee",
  settingsBg: "#ffffff",
};

const DARK = {
  appBg: "linear-gradient(160deg, #12151c 0%, #0d1018 100%)",
  cardBg: "#1c2130",
  text: "#d8e4f0",
  subtext: "#6d88a0",
  muted: "#3d5060",
  border: "#253040",
  borderMid: "#334455",
  rowBg: "#18202e",
  panelBg: "#161c28",
  overlayBg: "rgba(0,0,0,0.65)",
  pillBg: "#232c3e",
  pillText: "#6d88a0",
  chipActiveBg: "#1a3050",
  chipActiveText: "#60a8d8",
  chipInactiveBg: "#1e2838",
  chipInactiveText: "#4a6070",
  tabInactiveBg: "#1c2130",
  scoreGood: "#0d2218",
  scoreMid: "#252010",
  scoreBad: "#281010",
  mistakeBg: "#161c24",
  barTrack: "#253040",
  settingsBg: "#1c2130",
};

// ── Init helpers (outside component to avoid useState ordering issues) ────
const _initDark = localStorage.getItem("vs_dark") === "true";
const _initCount = parseInt(localStorage.getItem("vs_count") || "6");
const _initCats = (() => {
  try {
    const c = JSON.parse(localStorage.getItem("vs_cats"));
    return Array.isArray(c) && c.length > 0 ? c : [...CATEGORY_ORDER];
  } catch {
    return [...CATEGORY_ORDER];
  }
})();

function pickSentences(letter, count, cats) {
  const pool = [...getSentencePoolByCategories(letter, cats && cats.length > 0 ? cats : CATEGORY_ORDER)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

const _initM = pickSentences("M", _initCount, _initCats);

// ── Component ─────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(_initDark);
  const [sentenceCount, setSentenceCount] = useState(_initCount);
  const [activeCats, setActiveCats] = useState(_initCats);
  const t = darkMode ? DARK : LIGHT;

  const [activeTab, setActiveTab] = useState("M");
  const [sentences, setSentences] = useState(() => ({ ...LETTERS_OBJ(null), M: _initM }));
  const [inputs, setInputs] = useState(() => ({
    ...LETTERS_OBJ([]),
    M: _initM.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")),
  }));
  const [checked, setChecked] = useState(() => LETTERS_OBJ(false));
  const [score, setScore] = useState(() => LETTERS_OBJ(null));

  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("vs_sound") !== "false");

  const [showHistory, setShowHistory] = useState(false);
  const [histTab, setHistTab] = useState("sessions");
  const [sessions, setSessions] = useState(null);
  const [stats, setStats] = useState(null);

  // ── Persist settings ───────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("vs_dark", darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem("vs_count", sentenceCount); }, [sentenceCount]);
  useEffect(() => { localStorage.setItem("vs_cats", JSON.stringify(activeCats)); }, [activeCats]);
  useEffect(() => { localStorage.setItem("vs_sound", soundOn); }, [soundOn]);

  // ── Zvuk ───────────────────────────────────────────────────────────────
  const playSound = useCallback((type) => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.connect(gain);
      if (type === "correct") {
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  }, [soundOn]);

  // ── Reload on settings change (skip unchanged / initial render) ────────
  const activeTabRef = useRef("M");
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const settingsKeyRef = useRef(`${_initCount}:${_initCats.join(",")}`);
  useEffect(() => {
    const key = `${sentenceCount}:${activeCats.join(",")}`;
    if (settingsKeyRef.current === key) return;
    settingsKeyRef.current = key;
    const letter = activeTabRef.current;
    const picked = pickSentences(letter, sentenceCount, activeCats);
    setSentences({ ...LETTERS_OBJ(null), [letter]: picked });
    setInputs({ ...LETTERS_OBJ([]), [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) });
    setChecked(LETTERS_OBJ(false));
    setScore(LETTERS_OBJ(null));
  }, [sentenceCount, activeCats]);

  // ── Load sentences for new tab ─────────────────────────────────────────
  const loadSentences = useCallback(
    (letter) => {
      const picked = pickSentences(letter, sentenceCount, activeCats);
      setSentences((prev) => ({ ...prev, [letter]: picked }));
      setInputs((prev) => ({ ...prev, [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
      setChecked((prev) => ({ ...prev, [letter]: false }));
      setScore((prev) => ({ ...prev, [letter]: null }));
    },
    [sentenceCount, activeCats]
  );

  useEffect(() => {
    if (!sentences[activeTab]) loadSentences(activeTab);
  }, [activeTab, loadSentences, sentences]);

  // ── Input handling ─────────────────────────────────────────────────────
  const handleInput = (si, bi, value) => {
    setInputs((prev) => {
      const next = (prev[activeTab] || []).map((row, i) =>
        i === si ? row.map((v, j) => (j === bi ? value.slice(-2) : v)) : row
      );
      return { ...prev, [activeTab]: next };
    });
    setChecked((prev) => ({ ...prev, [activeTab]: false }));
    setScore((prev) => ({ ...prev, [activeTab]: null }));
  };

  const checkAnswers = useCallback(() => {
    const currentSentences = sentences[activeTab];
    if (!currentSentences) return;
    let correct = 0, total = 0;
    const mistakes = [];
    currentSentences.forEach((sentence, si) => {
      const sentenceText = sentence.parts.map((p) => ("text" in p ? p.text : p.blank)).join("");
      sentence.parts.filter((p) => "blank" in p).forEach((part, bi) => {
        total++;
        const given = inputs[activeTab][si]?.[bi] || "";
        if (given.toLowerCase() === part.blank.toLowerCase()) correct++;
        else mistakes.push({ sentence: sentenceText, expected: part.blank, given: given || "—" });
      });
    });
    setScore((prev) => ({ ...prev, [activeTab]: { correct, total } }));
    setChecked((prev) => ({ ...prev, [activeTab]: true }));
    playSound(correct === total ? "correct" : "wrong");
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter: activeTab, correct, total, mistakes }),
    }).catch(() => {});
  }, [sentences, inputs, activeTab, playSound]);

  const clearInputs = () => {
    const s = sentences[activeTab];
    setInputs((prev) => ({ ...prev, [activeTab]: (s || []).map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
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

  // ── History / stats ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setSessions(null);
    setStats(null);
    setShowHistory(true);
    try {
      const [sesRes, stRes] = await Promise.all([
        fetch("/api/sessions?limit=150"),
        fetch("/api/stats"),
      ]);
      setSessions(await sesRes.json());
      setStats(await stRes.json());
    } catch {
      setSessions([]);
      setStats([]);
    }
  }, []);

  const exportCSV = () => {
    if (!sessions || sessions.length === 0) return;
    const header = "Datum,Čas,Písmeno,Správně,Celkem,Přesnost,Chyby";
    const rows = sessions.map((s) => {
      const d = new Date(s.timestamp);
      const dateStr = d.toLocaleDateString("cs-CZ");
      const timeStr = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const mistakes = s.mistakes
        .map((m) => `${m.sentence} (${m.given}→${m.expected})`)
        .join("; ")
        .replace(/"/g, '""');
      return `"${dateStr}","${timeStr}","Po ${s.letter}",${s.correct},${s.total},${pct}%,"${mistakes}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cviceni-vyjmenovana-slova.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const data = TAB_META[activeTab];
  const currentSentences = sentences[activeTab];
  const bankSummary = getBankSummary(activeTab);
  const numBg = darkMode ? `${data.accent}22` : data.bg;

  const blankStyle = (si, bi, correctBlank) => {
    if (!checked[activeTab]) return {};
    const isCorrect = (inputs[activeTab]?.[si]?.[bi] || "").toLowerCase() === correctBlank.toLowerCase();
    return {
      background: isCorrect ? (darkMode ? "#0d2a18" : "#d4edda") : (darkMode ? "#2a0e0e" : "#f8d7da"),
      borderColor: isCorrect ? "#28a745" : "#dc3545",
      color: isCorrect ? (darkMode ? "#5dd88a" : "#155724") : (darkMode ? "#f08080" : "#721c24"),
    };
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      data-dark={darkMode ? "true" : "false"}
      style={{ minHeight: "100vh", background: t.appBg, fontFamily: "Georgia, serif", padding: "24px 16px" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .tab-btn { cursor: pointer; border: 3px solid transparent; border-radius: 12px; padding: 10px 22px; font-size: 1.05rem; font-family: 'Nunito', sans-serif; font-weight: 800; transition: all 0.2s; }
        .tab-btn:hover { transform: translateY(-2px); }
        .blank-input { display: inline-block; width: 36px; height: 28px; border: none; border-bottom: 3px solid #bbb; background: #fafafa; font-size: 1.05rem; font-family: 'Lora', serif; font-weight: 600; text-align: center; outline: none; border-radius: 4px 4px 0 0; padding: 0 2px; transition: all 0.2s; vertical-align: baseline; margin: 0 1px; color: #2c3e50; }
        .blank-input:focus { background: #fffbf0; }
        [data-dark="true"] .blank-input { background: #232c3e; border-bottom-color: #3a4565; color: #d8e4f0; }
        [data-dark="true"] .blank-input:focus { background: #2a3550; }
        .check-btn { border: none; border-radius: 10px; padding: 11px 26px; font-size: 1rem; font-family: 'Nunito', sans-serif; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .check-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.14); }
        [data-dark="true"] .check-btn:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
        .check-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .sentence-row { border-radius: 12px; padding: 13px 18px; margin-bottom: 9px; font-family: 'Lora', serif; font-size: 1.07rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid var(--accent); line-height: 2; display: flex; align-items: baseline; }
        [data-dark="true"] .sentence-row { box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .num { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; border-radius: 50%; font-size: 0.78rem; font-weight: 800; font-family: 'Nunito', sans-serif; margin-right: 10px; flex-shrink: 0; }
        .hint { font-size: 0.8rem; color: #27ae60; font-style: italic; font-family: 'Nunito', sans-serif; margin-left: 6px; }
        [data-dark="true"] .hint { color: #5dd88a; }
        .history-overlay { position: fixed; inset: 0; z-index: 100; display: flex; justify-content: flex-end; }
        .history-panel { width: min(540px, 100vw); height: 100vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.2); }
        .history-panel::-webkit-scrollbar { width: 6px; }
        .history-panel::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        [data-dark="true"] .history-panel::-webkit-scrollbar-thumb { background: #3d5060; }
        .session-card { border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
        .session-header { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; }
        .session-header:hover { background: #f8f9fa; }
        [data-dark="true"] .session-header:hover { background: #1e2838; }
        .mistake-row { padding: 7px 14px; font-family: 'Lora', serif; font-size: 0.88rem; }
        .chip-btn { font-family: 'Nunito', sans-serif; font-size: 0.8rem; font-weight: 700; border: none; border-radius: 8px; padding: 4px 11px; cursor: pointer; transition: all 0.15s; }
        .chip-btn:hover { opacity: 0.8; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
        .anim-wrong { animation: shake 0.4s ease; }
        .anim-correct { animation: pop 0.3s ease; }
        @media (max-width: 600px) {
          .blank-input { width: 44px; height: 38px; font-size: 16px; border-bottom-width: 3px; }
          .sentence-row { font-size: 1rem; padding: 12px 12px; line-height: 2.3; }
          .tab-btn { padding: 8px 14px; font-size: 0.92rem; }
          .check-btn { padding: 12px 20px; font-size: 0.95rem; min-height: 46px; }
          .chip-btn { padding: 6px 12px; font-size: 0.82rem; min-height: 34px; }
          .num { min-width: 22px; height: 22px; font-size: 0.72rem; margin-right: 8px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 20, position: "relative" }}>
        <div style={{ fontSize: "2.4rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, letterSpacing: "-1px" }}>
          Vyjmenovaná slova
        </div>
        <div style={{ fontSize: "0.95rem", color: t.subtext, fontFamily: "'Lora', serif", fontStyle: "italic", marginTop: 4 }}>
          Doplň správně <strong>i</strong> nebo <strong>y</strong> (popřípadě <strong>í / ý</strong>)
        </div>
        <div style={{ position: "absolute", top: 6, right: 0, display: "flex", gap: 8 }}>
          <button
            onClick={() => setSoundOn((s) => !s)}
            style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: t.pillText, cursor: "pointer" }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => setDarkMode((d) => !d)}
            style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: t.pillText, cursor: "pointer" }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={loadHistory}
            style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: t.pillText, cursor: "pointer" }}
          >
            📊 Historie
          </button>
        </div>
      </div>

      {/* ── Letter tabs ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(TAB_META).map(([letter, meta]) => (
          <button
            key={letter}
            className="tab-btn"
            onClick={() => setActiveTab(letter)}
            style={{
              background: activeTab === letter ? meta.accent : t.tabInactiveBg,
              color: activeTab === letter ? "white" : meta.accent,
              borderColor: meta.accent,
              boxShadow: activeTab === letter ? `0 4px 14px ${meta.accent}55` : "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            {meta.emoji} Po {letter}
            {score[letter] && (
              <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "1px 7px", fontSize: "0.82rem" }}>
                {score[letter].correct}/{score[letter].total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Settings bar ── */}
      <div style={{ maxWidth: 700, margin: "0 auto 16px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "10px 16px", background: t.settingsBg, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", fontWeight: 700, color: t.subtext, whiteSpace: "nowrap" }}>
            Vět:
          </span>
          {COUNTS.map((n) => (
            <button
              key={n}
              className="chip-btn"
              onClick={() => setSentenceCount(n)}
              style={{
                background: sentenceCount === n ? data.accent : t.chipInactiveBg,
                color: sentenceCount === n ? "white" : t.chipInactiveText,
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: t.border, flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", fontWeight: 700, color: t.subtext, whiteSpace: "nowrap" }}>
            Typ:
          </span>
          {CATEGORY_ORDER.map((cat) => {
            const active = activeCats.includes(cat);
            return (
              <button
                key={cat}
                className="chip-btn"
                onClick={() => toggleCat(cat)}
                style={{
                  background: active ? t.chipActiveBg : t.chipInactiveBg,
                  color: active ? t.chipActiveText : t.chipInactiveText,
                  textDecoration: active ? "none" : "line-through",
                }}
              >
                {CAT_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Exercise card ── */}
      <div style={{ maxWidth: 700, margin: "0 auto", "--accent": data.accent }}>
        <div style={{ background: t.cardBg, borderRadius: 20, padding: "26px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.7rem" }}>{data.emoji}</span>
                <span style={{ fontSize: "1.15rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: data.color }}>
                  Po {activeTab}
                </span>
              </div>
              {bankSummary && (
                <div style={{ marginTop: 4, fontSize: "0.8rem", fontFamily: "'Nunito', sans-serif", color: t.subtext }}>
                  Databáze: {bankSummary.total} / {bankSummary.targetTotal} vět
                </div>
              )}
            </div>
            <button
              className="check-btn"
              onClick={() => loadSentences(activeTab)}
              style={{ background: numBg, color: data.accent, fontSize: "0.88rem", padding: "7px 16px", border: `2px solid ${data.accent}` }}
            >
              ↻ Nové věty
            </button>
          </div>

          {currentSentences?.map((sentence, si) => {
            let blankCounter = 0;
            const partsWithIdx = sentence.parts.map((p) => ("blank" in p ? { ...p, bi: blankCounter++ } : p));
            return (
              <div key={`${activeTab}-${si}`} className="sentence-row" style={{ background: t.rowBg }}>
                <span className="num" style={{ background: numBg, color: data.accent }}>{si + 1}</span>
                <span>
                  {partsWithIdx.map((part, pi) => {
                    if ("text" in part) return <span key={pi} style={{ color: t.text }}>{part.text}</span>;
                    const { bi, blank } = part;
                    const val = inputs[activeTab]?.[si]?.[bi] || "";
                    const isWrong = checked[activeTab] && val.toLowerCase() !== blank.toLowerCase();
                    const isCorrect = checked[activeTab] && val.toLowerCase() === blank.toLowerCase();
                    return (
                      <span key={pi}>
                        <input
                          className={`blank-input${isWrong ? " anim-wrong" : isCorrect ? " anim-correct" : ""}`}
                          value={val}
                          onChange={(e) => handleInput(si, bi, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && checkAnswers()}
                          maxLength={2}
                          style={blankStyle(si, bi, blank)}
                        />
                        {isWrong && <span className="hint">({blank})</span>}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}

          {checked[activeTab] && score[activeTab] && (() => {
            const { correct, total } = score[activeTab];
            const bg = correct === total ? t.scoreGood : correct >= Math.ceil(total / 2) ? t.scoreMid : t.scoreBad;
            return (
              <div style={{ margin: "18px 0 14px", textAlign: "center", padding: 14, borderRadius: 12, background: bg }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 2 }}>
                  {correct === total ? "🏆" : correct >= 4 ? "🌟" : "💪"}
                </div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "1.05rem" }}>
                  {correct} / {total} správně{" "}
                  {correct === total ? "Perfektní!" : correct >= 4 ? "Výborně!" : "Zkus to znovu!"}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            <button className="check-btn" onClick={checkAnswers} disabled={!currentSentences} style={{ background: data.accent, color: "white" }}>
              ✓ Zkontrolovat
            </button>
            <button className="check-btn" onClick={clearInputs} style={{ background: t.pillBg, color: t.pillText }}>
              ↺ Vymazat
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: "0.82rem", color: t.muted, fontStyle: "italic", fontFamily: "'Lora', serif" }}>
          Nové věty = náhodný výběr z místní databáze.
        </div>
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <div className="history-overlay" style={{ background: t.overlayBg }} onClick={() => setShowHistory(false)}>
          <div className="history-panel" style={{ background: t.panelBg }} onClick={(e) => e.stopPropagation()}>
            {/* Panel header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.panelBg, position: "sticky", top: 0, zIndex: 1 }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: t.text }}>
                📊 Přehled
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {histTab === "sessions" && sessions && sessions.length > 0 && (
                  <button
                    onClick={exportCSV}
                    style={{ background: t.pillBg, border: `1px solid ${t.borderMid}`, borderRadius: 8, padding: "5px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: t.subtext, cursor: "pointer" }}
                  >
                    ⬇ CSV
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: t.subtext, lineHeight: 1 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Panel tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, padding: "0 20px", background: t.panelBg, position: "sticky", top: 57, zIndex: 1 }}>
              {[["sessions", "Sezení"], ["stats", "Statistiky"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setHistTab(key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: histTab === key ? `3px solid ${data.accent}` : "3px solid transparent",
                    padding: "10px 16px",
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    color: histTab === key ? data.accent : t.subtext,
                    cursor: "pointer",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: "16px 20px", flex: 1 }}>
              {/* ── Sessions tab ── */}
              {histTab === "sessions" && (
                <>
                  {sessions === null && (
                    <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>
                  )}
                  {sessions !== null && sessions.length === 0 && (
                    <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Žádná cvičení zatím nebyla uložena.</div>
                  )}
                  {sessions !== null && sessions.map((session) => {
                    const meta = TAB_META[session.letter];
                    const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
                    const date = new Date(session.timestamp);
                    const dateStr = date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <details key={session.id} className="session-card" style={{ border: `1px solid ${t.border}` }}>
                        <summary className="session-header" style={{ listStyle: "none" }}>
                          <span style={{ background: meta?.accent ?? "#999", color: "white", borderRadius: 8, padding: "3px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem" }}>
                            {meta?.emoji} Po {session.letter}
                          </span>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.88rem", color: t.text, fontWeight: 700 }}>
                            {session.correct}/{session.total}
                            <span style={{ marginLeft: 5, color: pct === 100 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c", fontWeight: 800 }}>
                              {pct}%
                            </span>
                          </span>
                          <span style={{ marginLeft: "auto", fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext }}>
                            {dateStr} {timeStr}
                          </span>
                        </summary>
                        {session.mistakes.length > 0 ? (
                          session.mistakes.map((m, i) => (
                            <div key={i} className="mistake-row" style={{ borderTop: `1px solid ${t.border}`, background: t.mistakeBg }}>
                              <div style={{ color: t.subtext, marginBottom: 3 }}>{m.sentence}</div>
                              <div style={{ fontSize: "0.82rem", fontFamily: "'Nunito', sans-serif" }}>
                                <span style={{ color: "#e74c3c" }}>Napsáno: <strong>{m.given}</strong></span>
                                <span style={{ margin: "0 8px", color: t.muted }}>→</span>
                                <span style={{ color: "#27ae60" }}>Správně: <strong>{m.expected}</strong></span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="mistake-row" style={{ borderTop: `1px solid ${t.border}`, background: t.mistakeBg, color: "#27ae60", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                            🏆 Žádné chyby!
                          </div>
                        )}
                      </details>
                    );
                  })}
                </>
              )}

              {/* ── Stats tab ── */}
              {histTab === "stats" && (
                <>
                  {stats === null && (
                    <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>
                  )}
                  {stats !== null && stats.length === 0 && (
                    <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Zatím žádná data.</div>
                  )}
                  {stats !== null && stats.length > 0 && (
                    <>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 18, fontSize: "1rem" }}>
                        Průměrná přesnost
                      </div>
                      {LETTERS.filter((l) => stats.find((s) => s.letter === l)).map((letter) => {
                        const s = stats.find((st) => st.letter === letter);
                        const meta = TAB_META[letter];
                        const pct = s.avg_accuracy || 0;
                        const barColor = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";
                        return (
                          <div key={letter} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "0.92rem" }}>
                                {meta.emoji} Po {letter}
                              </span>
                              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext }}>
                                <strong style={{ color: barColor }}>{pct}%</strong> · {s.sessions} sez.
                              </span>
                            </div>
                            <div style={{ height: 10, background: t.barTrack, borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 5, transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}

                      <div style={{ marginTop: 24, padding: "14px 16px", background: t.rowBg, borderRadius: 12, border: `1px solid ${t.border}` }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 10, fontSize: "0.88rem" }}>
                          Celkové součty
                        </div>
                        {stats.map((s) => (
                          <div key={s.letter} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext, marginBottom: 5 }}>
                            <span>{TAB_META[s.letter]?.emoji} Po {s.letter}</span>
                            <span>{s.total_correct} / {s.total_blanks} správně</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
