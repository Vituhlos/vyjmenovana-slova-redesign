import { useCallback, useEffect, useState } from "react";
import { getBankSummary, getSentencePool } from "./sentenceBank";

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

function pickSentences(letter, count = 6) {
  const pool = [...getSentencePool(letter)];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}

const INITIAL_M_SENTENCES = pickSentences("M");

export default function App() {
  const [activeTab, setActiveTab] = useState("M");
  const [sentences, setSentences] = useState(() => ({ M: INITIAL_M_SENTENCES, P: null, L: null, B: null, F: null, S: null, V: null, Z: null }));
  const [inputs, setInputs] = useState(() => ({ M: INITIAL_M_SENTENCES.map(s => s.parts.filter(p => "blank" in p).map(() => "")), P: [], L: [], B: [], F: [], S: [], V: [], Z: [] }));
  const [checked, setChecked] = useState({ M: false, P: false, L: false, B: false, F: false, S: false, V: false, Z: false });
  const [score, setScore] = useState({ M: null, P: null, L: null, B: null, F: null, S: null, V: null, Z: null });
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState(null);

  const loadSentences = useCallback((letter) => {
    const picked = pickSentences(letter);
    setSentences((prev) => ({ ...prev, [letter]: picked }));
    setInputs((prev) => ({ ...prev, [letter]: picked.map(s => s.parts.filter(p => "blank" in p).map(() => "")) }));
    setChecked((prev) => ({ ...prev, [letter]: false }));
    setScore((prev) => ({ ...prev, [letter]: null }));
  }, []);

  useEffect(() => {
    if (!sentences[activeTab]) {
      loadSentences(activeTab);
    }
  }, [activeTab, loadSentences, sentences]);

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

  const checkAnswers = () => {
    const currentSentences = sentences[activeTab];
    if (!currentSentences) return;

    let correct = 0;
    let total = 0;
    const mistakes = [];

    currentSentences.forEach((sentence, si) => {
      const sentenceText = sentence.parts.map(p => "text" in p ? p.text : p.blank).join("");
      sentence.parts.filter(p => "blank" in p).forEach((part, bi) => {
        total += 1;
        const given = inputs[activeTab][si]?.[bi] || "";
        if (given.toLowerCase() === part.blank.toLowerCase()) {
          correct += 1;
        } else {
          mistakes.push({ sentence: sentenceText, expected: part.blank, given: given || "—" });
        }
      });
    });

    setScore((prev) => ({ ...prev, [activeTab]: { correct, total } }));
    setChecked((prev) => ({ ...prev, [activeTab]: true }));

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter: activeTab, correct, total, mistakes }),
    }).catch(() => {});
  };

  const clearInputs = () => {
    const currentSentences = sentences[activeTab];
    setInputs((prev) => ({ ...prev, [activeTab]: (currentSentences || []).map(s => s.parts.filter(p => "blank" in p).map(() => "")) }));
    setChecked((prev) => ({ ...prev, [activeTab]: false }));
    setScore((prev) => ({ ...prev, [activeTab]: null }));
  };

  const loadHistory = useCallback(async () => {
    setSessions(null);
    setShowHistory(true);
    try {
      const res = await fetch("/api/sessions?limit=150");
      setSessions(await res.json());
    } catch {
      setSessions([]);
    }
  }, []);

  const data = TAB_META[activeTab];
  const currentSentences = sentences[activeTab];
  const bankSummary = getBankSummary(activeTab);

  const blankStyle = (si, bi, correctBlank) => {
    if (!checked[activeTab]) return {};
    const isCorrect = (inputs[activeTab]?.[si]?.[bi] || "").toLowerCase() === correctBlank.toLowerCase();
    return {
      background: isCorrect ? "#d4edda" : "#f8d7da",
      borderColor: isCorrect ? "#28a745" : "#dc3545",
      color: isCorrect ? "#155724" : "#721c24",
    };
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f5f7fa 0%, #e8ecf0 100%)", fontFamily: "Georgia, serif", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .tab-btn { cursor: pointer; border: 3px solid transparent; border-radius: 12px; padding: 10px 22px; font-size: 1.05rem; font-family: 'Nunito', sans-serif; font-weight: 800; transition: all 0.2s; }
        .tab-btn:hover { transform: translateY(-2px); }
        .blank-input { display: inline-block; width: 36px; height: 28px; border: none; border-bottom: 3px solid #bbb; background: #fafafa; font-size: 1.05rem; font-family: 'Lora', serif; font-weight: 600; text-align: center; outline: none; border-radius: 4px 4px 0 0; padding: 0 2px; transition: all 0.2s; vertical-align: baseline; margin: 0 1px; }
        .blank-input:focus { background: #fffbf0; }
        .check-btn { border: none; border-radius: 10px; padding: 11px 26px; font-size: 1rem; font-family: 'Nunito', sans-serif; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .check-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.14); }
        .check-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .sentence-row { background: white; border-radius: 12px; padding: 13px 18px; margin-bottom: 9px; font-family: 'Lora', serif; font-size: 1.07rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid var(--accent); line-height: 2; display: flex; align-items: baseline; }
        .num { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; border-radius: 50%; font-size: 0.78rem; font-weight: 800; font-family: 'Nunito', sans-serif; margin-right: 10px; flex-shrink: 0; }
        .hint { font-size: 0.8rem; color: #27ae60; font-style: italic; font-family: 'Nunito', sans-serif; margin-left: 6px; }
        .history-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; justify-content: flex-end; }
        .history-panel { background: white; width: min(520px, 100vw); height: 100vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.18); }
        .history-panel::-webkit-scrollbar { width: 6px; }
        .history-panel::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .session-card { border: 1px solid #eee; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
        .session-header { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; }
        .session-header:hover { background: #f8f9fa; }
        .mistake-row { padding: 7px 14px; border-top: 1px solid #f0f0f0; font-family: 'Lora', serif; font-size: 0.88rem; background: #fffaf9; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 26, position: "relative" }}>
        <div style={{ fontSize: "2.4rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#2c3e50", letterSpacing: "-1px" }}>
          Vyjmenovaná slova
        </div>
        <div style={{ fontSize: "0.95rem", color: "#7f8c8d", fontFamily: "'Lora', serif", fontStyle: "italic", marginTop: 4 }}>
          Doplň správně <strong>i</strong> nebo <strong>y</strong> (popřípadě <strong>í / ý</strong>)
        </div>
        <button
          onClick={loadHistory}
          style={{ position: "absolute", top: 6, right: 0, background: "white", border: "2px solid #bdc3c7", borderRadius: 10, padding: "7px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: "#7f8c8d", cursor: "pointer" }}
        >
          📊 Historie
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 26, flexWrap: "wrap" }}>
        {Object.entries(TAB_META).map(([letter, meta]) => (
          <button
            key={letter}
            className="tab-btn"
            onClick={() => setActiveTab(letter)}
            style={{
              background: activeTab === letter ? meta.accent : "white",
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

      <div style={{ maxWidth: 700, margin: "0 auto", "--accent": data.accent }}>
        <div style={{ background: "white", borderRadius: 20, padding: "26px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.7rem" }}>{data.emoji}</span>
                <span style={{ fontSize: "1.15rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: data.color }}>
                  Po {activeTab}
                </span>
              </div>
              {bankSummary && (
                <div style={{ marginTop: 4, fontSize: "0.8rem", fontFamily: "'Nunito', sans-serif", color: "#7f8c8d" }}>
                  Databáze: {bankSummary.total} / {bankSummary.targetTotal} vět
                </div>
              )}
            </div>
            <button
              className="check-btn"
              onClick={() => loadSentences(activeTab)}
              style={{ background: data.bg, color: data.accent, fontSize: "0.88rem", padding: "7px 16px", border: `2px solid ${data.accent}` }}
            >
              ↻ Nové věty
            </button>
          </div>

          {currentSentences?.map((sentence, si) => {
            let blankCounter = 0;
            const partsWithIdx = sentence.parts.map(p => "blank" in p ? { ...p, bi: blankCounter++ } : p);

            return (
              <div key={`${activeTab}-${si}`} className="sentence-row">
                <span className="num" style={{ background: data.bg, color: data.accent }}>{si + 1}</span>
                <span>
                  {partsWithIdx.map((part, pi) => {
                    if ("text" in part) return <span key={pi}>{part.text}</span>;
                    const { bi, blank } = part;
                    const val = inputs[activeTab]?.[si]?.[bi] || "";
                    const isWrong = checked[activeTab] && val.toLowerCase() !== blank.toLowerCase();
                    return (
                      <span key={pi}>
                        <input
                          className="blank-input"
                          value={val}
                          onChange={e => handleInput(si, bi, e.target.value)}
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
            const background = correct === total ? "#d4edda" : correct >= Math.ceil(total / 2) ? "#fff3cd" : "#f8d7da";

            return (
              <div style={{ margin: "18px 0 14px", textAlign: "center", padding: 14, borderRadius: 12, background }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 2 }}>
                  {correct === total ? "🏆" : correct >= 4 ? "🌟" : "💪"}
                </div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#2c3e50", fontSize: "1.05rem" }}>
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
            <button className="check-btn" onClick={clearInputs} style={{ background: "#ecf0f1", color: "#7f8c8d" }}>
              ↺ Vymazat
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: "0.82rem", color: "#aaa", fontStyle: "italic", fontFamily: "'Lora', serif" }}>
          Nové věty = náhodný výběr z místní databáze.
        </div>
      </div>

      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", position: "sticky", top: 0, zIndex: 1 }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#2c3e50" }}>📊 Historie cvičení</span>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#7f8c8d", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: "16px 20px", flex: 1 }}>
              {sessions === null && (
                <div style={{ textAlign: "center", color: "#aaa", fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>
              )}
              {sessions !== null && sessions.length === 0 && (
                <div style={{ textAlign: "center", color: "#aaa", fontFamily: "'Nunito', sans-serif", padding: 40 }}>Žádná cvičení zatím nebyla uložena.</div>
              )}
              {sessions !== null && sessions.map(session => {
                const meta = TAB_META[session.letter];
                const pct = session.total > 0 ? Math.round(session.correct / session.total * 100) : 0;
                const date = new Date(session.timestamp);
                const dateStr = date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
                const timeStr = date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
                const hasMistakes = session.mistakes.length > 0;

                return (
                  <details key={session.id} className="session-card">
                    <summary className="session-header" style={{ listStyle: "none" }}>
                      <span style={{ background: meta?.accent ?? "#999", color: "white", borderRadius: 8, padding: "3px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem" }}>
                        {meta?.emoji} Po {session.letter}
                      </span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.88rem", color: "#2c3e50", fontWeight: 700 }}>
                        {session.correct}/{session.total}
                        <span style={{ marginLeft: 5, color: pct === 100 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c", fontWeight: 800 }}>{pct}%</span>
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: "#95a5a6" }}>
                        {dateStr} {timeStr}
                      </span>
                    </summary>
                    {hasMistakes ? (
                      session.mistakes.map((m, i) => (
                        <div key={i} className="mistake-row">
                          <div style={{ color: "#555", marginBottom: 3 }}>{m.sentence}</div>
                          <div style={{ fontSize: "0.82rem", fontFamily: "'Nunito', sans-serif" }}>
                            <span style={{ color: "#e74c3c" }}>Napsáno: <strong>{m.given}</strong></span>
                            <span style={{ margin: "0 8px", color: "#bbb" }}>→</span>
                            <span style={{ color: "#27ae60" }}>Správně: <strong>{m.expected}</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="mistake-row" style={{ color: "#27ae60", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                        🏆 Žádné chyby!
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
