const TAB_META = {
  M: { accent: "#e74c3c", emoji: "🐭" },
  P: { accent: "#8e44ad", emoji: "🎒" },
  L: { accent: "#27ae60", emoji: "⛷️" },
  B: { accent: "#2980b9", emoji: "🏠" },
  F: { accent: "#e67e22", emoji: "🧪" },
  S: { accent: "#27ae60", emoji: "🧀" },
  V: { accent: "#2471a3", emoji: "🦦" },
  Z: { accent: "#8e44ad", emoji: "🔔" },
};

const ALL_TABS = [...Object.keys(TAB_META), "MIX", "REVIEW"];

export default function MobileNav({ activeTab, onTabChange, onReviewTab, onShowHistory, onShowTahak, darkMode }) {
  const dark = darkMode;
  const bg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const text = dark ? "text-gray-400" : "text-gray-500";

  const letters = Object.entries(TAB_META);

  // Mobile nav shows: active letter selector + key actions
  return (
    <div className={`fixed bottom-0 inset-x-0 z-40 border-t ${bg} md:hidden`}>
      {/* Letter scroll */}
      <div className="flex overflow-x-auto scrollbar-none px-2 pt-2 gap-1.5">
        {letters.map(([letter, meta]) => {
          const isActive = activeTab === letter;
          return (
            <button
              key={letter}
              onClick={() => onTabChange(letter)}
              className="flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition-all"
              style={isActive ? { background: meta.accent + "22", color: meta.accent } : { color: dark ? "#6b7280" : "#9ca3af" }}
            >
              <span className="text-sm leading-none">{meta.emoji}</span>
              <span className="text-xs font-bold mt-0.5">{letter}</span>
            </button>
          );
        })}
        <button
          onClick={() => onTabChange("MIX")}
          className="flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition-all"
          style={activeTab === "MIX" ? { background: "#7f6ccc22", color: "#7f6ccc" } : { color: dark ? "#6b7280" : "#9ca3af" }}
        >
          <span className="text-sm leading-none">🎲</span>
          <span className="text-xs font-bold mt-0.5">MIX</span>
        </button>
        <button
          onClick={onReviewTab}
          className="flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg transition-all"
          style={activeTab === "REVIEW" ? { background: "#27ae6022", color: "#27ae60" } : { color: dark ? "#6b7280" : "#9ca3af" }}
        >
          <span className="text-sm leading-none">🔁</span>
          <span className="text-xs font-bold mt-0.5">Chyby</span>
        </button>
      </div>

      {/* Action bar */}
      <div className={`flex border-t ${dark ? "border-gray-800" : "border-gray-100"} mt-1`}>
        <button
          onClick={onShowTahak}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold ${text}`}
        >
          <span className="text-base mb-0.5">📖</span>
          Tahák
        </button>
        <button
          onClick={onShowHistory}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold ${text}`}
        >
          <span className="text-base mb-0.5">📊</span>
          Historie
        </button>
      </div>
    </div>
  );
}
