import Avatar, { avatarColor } from "../Avatar.jsx";

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

export default function ParentDashboard({
  darkMode,
  users,
  sessions,
  stats,
  statsByUser,
  streakDataByUser,
  onShowHistory,
  onShowSettings,
  onSwitchToExercise,
}) {
  const dark = darkMode;
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const sectionTitle = `text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`;

  const children = (users || []).filter(u => u.role !== "parent");
  const LETTERS = Object.keys(TAB_META);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-mobile-nav">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-extrabold ${textColor}`}>Přehled</h1>
          <p className={`text-sm mt-1 ${subtextColor}`}>
            Výsledky a pokrok všech dětí
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={onSwitchToExercise}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#2980b9" }}
          >
            ✏️ Cvičit
          </button>
          <button
            onClick={onShowHistory}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
              dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            📊 Plná historie
          </button>
          <button
            onClick={onShowSettings}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
              dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            ⚙️ Nastavení
          </button>
        </div>

        {/* Children cards */}
        {children.length > 0 && (
          <section className="mb-8">
            <div className={sectionTitle}>Profily dětí</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map(child => (
                <ChildCard
                  key={child.id}
                  child={child}
                  statsByUser={statsByUser}
                  sessions={sessions}
                  dark={dark}
                  textColor={textColor}
                  subtextColor={subtextColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Per-letter comparison */}
        {statsByUser && children.length > 1 && (
          <section className="mb-8">
            <div className={sectionTitle}>Porovnání podle písmene</div>
            <div className={`border ${cardBg} rounded-2xl p-5 shadow-sm`}>
              {LETTERS.filter(l => statsByUser.some(r => r.letter === l)).map(letter => {
                const meta = TAB_META[letter];
                const usersWithData = children.filter(u => statsByUser.some(r => r.user_id === u.id && r.letter === letter));
                if (usersWithData.length === 0) return null;

                return (
                  <div key={letter} className="mb-5 last:mb-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-sm font-bold" style={{ color: meta.color }}>Po {letter}</span>
                    </div>
                    <div className="space-y-2">
                      {usersWithData.map(u => {
                        const row = statsByUser.find(r => r.user_id === u.id && r.letter === letter);
                        if (!row) return null;
                        const pct = row.avg_accuracy || 0;
                        const barColor = avatarColor(u.id);
                        return (
                          <div key={u.id} className="flex items-center gap-3">
                            <Avatar user={u} size={20} />
                            <span className={`text-xs font-semibold min-w-[60px] ${subtextColor}`}>{u.name}</span>
                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                            <span className="text-xs font-bold min-w-[38px] text-right" style={{ color: barColor }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent sessions */}
        {sessions && sessions.length > 0 && (
          <section className="mb-8">
            <div className={sectionTitle}>Poslední cvičení</div>
            <div className={`border ${cardBg} rounded-2xl overflow-hidden shadow-sm`}>
              {sessions.slice(0, 10).map(session => {
                const meta = TAB_META[session.letter];
                const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
                const sessionUser = users?.find(u => u.id === session.user_id);
                const ts = new Date(
                  typeof session.timestamp === "string" && !session.timestamp.endsWith("Z") && !session.timestamp.includes("+")
                    ? session.timestamp.replace(" ", "T") + "Z"
                    : session.timestamp
                );
                const pctColor = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";

                return (
                  <div key={session.id} className={`flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 ${dark ? "border-gray-800" : "border-gray-50"}`}>
                    {/* Letter badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: meta?.accent + "22" }}>
                      {meta?.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {sessionUser && <Avatar user={sessionUser} size={18} />}
                        <span className={`text-sm font-semibold truncate ${textColor}`}>
                          {sessionUser?.name ?? "—"} · Po {session.letter}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 ${subtextColor}`}>
                        {ts.toLocaleDateString("cs-CZ")} {ts.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                        {session.duration_s && ` · ${Math.floor(session.duration_s / 60)}:${String(session.duration_s % 60).padStart(2, "0")}`}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="font-extrabold text-base" style={{ color: pctColor }}>{pct}%</div>
                      <div className={`text-xs ${subtextColor}`}>{session.correct}/{session.total}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {sessions === null && (
          <div className={`text-center py-12 text-sm ${subtextColor}`}>Načítám data…</div>
        )}
      </div>
    </div>
  );
}

function ChildCard({ child, statsByUser, sessions, dark, textColor, subtextColor }) {
  const color = avatarColor(child.id);
  const LETTERS = Object.keys(TAB_META);

  // Calculate overall accuracy for this child
  const childStats = (statsByUser || []).filter(r => r.user_id === child.id);
  const overallPct = childStats.length > 0
    ? Math.round(childStats.reduce((sum, r) => sum + (r.avg_accuracy || 0), 0) / childStats.length)
    : null;

  // Recent session
  const recentSession = (sessions || []).find(s => s.user_id === child.id);

  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";

  return (
    <div className={`border ${cardBg} rounded-2xl p-5 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar user={child} size={44} border />
        <div>
          <div className={`font-bold text-base ${textColor}`}>{child.name}</div>
          {overallPct !== null && (
            <div className="text-xs font-semibold mt-0.5" style={{ color }}>
              Průměr: {overallPct}%
            </div>
          )}
        </div>
      </div>

      {/* Letter progress */}
      <div className="space-y-1.5">
        {LETTERS.map(letter => {
          const stat = childStats.find(r => r.letter === letter);
          const pct = stat?.avg_accuracy ?? null;
          const meta = TAB_META[letter];
          const pctColor = pct === null ? null : pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";

          return (
            <div key={letter} className="flex items-center gap-2">
              <span className="text-xs w-4 text-center">{meta.emoji}</span>
              <span className={`text-xs font-bold w-3 ${subtextColor}`}>{letter}</span>
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                {pct !== null && (
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: pctColor }}
                  />
                )}
              </div>
              <span className="text-xs font-bold w-9 text-right" style={{ color: pctColor ?? (dark ? "#374151" : "#d1d5db") }}>
                {pct !== null ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      {recentSession && (
        <div className={`mt-4 pt-3 border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <div className={`text-xs ${subtextColor}`}>
            Naposledy: {TAB_META[recentSession.letter]?.emoji} Po {recentSession.letter} ·{" "}
            <span className="font-semibold" style={{ color: recentSession.correct === recentSession.total ? "#27ae60" : "#f39c12" }}>
              {recentSession.total > 0 ? Math.round(recentSession.correct / recentSession.total * 100) : 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
