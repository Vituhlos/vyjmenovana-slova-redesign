import SlidePanel from "./SlidePanel.jsx";
import Avatar from "../Avatar.jsx";

const TAB_META = {
  M: { color: "#c0392b", accent: "#e74c3c", emoji: "🐭" },
  P: { color: "#6c3483", accent: "#8e44ad", emoji: "🎒" },
  L: { color: "#1a5e34", accent: "#27ae60", emoji: "⛷️" },
  B: { color: "#154360", accent: "#2980b9", emoji: "🏠" },
  F: { color: "#7d3c00", accent: "#e67e22", emoji: "🧪" },
  S: { color: "#1a4e0d", accent: "#27ae60", emoji: "🧀" },
  V: { color: "#0d3b5e", accent: "#2471a3", emoji: "🦦" },
  Z: { color: "#4a0050", accent: "#8e44ad", emoji: "🔔" },
};

function formatDateTime(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" && !value.endsWith("Z") && !value.includes("+")
    ? value.replace(" ", "T") + "Z" : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("cs-CZ")} ${date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function SettingsPanel({
  onClose,
  darkMode,
  currentUser,
  users,
  aiSettings,
  aiKeyInput,
  setAiKeyInput,
  aiGenerating,
  aiNotice,
  aiManageLetter,
  setAiManageLetter,
  aiManageSentences,
  aiManageLoading,
  aiDebug,
  problemSents,
  problemSentsUser,
  setProblemSentsUser,
  problemSentsLoading,
  onLoadProblemSents,
  onSaveAiKey,
  onDeleteAiKey,
  onGenerateAI,
  onDeleteAISentences,
  onReviewAISentence,
  onDeleteAISentenceItem,
  onDeleteByModel,
  onLoadAiManageSentences,
  onOpenCreate,
  onOpenEdit,
  onDeleteProfile,
  onExportLocalBankCSV,
  onToggleAutoGenerate,
  onSetAutoInterval,
}) {
  const dark = darkMode;
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const borderColor = dark ? "border-gray-800" : "border-gray-100";
  const rowBg = dark ? "bg-gray-800" : "bg-gray-50";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800";
  const LETTERS = Object.keys(TAB_META);

  return (
    <SlidePanel title="⚙️ Nastavení" onClose={onClose} darkMode={darkMode}>
      <div className="px-5 py-4 space-y-6">

        {/* Profiles section */}
        <section>
          <h3 className={`font-extrabold text-sm mb-3 ${textColor}`}>👥 Profily</h3>
          <div className="space-y-2 mb-3">
            {(users || []).map(user => (
              <div key={user.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${borderColor} ${dark ? "bg-gray-900" : "bg-white"}`}>
                <Avatar user={user} size={36} />
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${textColor}`}>{user.name}</div>
                  <div className={`text-xs ${subtextColor}`}>{user.role === "parent" ? "🔒 Rodič" : "👦 Dítě"}</div>
                </div>
                <button
                  onClick={() => onOpenEdit(user)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                    dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ✏️
                </button>
                {user.id !== currentUser?.id && (
                  <button
                    onClick={() => onDeleteProfile(user)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={onOpenCreate}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
            style={{ background: "#2980b9" }}
          >
            + Přidat profil
          </button>
        </section>

        {/* Problem sentences */}
        {currentUser?.role === "parent" && users && users.length > 0 && (
          <section>
            <h3 className={`font-extrabold text-sm mb-3 ${textColor}`}>🔴 Problémové věty</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setProblemSentsUser(u.id); onLoadProblemSents(u.id); }}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={problemSentsUser === u.id
                    ? { background: "#2980b9", color: "white" }
                    : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
                  }
                >
                  <Avatar user={u} size={14} />
                  {u.name}
                </button>
              ))}
            </div>
            {problemSentsLoading && <div className={`text-sm ${subtextColor}`}>Načítám…</div>}
            {!problemSentsLoading && problemSents !== null && problemSents.length === 0 && (
              <div className={`text-sm ${subtextColor}`}>Žádné chyby nenalezeny.</div>
            )}
            {!problemSentsLoading && problemSents?.length > 0 && problemSents.map((item, i) => (
              <div key={i} className={`px-3 py-2.5 rounded-xl border mb-2 ${borderColor} ${dark ? "bg-gray-900" : "bg-white"}`}>
                <div className={`text-sm font-serif mb-1 ${textColor}`}>{item.sentence}</div>
                <div className={`text-xs font-semibold text-red-500`}>
                  {item.errors}× špatně · správně: <strong>{item.expected}</strong>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* AI section */}
        <section>
          <h3 className={`font-extrabold text-sm mb-3 ${textColor}`}>🤖 AI generování vět</h3>

          {aiSettings === null && (
            <div className={`text-sm ${subtextColor}`}>Načítám…</div>
          )}

          {aiSettings !== null && (
            <>
              {/* API Key */}
              <div className={`p-3 rounded-xl border ${borderColor} ${dark ? "bg-gray-900" : "bg-white"} mb-3`}>
                <div className={`text-xs mb-2 ${subtextColor}`}>
                  Gemini API klíč:{" "}
                  {aiSettings.gemini_key_set
                    ? <span className="text-green-500 font-bold">✓ nastaven</span>
                    : <span className="text-red-500">✗ není nastaven</span>
                  }
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={aiSettings.gemini_key_set ? "Změnit klíč…" : "Vložit API klíč…"}
                    value={aiKeyInput}
                    onChange={e => setAiKeyInput(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputBg}`}
                  />
                  <button
                    onClick={onSaveAiKey}
                    disabled={!aiKeyInput}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Uložit
                  </button>
                  {aiSettings.gemini_key_set && (
                    <button
                      onClick={onDeleteAiKey}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${dark ? "bg-gray-700 text-red-400 hover:bg-gray-600" : "bg-gray-100 text-red-500 hover:bg-gray-200"}`}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Notice */}
              {aiNotice && (
                <div className={`px-3 py-2.5 rounded-xl mb-3 text-xs font-medium ${
                  aiNotice.type === "error"
                    ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                    : "bg-green-50 text-green-600"
                }`}>
                  {aiNotice.text}
                </div>
              )}

              {aiSettings.gemini_key_set && (
                <>
                  {/* Auto-generate toggle */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${dark ? "bg-gray-900" : "bg-white"} mb-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${textColor}`}>⏰ Auto-generování</span>
                      <button
                        onClick={onToggleAutoGenerate}
                        className="text-xs font-bold px-3 py-1 rounded-lg transition-all"
                        style={aiSettings.auto_generate_enabled
                          ? { background: "#27ae60", color: "white" }
                          : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
                        }
                      >
                        {aiSettings.auto_generate_enabled ? "Zapnuto" : "Vypnuto"}
                      </button>
                    </div>
                    {aiSettings.auto_generate_enabled && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs ${subtextColor}`}>Interval:</span>
                        {[3, 7, 14, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => onSetAutoInterval(d)}
                            className="text-xs font-bold px-2 py-1 rounded-lg transition-all"
                            style={aiSettings.auto_generate_interval_days === d
                              ? { background: "#2980b9", color: "white" }
                              : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
                            }
                          >
                            {d}d
                          </button>
                        ))}
                        {aiSettings.auto_generate_last_run && (
                          <span className={`text-xs ${subtextColor}`}>
                            naposledy {formatDateTime(aiSettings.auto_generate_last_run)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Per-letter generation */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${dark ? "bg-gray-900" : "bg-white"} mb-3`}>
                    <div className={`text-xs font-bold mb-2 ${textColor}`}>Věty podle písmene</div>
                    <div className="space-y-2">
                      {LETTERS.map(letter => {
                        const count = aiSettings.ai_counts?.[letter] ?? 0;
                        const isGenerating = aiGenerating === letter;
                        const overview = aiSettings.ai_overview?.[letter];
                        const meta = TAB_META[letter];
                        return (
                          <div key={letter} className="flex items-center gap-2">
                            <span className="text-xs font-bold w-16 flex-shrink-0" style={{ color: meta.accent }}>
                              {meta.emoji} Po {letter}
                            </span>
                            <span className={`text-xs flex-1 ${subtextColor}`}>
                              {count}{aiSettings.ai_limit_per_letter ? `/${aiSettings.ai_limit_per_letter}` : ""} vět
                              {overview && ` · skryté ${overview.hidden}`}
                            </span>
                            <button
                              onClick={() => onGenerateAI(letter)}
                              disabled={!!aiGenerating}
                              className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                              style={isGenerating
                                ? { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
                                : { background: "#27ae60", color: "white" }
                              }
                            >
                              {isGenerating ? "Generuji…" : count > 0 ? "+ Doplnit" : "+ Generovat"}
                            </button>
                            {count > 0 && (
                              <button
                                onClick={() => onDeleteAISentences(letter)}
                                disabled={!!aiGenerating}
                                className={`text-xs font-bold px-2 py-1 rounded-lg transition-all disabled:opacity-40 ${
                                  dark ? "bg-gray-700 text-red-400" : "bg-red-50 text-red-500"
                                }`}
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI sentence management */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${dark ? "bg-gray-900" : "bg-white"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold ${textColor}`}>Správa AI vět</span>
                      <div className="flex gap-1.5">
                        <a
                          href="/api/export-sentences"
                          download="vety-ai.csv"
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                            dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          ⬇ AI CSV
                        </a>
                        <button
                          onClick={onExportLocalBankCSV}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                            dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          ⬇ Lok. CSV
                        </button>
                      </div>
                    </div>

                    {/* Letter selector for AI sentences */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {LETTERS.map(letter => (
                        <button
                          key={letter}
                          onClick={() => { setAiManageLetter(letter); onLoadAiManageSentences(letter); }}
                          className="text-xs font-bold px-2 py-1 rounded-lg transition-all"
                          style={aiManageLetter === letter
                            ? { background: TAB_META[letter].accent, color: "white" }
                            : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
                          }
                        >
                          {letter}
                        </button>
                      ))}
                    </div>

                    {aiManageLoading && (
                      <div className={`text-xs ${subtextColor} py-2`}>Načítám AI věty…</div>
                    )}
                    {!aiManageLoading && aiManageSentences.length === 0 && (
                      <div className={`text-xs ${subtextColor} py-2`}>
                        Pro písmeno {aiManageLetter} zatím nejsou AI věty.
                      </div>
                    )}
                    {!aiManageLoading && aiManageSentences.slice(0, 12).map(item => {
                      const sentenceText = item.sentence?.parts?.map(p => "text" in p ? p.text : `[${p.blank}]`).join("") || "—";
                      const statusColor = item.review_status === "active" ? "#27ae60" : item.review_status === "hidden" ? "#f39c12" : "#e74c3c";
                      return (
                        <div key={item.id} className={`py-2.5 border-t ${borderColor}`}>
                          <div className={`text-xs mb-1.5 ${textColor}`}>{sentenceText}</div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: statusColor }}>
                              {item.review_status} · {item.source_model || "—"}
                            </span>
                            <div className="flex gap-1">
                              {item.review_status !== "active" && (
                                <button onClick={() => onReviewAISentence(item.id, "active")} className="text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100">Obnovit</button>
                              )}
                              {item.review_status !== "hidden" && (
                                <button onClick={() => onReviewAISentence(item.id, "hidden")} className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100">Skrýt</button>
                              )}
                              {item.review_status !== "rejected" && (
                                <button onClick={() => onReviewAISentence(item.id, "rejected")} className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100">Špatná</button>
                              )}
                              <button onClick={() => onDeleteAISentenceItem(item.id)} className={`text-xs font-bold px-2 py-0.5 rounded-md ${dark ? "bg-gray-700 text-red-400" : "bg-red-50 text-red-500"}`}>Smazat</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </SlidePanel>
  );
}
