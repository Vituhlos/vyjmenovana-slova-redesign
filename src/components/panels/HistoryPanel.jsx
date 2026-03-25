import SlidePanel from "./SlidePanel.jsx";
import Avatar, { avatarColor } from "../Avatar.jsx";

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

const LETTERS = Object.keys(TAB_META);

export default function HistoryPanel({
  onClose,
  darkMode,
  currentUser,
  users,
  sessions,
  stats,
  statsByUser,
  achievements,
  histTab,
  setHistTab,
  histFilterUser,
  setHistFilterUser,
  onExportCSV,
}) {
  const dark = darkMode;
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const mutedColor = dark ? "text-gray-600" : "text-gray-400";
  const borderColor = dark ? "border-gray-800" : "border-gray-100";
  const rowBg = dark ? "bg-gray-800" : "bg-gray-50";
  const accent = "#2980b9";

  const tabs = [
    ["sessions", "Sezení"],
    ["stats", "Statistiky"],
    ["badges", "🏅 Odznaky"],
  ];

  const headerExtra = histTab === "sessions" && sessions && sessions.length > 0 && (
    <button
      onClick={onExportCSV}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
        dark ? "border-gray-700 text-gray-400 hover:bg-gray-800" : "border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      ⬇ CSV
    </button>
  );

  return (
    <SlidePanel title="📊 Přehled" onClose={onClose} darkMode={darkMode} headerExtra={headerExtra}>
      {/* Tab nav */}
      <div className={`flex border-b ${borderColor} px-5 flex-shrink-0 bg-inherit sticky top-0 z-10 ${dark ? "bg-gray-900" : "bg-white"}`}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setHistTab(key)}
            className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
              histTab === key
                ? "border-blue-500 text-blue-500"
                : `border-transparent ${subtextColor} hover:text-gray-600`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {/* Sessions */}
        {histTab === "sessions" && (
          <>
            {sessions === null && <LoadingState dark={dark} />}
            {sessions !== null && sessions.length === 0 && (
              <EmptyState dark={dark} text="Žádná cvičení zatím nebyla uložena." />
            )}

            {/* Filter by user (parent only) */}
            {sessions?.length > 0 && currentUser?.role === "parent" && users?.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <FilterChip
                  active={histFilterUser === null}
                  onClick={() => setHistFilterUser(null)}
                  dark={dark}
                  label="Všichni"
                  color={accent}
                />
                {users.map(u => (
                  <FilterChip
                    key={u.id}
                    active={histFilterUser === u.id}
                    onClick={() => setHistFilterUser(histFilterUser === u.id ? null : u.id)}
                    dark={dark}
                    label={u.name}
                    color={avatarColor(u.id)}
                    avatar={u}
                  />
                ))}
              </div>
            )}

            {sessions?.filter(s => histFilterUser === null || s.user_id === histFilterUser).map(session => (
              <SessionCard key={session.id} session={session} users={users} currentUser={currentUser} dark={dark} textColor={textColor} subtextColor={subtextColor} borderColor={borderColor} rowBg={rowBg} />
            ))}
          </>
        )}

        {/* Stats */}
        {histTab === "stats" && (
          <>
            {stats === null && <LoadingState dark={dark} />}
            {stats !== null && stats.length === 0 && <EmptyState dark={dark} text="Zatím žádná data." />}
            {stats !== null && stats.length > 0 && (
              <StatsContent
                stats={stats}
                statsByUser={statsByUser}
                currentUser={currentUser}
                users={users}
                sessions={sessions}
                histFilterUser={histFilterUser}
                dark={dark}
                textColor={textColor}
                subtextColor={subtextColor}
                borderColor={borderColor}
                darkMode={darkMode}
              />
            )}
          </>
        )}

        {/* Badges */}
        {histTab === "badges" && (
          <>
            {achievements === null && <LoadingState dark={dark} />}
            {achievements !== null && (
              <div className="grid grid-cols-2 gap-3">
                {achievements.map(a => (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      a.earned
                        ? dark ? "bg-green-950 border-green-800" : "bg-green-50 border-green-200"
                        : dark ? "bg-gray-800 border-gray-700 opacity-50" : "bg-gray-50 border-gray-100 opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-2">{a.emoji}</div>
                    <div className={`font-bold text-sm mb-1 ${a.earned ? (dark ? "text-green-400" : "text-green-700") : subtextColor}`}>
                      {a.name}
                    </div>
                    <div className={`text-xs leading-relaxed ${subtextColor}`}>{a.desc}</div>
                    {a.earned && (
                      <div className="text-xs font-bold text-green-500 mt-2">✓ Získáno</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SlidePanel>
  );
}

function LoadingState({ dark }) {
  return (
    <div className={`text-center py-12 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Načítám…</div>
  );
}

function EmptyState({ dark, text }) {
  return (
    <div className={`text-center py-12 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>{text}</div>
  );
}

function FilterChip({ active, onClick, dark, label, color, avatar }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
      style={active
        ? { background: color, color: "white" }
        : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
      }
    >
      {avatar && <Avatar user={avatar} size={14} />}
      {label}
    </button>
  );
}

function SessionCard({ session, users, currentUser, dark, textColor, subtextColor, borderColor, rowBg }) {
  const meta = TAB_META[session.letter];
  const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
  const pctColor = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";
  const sessionUser = currentUser?.role === "parent" && users ? users.find(u => u.id === session.user_id) : null;
  const ts = new Date(
    typeof session.timestamp === "string" && !session.timestamp.endsWith("Z") && !session.timestamp.includes("+")
      ? session.timestamp.replace(" ", "T") + "Z"
      : session.timestamp
  );
  const durStr = session.duration_s
    ? `${Math.floor(session.duration_s / 60)}:${String(session.duration_s % 60).padStart(2, "0")}`
    : null;

  return (
    <details className={`mb-2 border rounded-xl overflow-hidden ${dark ? "border-gray-800" : "border-gray-100"}`}>
      <summary className={`flex items-center gap-3 px-4 py-3 cursor-pointer list-none transition-colors ${dark ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg text-white flex-shrink-0"
          style={{ background: meta?.accent ?? "#999" }}
        >
          {meta?.emoji} Po {session.letter}
        </span>
        <span className="font-semibold text-sm" style={{ color: pctColor }}>{pct}%</span>
        <span className={`text-xs ${subtextColor}`}>{session.correct}/{session.total}</span>
        {sessionUser && (
          <span className="flex items-center gap-1.5 text-xs">
            <Avatar user={sessionUser} size={16} />
            <span className={subtextColor}>{sessionUser.name}</span>
          </span>
        )}
        <span className={`ml-auto flex flex-col items-end text-xs ${subtextColor}`}>
          <span>{ts.toLocaleDateString("cs-CZ")} {ts.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
          {durStr && <span className={dark ? "text-gray-600" : "text-gray-300"}>⏱ {durStr}</span>}
        </span>
      </summary>

      {session.mistakes?.length > 0 ? session.mistakes.map((m, i) => (
        <div key={i} className={`px-4 py-3 border-t ${borderColor} ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
          <div className={`text-xs font-serif mb-1 ${subtextColor}`}>{m.sentence}</div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-red-500">Napsáno: <strong>{m.given}</strong></span>
            <span className={dark ? "text-gray-600" : "text-gray-300"}>→</span>
            <span className="text-green-500">Správně: <strong>{m.expected}</strong></span>
          </div>
        </div>
      )) : (
        <div className={`px-4 py-3 border-t ${borderColor} text-green-500 text-sm font-bold ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
          🏆 Žádné chyby!
        </div>
      )}
    </details>
  );
}

function StatsContent({ stats, statsByUser, currentUser, users, sessions, histFilterUser, dark, textColor, subtextColor, borderColor, darkMode }) {
  const LETTERS = Object.keys(TAB_META);

  return (
    <>
      {/* Per-user comparison (parent only) */}
      {currentUser?.role === "parent" && statsByUser && users?.length > 1 && (() => {
        const usersWithData = users.filter(u => statsByUser.some(r => r.user_id === u.id));
        if (usersWithData.length < 2) return null;
        return (
          <div className="mb-6">
            <h3 className={`font-bold text-sm mb-3 ${textColor}`}>Porovnání profilů</h3>
            {LETTERS.filter(l => statsByUser.some(r => r.letter === l)).map(letter => {
              const meta = TAB_META[letter];
              return (
                <div key={letter} className="mb-4">
                  <div className={`text-xs font-semibold mb-2 flex items-center gap-1 ${subtextColor}`}>
                    {meta.emoji} Po {letter}
                  </div>
                  {usersWithData.map(u => {
                    const row = statsByUser.find(r => r.user_id === u.id && r.letter === letter);
                    if (!row) return null;
                    const pct = row.avg_accuracy || 0;
                    const barColor = avatarColor(u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-3 mb-1.5">
                        <Avatar user={u} size={18} />
                        <span className={`text-xs font-semibold min-w-[60px] ${subtextColor}`}>{u.name}</span>
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <span className="text-xs font-bold min-w-[38px] text-right" style={{ color: barColor }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Overall accuracy */}
      <h3 className={`font-bold text-sm mb-3 ${textColor}`}>
        {currentUser?.role === "parent" ? "Celková přesnost" : "Průměrná přesnost"}
      </h3>
      {LETTERS.filter(l => stats.find(s => s.letter === l)).map(letter => {
        const s = stats.find(st => st.letter === letter);
        const meta = TAB_META[letter];
        const pct = s.avg_accuracy || 0;
        const barColor = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";
        return (
          <div key={letter} className="mb-4">
            <div className={`flex items-center justify-between mb-1.5 text-sm`}>
              <span className={`font-semibold flex items-center gap-1.5 ${textColor}`}>
                {meta.emoji} Po {letter}
              </span>
              <span className={subtextColor}>
                <strong style={{ color: barColor }}>{pct}%</strong> · {s.sessions} sez.
              </span>
            </div>
            <div className={`h-2.5 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        );
      })}

      {/* Chart - last 14 days */}
      {sessions && sessions.length > 0 && (() => {
        const tsToDate = ts => new Date(typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+") ? ts.replace(" ", "T") + "Z" : ts);
        const filtered = sessions.filter(s => histFilterUser === null || s.user_id === histFilterUser);
        const byDay = {};
        filtered.forEach(s => {
          const day = tsToDate(s.timestamp).toISOString().slice(0, 10);
          if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
          byDay[day].correct += s.correct;
          byDay[day].total += s.total;
        });
        const days = Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - i));
          return d.toISOString().slice(0, 10);
        });
        const chartData = days.map(day => ({
          day,
          label: new Date(day + "T12:00:00Z").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
          pct: byDay[day] && byDay[day].total > 0 ? Math.round(byDay[day].correct / byDay[day].total * 100) : null,
        }));
        if (!chartData.some(d => d.pct !== null)) return null;
        const BAR_W = 18, GAP = 3, H = 80, TOTAL_W = 14 * (BAR_W + GAP);
        return (
          <div className="mt-6">
            <h3 className={`font-bold text-sm mb-3 ${textColor}`}>Přesnost — posledních 14 dní</h3>
            <svg width="100%" viewBox={`0 0 ${TOTAL_W} ${H + 22}`} style={{ display: "block", overflow: "visible" }}>
              {chartData.map((d, i) => {
                const x = i * (BAR_W + GAP);
                if (d.pct === null) return (
                  <g key={d.day}>
                    <rect x={x} y={H - 4} width={BAR_W} height={4} fill={darkMode ? "#1e293b" : "#e5e7eb"} rx={2} />
                  </g>
                );
                const barH = Math.max(4, Math.round(d.pct * H / 100));
                const color = d.pct >= 80 ? "#27ae60" : d.pct >= 50 ? "#f39c12" : "#e74c3c";
                return (
                  <g key={d.day}>
                    <rect x={x} y={H - barH} width={BAR_W} height={barH} fill={color} rx={3} opacity={0.9} />
                    <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={8} fill={darkMode ? "#4b5563" : "#9ca3af"} fontFamily="Inter, sans-serif">{d.label}</text>
                    <title>{d.day}: {d.pct}%</title>
                  </g>
                );
              })}
              <line x1={0} y1={H} x2={TOTAL_W} y2={H} stroke={darkMode ? "#1e293b" : "#e5e7eb"} strokeWidth={1} />
            </svg>
          </div>
        );
      })()}
    </>
  );
}
