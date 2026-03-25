import Avatar, { avatarColor } from "./Avatar.jsx";

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

export default function Sidebar({
  currentUser,
  activeTab,
  onTabChange,
  score,
  streakData,
  darkMode,
  setDarkMode,
  soundOn,
  setSoundOn,
  onLogout,
  onShowHistory,
  onShowTahak,
  onShowSettings,
  onReviewTab,
}) {
  const dark = darkMode;

  const sidebarBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const textColor = dark ? "text-gray-200" : "text-gray-700";
  const mutedColor = dark ? "text-gray-500" : "text-gray-400";
  const hoverBg = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";

  const getLetterScore = (letter) => {
    const s = score[letter];
    if (!s) return null;
    return Math.round((s.correct / s.total) * 100);
  };

  const getScoreColor = (pct) => {
    if (pct === null) return null;
    if (pct >= 90) return "#27ae60";
    if (pct >= 70) return "#f39c12";
    return "#e74c3c";
  };

  return (
    <aside className={`flex flex-col h-full border-r ${sidebarBg}`}>
      {/* Logo */}
      <div className={`px-5 py-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <div className={`font-extrabold text-lg tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
          Vyjmenovaná slova
        </div>
        <div className={`text-xs mt-0.5 font-serif italic ${mutedColor}`}>
          doplň i nebo y
        </div>
      </div>

      {/* Letter navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 ${mutedColor}`}>
          Cvičení
        </div>

        {Object.entries(TAB_META).map(([letter, meta]) => {
          const isActive = activeTab === letter;
          const pct = getLetterScore(letter);
          const scoreColor = getScoreColor(pct);

          return (
            <button
              key={letter}
              onClick={() => onTabChange(letter)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left group ${
                isActive
                  ? "text-white shadow-sm"
                  : `${textColor} ${hoverBg}`
              }`}
              style={isActive ? { background: meta.accent } : {}}
            >
              <span className="text-base leading-none">{meta.emoji}</span>
              <span className="font-semibold text-sm flex-1">Po {letter}</span>
              {pct !== null && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                  style={isActive
                    ? { background: "rgba(255,255,255,0.2)", color: "white" }
                    : { background: scoreColor + "22", color: scoreColor }
                  }
                >
                  {pct}%
                </span>
              )}
            </button>
          );
        })}

        {/* MIX */}
        <button
          onClick={() => onTabChange("MIX")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
            activeTab === "MIX"
              ? "text-white shadow-sm"
              : `${textColor} ${hoverBg}`
          }`}
          style={activeTab === "MIX" ? { background: "#7f6ccc" } : {}}
        >
          <span className="text-base leading-none">🎲</span>
          <span className="font-semibold text-sm flex-1">MIX</span>
          {score["MIX"] && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={activeTab === "MIX"
                ? { background: "rgba(255,255,255,0.2)", color: "white" }
                : { background: "#7f6ccc22", color: "#7f6ccc" }
              }>
              {Math.round((score["MIX"].correct / score["MIX"].total) * 100)}%
            </span>
          )}
        </button>

        {/* Procvič chyby */}
        <button
          onClick={onReviewTab}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-4 transition-all text-left ${
            activeTab === "REVIEW"
              ? "text-white shadow-sm"
              : `${textColor} ${hoverBg}`
          }`}
          style={activeTab === "REVIEW" ? { background: "#27ae60" } : {}}
        >
          <span className="text-base leading-none">🔁</span>
          <span className="font-semibold text-sm flex-1">Procvič chyby</span>
        </button>

        {/* Tools */}
        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 mt-2 ${mutedColor}`}>
          Nástroje
        </div>

        <button
          onClick={onShowTahak}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${textColor} ${hoverBg}`}
        >
          <span className="text-base leading-none">📖</span>
          <span className="font-semibold text-sm">Tahák</span>
        </button>

        <button
          onClick={onShowHistory}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${textColor} ${hoverBg}`}
        >
          <span className="text-base leading-none">📊</span>
          <span className="font-semibold text-sm">Historie</span>
        </button>

        {currentUser?.role === "parent" && (
          <button
            onClick={onShowSettings}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${textColor} ${hoverBg}`}
          >
            <span className="text-base leading-none">⚙️</span>
            <span className="font-semibold text-sm">Nastavení</span>
          </button>
        )}
      </nav>

      {/* Bottom: user info + actions */}
      <div className={`px-3 py-3 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
        {/* Sound + Dark mode */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSoundOn(s => !s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              dark ? "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {soundOn ? "🔊 Zvuk" : "🔇 Ticho"}
          </button>
          <button
            onClick={() => setDarkMode(d => !d)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              dark ? "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {darkMode ? "☀️ Světlý" : "🌙 Tmavý"}
          </button>
        </div>

        {/* User row */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
            dark ? "hover:bg-gray-800" : "hover:bg-gray-50"
          }`}
          title="Odhlásit / Změnit uživatele"
        >
          <Avatar user={currentUser} size={34} border />
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-sm truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>
              {currentUser.name}
            </div>
            {streakData?.streak > 0 && (
              <div className="text-xs font-semibold" style={{ color: "#f39c12" }}>
                🔥 {streakData.streak} dní v řadě
              </div>
            )}
          </div>
          <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${mutedColor}`}>
            ↩
          </span>
        </button>
      </div>
    </aside>
  );
}
