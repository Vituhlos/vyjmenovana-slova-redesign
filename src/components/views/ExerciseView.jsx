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
const MIX_META = { color: "#5d4e8a", bg: "#f5f2ff", accent: "#7f6ccc", emoji: "🎲" };
const REVIEW_META = { color: "#1a5e34", bg: "#f0fff5", accent: "#27ae60", emoji: "🔁" };

const CAT_LABELS = {
  basicWords: "Základní",
  relatedWords: "Příbuzná",
  easySentences: "Lehké",
  mediumSentences: "Střední",
};

const COUNTS = [4, 6, 8, 10, 15];

export default function ExerciseView({
  activeTab,
  darkMode,
  sentences,
  inputs,
  checked,
  score,
  sentenceCount,
  setSentenceCount,
  activeCats,
  toggleCat,
  SELECTABLE_CATS,
  bankSummary,
  activeAiCount,
  onNewSentences,
  onInput,
  onCheck,
  onClear,
}) {
  const dark = darkMode;
  const data = TAB_META[activeTab] ?? (activeTab === "REVIEW" ? REVIEW_META : MIX_META);
  const currentSentences = sentences[activeTab];
  const totalSentencePool = (bankSummary?.total ?? 0) + activeAiCount;
  const numBg = dark ? `${data.accent}22` : data.bg;

  const cardBg = dark ? "bg-gray-900" : "bg-white";
  const cardBorder = dark ? "border-gray-800" : "border-gray-100";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const rowBg = dark ? "#1a2030" : "#ffffff";
  const settingsBg = dark ? "bg-gray-900" : "bg-white";

  const blankStyle = (si, bi, correctBlank) => {
    if (!checked[activeTab]) return {};
    const isCorrect = (inputs[activeTab]?.[si]?.[bi] || "").toLowerCase() === correctBlank.toLowerCase();
    return {
      background: isCorrect ? (dark ? "#0d2a18" : "#d4edda") : (dark ? "#2a0e0e" : "#f8d7da"),
      borderColor: isCorrect ? "#28a745" : "#dc3545",
      color: isCorrect ? (dark ? "#5dd88a" : "#155724") : (dark ? "#f08080" : "#721c24"),
    };
  };

  const tabTitle = activeTab === "MIX" ? "Všechna písmena" : activeTab === "REVIEW" ? "Procvič chyby" : `Vyjmenovaná po ${activeTab}`;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-mobile-nav">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Exercise header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{data.emoji}</span>
            <h1 className={`text-xl font-extrabold ${textColor}`} style={{ color: data.color }}>
              {tabTitle}
            </h1>
          </div>
          {bankSummary && (
            <p className={`text-xs ${subtextColor}`}>
              Databáze: {bankSummary.total} vět
              {activeAiCount > 0 && ` · AI: +${activeAiCount} · Celkem: ${totalSentencePool}`}
            </p>
          )}
        </div>

        {/* Settings bar */}
        <div className={`${settingsBg} border ${cardBorder} rounded-2xl p-3 mb-4 flex flex-wrap gap-3 items-center shadow-sm`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${subtextColor} whitespace-nowrap`}>Vět:</span>
            <div className="flex gap-1">
              {COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setSentenceCount(n)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
                  style={sentenceCount === n
                    ? { background: data.accent, color: "white" }
                    : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#94a3b8" : "#64748b" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={`w-px h-5 ${dark ? "bg-gray-700" : "bg-gray-200"} hidden sm:block`} />

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${subtextColor} whitespace-nowrap`}>Typ:</span>
            {SELECTABLE_CATS.map(cat => {
              const active = activeCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
                  style={active
                    ? { background: data.accent + "22", color: data.accent }
                    : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#4b5563" : "#9ca3af", textDecoration: "line-through" }
                  }
                >
                  {CAT_LABELS[cat]}
                </button>
              );
            })}
            <span className={`text-xs ${subtextColor}`}>+ Chytáky</span>
          </div>
        </div>

        {/* Exercise card */}
        <div className={`${cardBg} border ${cardBorder} rounded-2xl shadow-sm overflow-hidden mb-4`}>
          {/* Card header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${cardBorder}`}>
            <span className={`text-sm font-semibold ${subtextColor}`}>
              {currentSentences ? `${currentSentences.length} vět` : "Načítám…"}
            </span>
            <button
              onClick={() => onNewSentences(activeTab)}
              className="text-xs font-bold px-4 py-2 rounded-xl border-2 transition-all hover:shadow-sm"
              style={{ borderColor: data.accent, color: data.accent, background: numBg }}
            >
              ↻ Nové věty
            </button>
          </div>

          {/* Sentences */}
          <div className="px-4 py-4">
            {currentSentences === null && (
              <div className={`text-center py-8 text-sm ${subtextColor}`}>Načítám věty…</div>
            )}
            {currentSentences !== null && currentSentences.length === 0 && (
              <div className={`text-center py-8 text-sm ${subtextColor}`}>
                {activeTab === "REVIEW" ? "Žádné chyby k procvičení." : "Žádné věty."}
              </div>
            )}

            {currentSentences?.map((sentence, si) => {
              let blankCounter = 0;
              const partsWithIdx = sentence.parts.map(p => "blank" in p ? { ...p, bi: blankCounter++ } : p);

              return (
                <div
                  key={`${activeTab}-${si}`}
                  className="sentence-row"
                  style={{ background: rowBg, "--accent-color": data.accent, color: dark ? "#d1d5db" : "#374151" }}
                >
                  <span
                    className="num inline-flex items-center justify-center rounded-full text-xs font-extrabold mr-3 flex-shrink-0"
                    style={{ minWidth: 24, height: 24, background: numBg, color: data.accent }}
                  >
                    {si + 1}
                  </span>
                  <span>
                    {renderSentenceParts(partsWithIdx, si, activeTab, inputs, checked, blankStyle, onInput, dark)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Score result */}
          {checked[activeTab] && score[activeTab] && (() => {
            const { correct, total } = score[activeTab];
            const pct = Math.round((correct / total) * 100);
            const isPerf = correct === total;
            const isGood = correct >= Math.ceil(total / 2);
            const bg = isPerf ? (dark ? "#0d2218" : "#d4edda") : isGood ? (dark ? "#252010" : "#fff3cd") : (dark ? "#281010" : "#f8d7da");
            const color = isPerf ? "#27ae60" : isGood ? "#f39c12" : "#e74c3c";

            return (
              <div className="mx-4 mb-4 rounded-xl p-4 text-center" style={{ background: bg }}>
                <div className="text-xl mb-1">{isPerf ? "🏆" : isGood ? "🌟" : "💪"}</div>
                <div className="font-extrabold text-base" style={{ color }}>
                  {correct} / {total} správně
                  {" "}
                  <span className="font-normal text-sm">
                    {isPerf ? "Perfektní!" : isGood ? "Výborně!" : "Zkus to znovu!"}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className={`flex gap-3 justify-center px-4 pb-5 ${checked[activeTab] && score[activeTab] ? "pt-0" : "pt-2"}`}>
            <button
              onClick={onCheck}
              disabled={!currentSentences}
              className="px-7 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none shadow-sm"
              style={{ background: data.accent }}
            >
              ✓ Zkontrolovat
            </button>
            <button
              onClick={onClear}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 ${
                dark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              ↺ Vymazat
            </button>
          </div>
        </div>

        <p className={`text-center text-xs font-serif italic ${dark ? "text-gray-600" : "text-gray-400"}`}>
          Nové věty = náhodný výběr z databáze + AI vět (pokud jsou k dispozici).
        </p>
      </div>
    </div>
  );
}

function renderSentenceParts(partsWithIdx, si, activeTab, inputs, checked, blankStyle, onInput, dark) {
  const result = [];
  let pi = 0;

  const checkAnswers = (e) => {
    if (e.key === "Enter") {
      const btn = document.querySelector("[data-check-btn]");
      if (btn) btn.click();
    }
  };

  while (pi < partsWithIdx.length) {
    const p = partsWithIdx[pi];

    if ("blank" in p) {
      const { bi, blank } = p;
      const val = inputs[activeTab]?.[si]?.[bi] || "";
      const isWrong = checked[activeTab] && val.toLowerCase() !== blank.toLowerCase();
      const isCorrect = checked[activeTab] && val.toLowerCase() === blank.toLowerCase();

      result.push(
        <span key={pi} style={{ whiteSpace: "nowrap" }}>
          <input
            className={`blank-input${dark ? " dark" : ""}${isWrong ? " anim-wrong" : isCorrect ? " anim-correct" : ""}`}
            value={val}
            onChange={e => onInput(si, bi, e.target.value)}
            onKeyDown={e => e.key === "Enter" && document.querySelector("[data-check-btn]")?.click()}
            maxLength={2}
            style={blankStyle(si, bi, blank)}
          />
          {isWrong && (
            <span className="text-xs italic ml-1" style={{ color: "#27ae60", fontFamily: "Lora, serif" }}>
              ({blank})
            </span>
          )}
        </span>
      );
      pi++;
      continue;
    }

    const nextP = partsWithIdx[pi + 1];
    if (!nextP || "text" in nextP) {
      result.push(<span key={pi}>{p.text}</span>);
      pi++;
      continue;
    }

    const { bi, blank } = nextP;
    const val = inputs[activeTab]?.[si]?.[bi] || "";
    const isWrong = checked[activeTab] && val.toLowerCase() !== blank.toLowerCase();
    const isCorrect = checked[activeTab] && val.toLowerCase() === blank.toLowerCase();
    const lastSpace = p.text.lastIndexOf(" ");
    const textBefore = lastSpace >= 0 ? p.text.slice(0, lastSpace + 1) : "";
    const wordBefore = lastSpace >= 0 ? p.text.slice(lastSpace + 1) : p.text;
    const afterP = partsWithIdx[pi + 2];
    let wordAfter = "", textAfter = "", advance = 2;
    if (afterP && "text" in afterP) {
      const fs = afterP.text.indexOf(" ");
      wordAfter = fs >= 0 ? afterP.text.slice(0, fs) : afterP.text;
      textAfter = fs >= 0 ? afterP.text.slice(fs) : "";
      advance = 3;
    }

    result.push(
      <span key={pi}>
        {textBefore && <span>{textBefore}</span>}
        <span style={{ whiteSpace: "nowrap" }}>
          {wordBefore && <span>{wordBefore}</span>}
          <input
            className={`blank-input${dark ? " dark" : ""}${isWrong ? " anim-wrong" : isCorrect ? " anim-correct" : ""}`}
            value={val}
            onChange={e => onInput(si, bi, e.target.value)}
            onKeyDown={e => e.key === "Enter" && document.querySelector("[data-check-btn]")?.click()}
            maxLength={2}
            style={blankStyle(si, bi, blank)}
          />
          {isWrong && (
            <span className="text-xs italic ml-1" style={{ color: "#27ae60", fontFamily: "Lora, serif" }}>
              ({blank})
            </span>
          )}
          {wordAfter && <span>{wordAfter}</span>}
        </span>
        {textAfter && <span>{textAfter}</span>}
      </span>
    );
    pi += advance;
  }

  return result;
}
