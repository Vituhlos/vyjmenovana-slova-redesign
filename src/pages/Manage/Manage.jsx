import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  deleteUser, deleteAiSentence, deleteAiSentencesByLetter, deleteAiSentencesByModel,
  generateAiSentences, getAiDebug, getAiSentencesMeta, getSettings,
  getProblemSentences, updateSettings, updateAiSentence,
} from "../../lib/api";
import { avatarColor, LETTERS, TAB_META } from "../../lib/theme";
import { formatDateTime } from "../../lib/sentences";
import { SENTENCE_BANK } from "../../sentenceBank";
import Avatar from "../../components/ui/Avatar/Avatar";
import ProfileModal from "../../components/overlays/ProfileModal/ProfileModal";
import styles from "./Manage.module.css";

export default function Manage() {
  const { currentUser, users, loadUsers, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState("profiles");
  const [profileModal, setProfileModal] = useState(null); // null | "create" | user obj

  const [aiSettings, setAiSettings] = useState(null);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(null);
  const [aiNotice, setAiNotice] = useState(null);
  const [aiDebug, setAiDebug] = useState(null);
  const [aiManageLetter, setAiManageLetter] = useState("M");
  const [aiManageSentences, setAiManageSentences] = useState([]);
  const [aiManageLoading, setAiManageLoading] = useState(false);
  const [problemSents, setProblemSents] = useState(null);
  const [problemSentsUser, setProblemSentsUser] = useState(null);
  const [problemSentsLoading, setProblemSentsLoading] = useState(false);

  const loadAiSettings = useCallback(async () => {
    try {
      setAiSettings(await getSettings());
    } catch {
      setAiSettings({ gemini_key_set: false, ai_counts: {}, ai_status: null, ai_limit_per_letter: 0, ai_target_per_generate: 20 });
    }
  }, []);

  const loadAiDebug = useCallback(async () => {
    try { setAiDebug(await getAiDebug()); } catch { setAiDebug(null); }
  }, []);

  const loadAiManageSentences = useCallback(async (letter) => {
    setAiManageLoading(true);
    try {
      const data = await getAiSentencesMeta(letter);
      setAiManageSentences(Array.isArray(data) ? data : []);
    } catch {
      setAiManageSentences([]);
    }
    setAiManageLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
    loadAiSettings();
    loadAiDebug();
  }, [loadUsers, loadAiSettings, loadAiDebug]);

  const handleDeleteProfile = async (user) => {
    if (!window.confirm(`Smazat profil „${user.name}"?`)) return;
    await deleteUser(user.id).catch(() => {});
    loadUsers();
  };

  const handleSaveAiKey = async () => {
    try {
      await updateSettings({ gemini_key: aiKeyInput });
      setAiKeyInput("");
      setAiNotice({ type: "success", text: "Gemini API klíč byl uložen." });
      await loadAiSettings();
      await loadAiDebug();
    } catch {
      setAiNotice({ type: "error", text: "API klíč se nepodařilo uložit." });
    }
  };

  const handleDeleteAiKey = async () => {
    await updateSettings({ gemini_key: "" }).catch(() => {});
    setAiNotice({ type: "success", text: "Gemini API klíč byl smazán." });
    await loadAiSettings();
    await loadAiDebug();
  };

  const handleGenerateAI = async (letter) => {
    setAiGenerating(letter);
    setAiNotice(null);
    try {
      const data = await generateAiSentences(letter);
      await loadAiSettings();
      await loadAiDebug();
      if (aiManageLetter === letter) await loadAiManageSentences(letter);
      setAiNotice({ type: "success", text: `AI vygenerovala ${data.generated ?? "nové"} věty pro písmeno ${letter}.` });
    } catch (e) {
      await loadAiDebug();
      setAiNotice({ type: "error", text: e.message || "AI generování se nepodařilo." });
    }
    setAiGenerating(null);
  };

  const handleDeleteAISentences = async (letter) => {
    if (!window.confirm(`Smazat všechny AI věty pro písmeno ${letter}?`)) return;
    await deleteAiSentencesByLetter(letter).catch(() => {});
    await loadAiSettings();
    await loadAiDebug();
    if (aiManageLetter === letter) await loadAiManageSentences(letter);
  };

  const handleReviewAISentence = async (id, review_status) => {
    try {
      await updateAiSentence(id, review_status);
      await loadAiSettings();
      await loadAiDebug();
      await loadAiManageSentences(aiManageLetter);
    } catch {
      setAiNotice({ type: "error", text: "Nepodařilo se změnit stav AI věty." });
    }
  };

  const handleDeleteAISentenceItem = async (id) => {
    if (!window.confirm("Smazat tuto AI větu?")) return;
    try {
      await deleteAiSentence(id);
      await loadAiSettings();
      await loadAiDebug();
      await loadAiManageSentences(aiManageLetter);
    } catch {
      setAiNotice({ type: "error", text: "Nepodařilo se smazat AI větu." });
    }
  };

  const handleDeleteByModel = async (model) => {
    if (!model || !window.confirm(`Smazat všechny AI věty od modelu "${model}"?`)) return;
    try {
      await deleteAiSentencesByModel(model);
      await loadAiSettings();
      await loadAiManageSentences(aiManageLetter);
    } catch {
      setAiNotice({ type: "error", text: "Nepodařilo se smazat věty modelu." });
    }
  };

  const exportLocalBankCSV = () => {
    const escape = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const header = "Písmeno,Kategorie,Věta (celá),Blank";
    const lines = [];
    for (const [letter, letterData] of Object.entries(SENTENCE_BANK)) {
      for (const [category, sents] of Object.entries(letterData.categories || {})) {
        for (const sentence of sents) {
          const fullText = sentence.parts.map((p) => ("text" in p ? p.text : p.blank)).join("");
          const blank = sentence.parts.find((p) => "blank" in p)?.blank ?? "";
          lines.push([letter, category, escape(fullText), blank].join(","));
        }
      }
    }
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vety-lokalni-banka.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/quiz")}>← Zpět</button>
        <h1 className={styles.pageTitle}>⚙️ Správa</h1>
      </header>

      {/* Section tabs */}
      <nav className={styles.tabBar}>
        {[["profiles", "👤 Profily"], ["ai", "🤖 AI"], ["problems", "🔴 Problémy"]].map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tabBtn} ${section === key ? styles.tabActive : ""}`}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={styles.main}>

        {/* ── Profiles section ── */}
        {section === "profiles" && (
          <>
            <div className={styles.sectionTitle}>Profily uživatelů</div>
            {(users || []).map((user) => (
              <div key={user.id} className={styles.userRow}>
                <Avatar user={user} size={46} />
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.name}</div>
                  <div className={styles.userRole}>
                    {user.role === "parent" ? "🔒 Rodič" : "👦 Dítě"}
                  </div>
                </div>
                <div className={styles.userActions}>
                  <button
                    className={`chip chip-inactive`}
                    onClick={() => setProfileModal(user)}
                  >
                    ✏️ Upravit
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      className={`chip ${styles.deleteChip}`}
                      onClick={() => handleDeleteProfile(user)}
                    >
                      🗑 Smazat
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              className={`btn btn-primary ${styles.addBtn}`}
              onClick={() => setProfileModal("create")}
            >
              + Přidat profil
            </button>
          </>
        )}

        {/* ── AI section ── */}
        {section === "ai" && (
          <>
            <div className={styles.sectionTitle}>AI generování vět</div>

            {aiSettings === null && <div className={styles.loading}>Načítám…</div>}
            {aiSettings !== null && (
              <>
                {/* API Key */}
                <div className={styles.card}>
                  <div className={styles.cardLabel}>
                    Gemini API klíč:{" "}
                    {aiSettings.gemini_key_set
                      ? <span className={styles.keySet}>✓ nastaven</span>
                      : <span className={styles.keyUnset}>✗ není nastaven</span>}
                  </div>
                  <div className={styles.keyRow}>
                    <input
                      className={`form-input ${styles.keyInput}`}
                      type="password"
                      placeholder={aiSettings.gemini_key_set ? "Změnit klíč…" : "Vložit API klíč…"}
                      value={aiKeyInput}
                      onChange={(e) => setAiKeyInput(e.target.value)}
                    />
                    <button
                      className={`chip ${styles.saveKeyBtn}`}
                      disabled={!aiKeyInput}
                      onClick={handleSaveAiKey}
                    >
                      Uložit
                    </button>
                    {aiSettings.gemini_key_set && (
                      <button
                        className={`chip chip-inactive ${styles.deleteKeyBtn}`}
                        onClick={handleDeleteAiKey}
                        title="Smazat klíč"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Notice */}
                {aiNotice && (
                  <div className={`${styles.notice} ${aiNotice.type === "error" ? styles.noticeError : styles.noticeSuccess}`}>
                    {aiNotice.text}
                  </div>
                )}

                {aiSettings.gemini_key_set && (
                  <>
                    {/* Auto-generate toggle */}
                    <div className={styles.card}>
                      <div className={styles.cardRow}>
                        <span className={styles.cardLabel}>⏰ Auto-generování</span>
                        <button
                          className={`chip ${aiSettings.auto_generate_enabled ? styles.toggleOn : "chip-inactive"}`}
                          onClick={async () => {
                            const next = !aiSettings.auto_generate_enabled;
                            await updateSettings({ auto_generate_enabled: next });
                            await loadAiSettings();
                          }}
                        >
                          {aiSettings.auto_generate_enabled ? "Zapnuto" : "Vypnuto"}
                        </button>
                      </div>
                      {aiSettings.auto_generate_enabled && (
                        <div className={styles.intervalRow}>
                          <span className={styles.intervalLabel}>Interval:</span>
                          {[3, 7, 14, 30].map((d) => (
                            <button
                              key={d}
                              className={`chip ${aiSettings.auto_generate_interval_days === d ? styles.intervalActive : "chip-inactive"}`}
                              onClick={async () => { await updateSettings({ auto_generate_interval_days: d }); await loadAiSettings(); }}
                            >
                              {d}d
                            </button>
                          ))}
                          {aiSettings.auto_generate_last_run && (
                            <span className={styles.lastRun}>
                              naposledy {formatDateTime(aiSettings.auto_generate_last_run)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI status */}
                    <div className={styles.card}>
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Poslední generování:</span>
                        <strong>{formatDateTime(aiSettings.ai_status?.last_success_at)}</strong>
                      </div>
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Model:</span>
                        <strong>{aiSettings.ai_status?.last_model || "—"}</strong>
                      </div>
                      {aiSettings.ai_status?.last_error && (
                        <div className={styles.aiError}>{aiSettings.ai_status.last_error}</div>
                      )}
                    </div>

                    {/* Per-letter generation */}
                    <div className={styles.sectionSubtitle}>Generovat věty po písmenech</div>
                    <div className={styles.card}>
                      {LETTERS.map((letter) => {
                        const count = aiSettings.ai_counts?.[letter] ?? 0;
                        const isGenerating = aiGenerating === letter;
                        const overview = aiSettings.ai_overview?.[letter];
                        return (
                          <div key={letter} className={styles.letterRow}>
                            <span className={styles.letterLabel} style={{ color: TAB_META[letter].color }}>
                              {TAB_META[letter].emoji} Po {letter}
                            </span>
                            <span className={styles.letterCount}>
                              {count}{aiSettings.ai_limit_per_letter ? ` / ${aiSettings.ai_limit_per_letter}` : ""} vět
                              {overview && ` · skryté ${overview.hidden} · špatné ${overview.rejected}`}
                            </span>
                            <button
                              className={`chip ${isGenerating ? "chip-inactive" : styles.generateBtn}`}
                              onClick={() => handleGenerateAI(letter)}
                              disabled={!!aiGenerating}
                            >
                              {isGenerating ? "Generuji…" : count > 0 ? "+ Doplnit" : "+ Generovat"}
                            </button>
                            {count > 0 && (
                              <button
                                className={`chip chip-inactive ${styles.deleteLetterBtn}`}
                                onClick={() => handleDeleteAISentences(letter)}
                                disabled={!!aiGenerating}
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* AI sentences management */}
                    <div className={styles.sectionSubtitle}>
                      Správa AI vět
                      <div className={styles.exportBtns}>
                        <a href="/api/export-sentences" download="vety-ai.csv" className={`chip chip-inactive ${styles.exportLink}`}>
                          ⬇ AI CSV
                        </a>
                        <button className={`chip chip-inactive`} onClick={exportLocalBankCSV}>
                          ⬇ Lokální CSV
                        </button>
                      </div>
                    </div>

                    {/* Letter selector */}
                    <div className={styles.letterSelector}>
                      {LETTERS.map((letter) => (
                        <button
                          key={letter}
                          className={`chip ${aiManageLetter === letter ? styles.letterSelectorActive : "chip-inactive"}`}
                          style={aiManageLetter === letter ? { background: TAB_META[letter].accent, color: "white" } : {}}
                          onClick={() => { setAiManageLetter(letter); loadAiManageSentences(letter); }}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>

                    <div className={styles.card}>
                      {aiManageLoading && <div className={styles.loading}>Načítám AI věty…</div>}
                      {!aiManageLoading && aiManageSentences.length === 0 && (
                        <div className={styles.loading}>
                          Pro písmeno {aiManageLetter} zatím nejsou žádné AI věty.
                        </div>
                      )}
                      {!aiManageLoading && aiManageSentences.slice(0, 12).map((item) => {
                        const text = item.sentence?.parts
                          ?.map((p) => ("text" in p ? p.text : `[${p.blank}]`))
                          .join("") || "—";
                        const statusColor =
                          item.review_status === "active" ? "#1f7a3f"
                          : item.review_status === "hidden" ? "#8c6d1f"
                          : "#b7412d";
                        return (
                          <div key={item.id} className={styles.aiSentItem}>
                            <div className={styles.aiSentText}>{text}</div>
                            <div className={styles.aiSentMeta} style={{ color: statusColor }}>
                              {item.review_status} · {formatDateTime(item.created_at)}
                              {item.source_model ? ` · ${item.source_model}` : ""}
                            </div>
                            <div className={styles.aiSentActions}>
                              {item.review_status !== "active" && (
                                <button className={`chip ${styles.restoreBtn}`} onClick={() => handleReviewAISentence(item.id, "active")}>Obnovit</button>
                              )}
                              {item.review_status !== "hidden" && (
                                <button className={`chip ${styles.hideBtn}`} onClick={() => handleReviewAISentence(item.id, "hidden")}>Skrýt</button>
                              )}
                              {item.review_status !== "rejected" && (
                                <button className={`chip ${styles.rejectBtn}`} onClick={() => handleReviewAISentence(item.id, "rejected")}>Špatná</button>
                              )}
                              <button className={`chip chip-inactive ${styles.deleteSentBtn}`} onClick={() => handleDeleteAISentenceItem(item.id)}>Smazat</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* By model */}
                    {aiSettings.ai_model_breakdown?.length > 0 && (
                      <div className={styles.card}>
                        <div className={styles.sectionSubtitle}>Věty podle modelu</div>
                        {aiSettings.ai_model_breakdown.map((item) => (
                          <div key={item.source_model} className={styles.modelRow}>
                            <span className={styles.modelName}>{item.source_model ?? "—"}</span>
                            <span className={styles.modelCount}>{item.n} vět</span>
                            <button
                              className={`chip chip-inactive ${styles.deleteModelBtn}`}
                              onClick={() => handleDeleteByModel(item.source_model)}
                              disabled={!!aiGenerating}
                            >
                              🗑 Smazat
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Problems section ── */}
        {section === "problems" && (
          <>
            <div className={styles.sectionTitle}>Problémové věty</div>
            <div className={styles.userChips}>
              {(users || []).map((u) => (
                <button
                  key={u.id}
                  className={`chip ${problemSentsUser === u.id ? styles.problemUserActive : "chip-inactive"}`}
                  style={problemSentsUser === u.id ? { background: avatarColor(u.id), color: "white" } : {}}
                  onClick={async () => {
                    setProblemSentsUser(u.id);
                    setProblemSentsLoading(true);
                    try {
                      setProblemSents(await getProblemSentences(u.id, 20));
                    } catch { setProblemSents([]); }
                    setProblemSentsLoading(false);
                  }}
                >
                  <Avatar user={u} size={15} />
                  {u.name}
                </button>
              ))}
            </div>
            {problemSentsLoading && <div className={styles.loading}>Načítám…</div>}
            {!problemSentsLoading && problemSents !== null && problemSents.length === 0 && (
              <div className={styles.empty}>Žádné chyby nenalezeny.</div>
            )}
            {!problemSentsLoading && problemSents?.map((item, i) => (
              <div key={i} className={styles.problemItem}>
                <div className={styles.problemSentence}>{item.sentence}</div>
                <div className={styles.problemMeta}>
                  {item.errors}× špatně · správně: <strong>{item.expected}</strong>
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* Profile modal */}
      {profileModal && (
        <ProfileModal
          mode={profileModal === "create" ? "create" : "edit"}
          user={profileModal !== "create" ? profileModal : undefined}
          currentUserId={currentUser?.id}
          onClose={() => setProfileModal(null)}
          onSaved={(updated) => {
            loadUsers();
            if (profileModal !== "create" && currentUser?.id === profileModal.id) {
              refreshCurrentUser({ ...currentUser, name: updated.name, avatar: updated.avatar });
            }
            setProfileModal(null);
          }}
        />
      )}
    </div>
  );
}
