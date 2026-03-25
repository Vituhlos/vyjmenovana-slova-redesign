import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getAchievements, getSessions, getStats, getStatsByUser } from "../../lib/api";
import { avatarColor, LETTERS, TAB_META } from "../../lib/theme";
import { formatDateTime } from "../../lib/sentences";
import Avatar from "../../components/ui/Avatar/Avatar";
import styles from "./History.module.css";

export default function History() {
  const { currentUser, users } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsByUser, setStatsByUser] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [filterUser, setFilterUser] = useState(null);

  const isParent = currentUser?.role === "parent";

  const load = useCallback(async () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    try {
      const fetches = [
        getSessions(uid, isParent),
        getStats(uid, isParent),
        getAchievements(uid),
      ];
      if (isParent) fetches.push(getStatsByUser());
      const [ses, st, ach, stByUser] = await Promise.all(fetches);
      setSessions(ses);
      setStats(st);
      setAchievements(ach);
      if (stByUser) setStatsByUser(stByUser);
    } catch {
      setSessions([]);
      setStats([]);
      setAchievements([]);
    }
  }, [currentUser, isParent]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!sessions || sessions.length === 0) return;
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const toDate = (ts) =>
      new Date(
        typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+")
          ? ts.replace(" ", "T") + "Z"
          : ts
      );
    const header = isParent
      ? ["Datum", "Čas", "Trvání", "Profil", "Písmeno", "Správně", "Celkem", "Přesnost", "Stav", "Věta", "Napsáno", "Správně má být"]
      : ["Datum", "Čas", "Trvání", "Písmeno", "Správně", "Celkem", "Přesnost", "Stav", "Věta", "Napsáno", "Správně má být"];
    const rows = sessions.flatMap((s) => {
      const d = toDate(s.timestamp);
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const dur = s.duration_s
        ? `${Math.floor(s.duration_s / 60)}:${String(s.duration_s % 60).padStart(2, "0")}`
        : "";
      const base = [
        d.toLocaleDateString("cs-CZ"),
        d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        dur,
        ...(isParent ? [(users?.find((u) => u.id === s.user_id)?.name) ?? "—"] : []),
        `Po ${s.letter}`,
        s.correct, s.total, `${pct}%`,
      ];
      if (!s.mistakes || s.mistakes.length === 0) {
        return [[...base, "Bez chyby", "", "", ""].map(escape).join(",")];
      }
      return s.mistakes.map((m) =>
        [...base, "Chyba", m.sentence, m.given, m.expected].map(escape).join(",")
      );
    });
    const blob = new Blob(
      ["\uFEFF" + [header.map(escape).join(","), ...rows].join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cviceni-vyjmenovana-slova.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredSessions = (sessions || []).filter(
    (s) => filterUser === null || s.user_id === filterUser
  );

  return (
    <div className={styles.page}>
      {/* Back header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/quiz")}>
          ← Zpět
        </button>
        <h1 className={styles.pageTitle}>📊 Přehled</h1>
        <div className={styles.headerRight}>
          {tab === "sessions" && sessions?.length > 0 && (
            <button className={`chip chip-inactive ${styles.csvBtn}`} onClick={exportCSV}>
              ⬇ CSV
            </button>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <nav className={styles.tabBar}>
        {[["sessions", "Sezení"], ["stats", "Statistiky"], ["badges", "🏅 Odznaky"]].map(
          ([key, label]) => (
            <button
              key={key}
              className={`${styles.tabBtn} ${tab === key ? styles.tabActive : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          )
        )}
      </nav>

      <main className={styles.main}>
        {/* ── Sessions ── */}
        {tab === "sessions" && (
          <>
            {sessions === null && <div className={styles.loading}>Načítám…</div>}
            {sessions !== null && sessions.length === 0 && (
              <div className={styles.empty}>Žádná cvičení zatím nebyla uložena.</div>
            )}

            {/* User filter (parent) */}
            {isParent && sessions?.length > 0 && users && users.length > 1 && (
              <div className={styles.filterRow}>
                <button
                  className={`chip ${filterUser === null ? styles.filterActive : "chip-inactive"}`}
                  onClick={() => setFilterUser(null)}
                >
                  Všichni
                </button>
                {users.map((u) => (
                  <button
                    key={u.id}
                    className={`chip ${filterUser === u.id ? styles.filterActive : "chip-inactive"}`}
                    style={filterUser === u.id ? { background: avatarColor(u.id), color: "white" } : {}}
                    onClick={() => setFilterUser(filterUser === u.id ? null : u.id)}
                  >
                    <Avatar user={u} size={16} />
                    {u.name}
                  </button>
                ))}
              </div>
            )}

            {filteredSessions.map((session) => {
              const meta = TAB_META[session.letter];
              const pct = session.total > 0
                ? Math.round((session.correct / session.total) * 100)
                : 0;
              const date = new Date(
                typeof session.timestamp === "string" &&
                !session.timestamp.endsWith("Z") &&
                !session.timestamp.includes("+")
                  ? session.timestamp.replace(" ", "T") + "Z"
                  : session.timestamp
              );
              const sessionUser =
                isParent && users
                  ? users.find((u) => u.id === session.user_id)
                  : null;
              const durStr = session.duration_s
                ? `⏱ ${Math.floor(session.duration_s / 60)}:${String(session.duration_s % 60).padStart(2, "0")}`
                : null;
              const pctColor = pct === 100 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";

              return (
                <details key={session.id} className={styles.sessionCard}>
                  <summary className={styles.sessionHeader}>
                    <span
                      className={styles.letterBadge}
                      style={{ background: meta?.accent ?? "#999" }}
                    >
                      {meta?.emoji} Po {session.letter}
                    </span>
                    <span className={styles.sessionScore}>
                      {session.correct}/{session.total}
                      <span style={{ marginLeft: 6, color: pctColor, fontWeight: 800 }}>
                        {pct}%
                      </span>
                    </span>
                    {sessionUser && (
                      <span className={styles.sessionUser}>
                        <Avatar user={sessionUser} size={16} />
                        {sessionUser.name}
                      </span>
                    )}
                    <span className={styles.sessionMeta}>
                      <span>{date.toLocaleDateString("cs-CZ")} {date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                      {durStr && <span className={styles.dur}>{durStr}</span>}
                    </span>
                  </summary>

                  <div className={styles.mistakesArea}>
                    {session.mistakes?.length > 0 ? (
                      session.mistakes.map((m, i) => (
                        <div key={i} className={styles.mistakeRow}>
                          <div className={styles.mistakeSentence}>{m.sentence}</div>
                          <div className={styles.mistakeDetail}>
                            <span className={styles.wrong}>Napsáno: <strong>{m.given}</strong></span>
                            <span className={styles.arrow}>→</span>
                            <span className={styles.correct}>Správně: <strong>{m.expected}</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.noMistakes}>🏆 Žádné chyby!</div>
                    )}
                  </div>
                </details>
              );
            })}
          </>
        )}

        {/* ── Statistics ── */}
        {tab === "stats" && (
          <>
            {stats === null && <div className={styles.loading}>Načítám…</div>}
            {stats !== null && stats.length === 0 && (
              <div className={styles.empty}>Zatím žádná data.</div>
            )}
            {stats !== null && stats.length > 0 && (
              <>
                {/* Per-profile comparison (parent) */}
                {isParent && statsByUser && users && users.length > 1 && (() => {
                  const usersWithData = users.filter((u) =>
                    statsByUser.some((r) => r.user_id === u.id)
                  );
                  if (usersWithData.length < 2) return null;
                  return (
                    <div className={styles.section}>
                      <div className={styles.sectionTitle}>Porovnání profilů</div>
                      {LETTERS.filter((l) => statsByUser.some((r) => r.letter === l)).map((letter) => (
                        <div key={letter} className={styles.compareBlock}>
                          <div className={styles.compareLabel}>
                            {TAB_META[letter].emoji} Po {letter}
                          </div>
                          {usersWithData.map((u) => {
                            const row = statsByUser.find(
                              (r) => r.user_id === u.id && r.letter === letter
                            );
                            if (!row) return null;
                            const pct = row.avg_accuracy || 0;
                            const color = avatarColor(u.id);
                            return (
                              <div key={u.id} className={styles.barRow}>
                                <Avatar user={u} size={18} />
                                <span className={styles.barName}>{u.name}</span>
                                <div className={styles.barTrack}>
                                  <div
                                    className={styles.barFill}
                                    style={{ width: `${pct}%`, background: color }}
                                  />
                                </div>
                                <span style={{ color }} className={styles.barPct}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Overall accuracy */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    {isParent ? "Celková přesnost (vše)" : "Průměrná přesnost"}
                  </div>
                  {LETTERS.filter((l) => stats.find((s) => s.letter === l)).map((letter) => {
                    const s = stats.find((st) => st.letter === letter);
                    const pct = s.avg_accuracy || 0;
                    const color = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";
                    return (
                      <div key={letter} className={styles.statRow}>
                        <div className={styles.statHeader}>
                          <span className={styles.statLabel}>
                            {TAB_META[letter].emoji} Po {letter}
                          </span>
                          <span className={styles.statRight}>
                            <strong style={{ color }}>{pct}%</strong>
                            {" · "}{s.sessions} sez.
                          </span>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className={styles.totalsCard}>
                  <div className={styles.sectionTitle}>Celkové součty</div>
                  {stats.map((s) => (
                    <div key={s.letter} className={styles.totalRow}>
                      <span>{TAB_META[s.letter]?.emoji} Po {s.letter}</span>
                      <span>{s.total_correct} / {s.total_blanks} správně</span>
                    </div>
                  ))}
                </div>

                {/* 14-day chart */}
                {sessions?.length > 0 && (() => {
                  const toD = (ts) =>
                    new Date(
                      typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+")
                        ? ts.replace(" ", "T") + "Z"
                        : ts
                    );
                  const filtered = sessions.filter(
                    (s) => filterUser === null || s.user_id === filterUser
                  );
                  const byDay = {};
                  filtered.forEach((s) => {
                    const day = toD(s.timestamp).toISOString().slice(0, 10);
                    if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
                    byDay[day].correct += s.correct;
                    byDay[day].total += s.total;
                  });
                  const days = Array.from({ length: 14 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (13 - i));
                    return d.toISOString().slice(0, 10);
                  });
                  const chartData = days.map((day) => ({
                    day,
                    label: new Date(day + "T12:00:00Z").toLocaleDateString("cs-CZ", {
                      day: "numeric",
                      month: "numeric",
                    }),
                    pct:
                      byDay[day] && byDay[day].total > 0
                        ? Math.round((byDay[day].correct / byDay[day].total) * 100)
                        : null,
                  }));
                  if (!chartData.some((d) => d.pct !== null)) return null;
                  const BAR_W = 18, GAP = 3, H = 80, TOTAL_W = 14 * (BAR_W + GAP);
                  return (
                    <div className={styles.section}>
                      <div className={styles.sectionTitle}>Přesnost — posledních 14 dní</div>
                      <svg
                        width="100%"
                        viewBox={`0 0 ${TOTAL_W} ${H + 22}`}
                        style={{ display: "block", overflow: "visible" }}
                      >
                        {chartData.map((d, i) => {
                          const x = i * (BAR_W + GAP);
                          if (d.pct === null)
                            return (
                              <g key={d.day}>
                                <rect x={x} y={H - 4} width={BAR_W} height={4}
                                  fill={darkMode ? "#253040" : "#eee"} rx={2} />
                              </g>
                            );
                          const barH = Math.max(4, Math.round((d.pct * H) / 100));
                          const color =
                            d.pct >= 80 ? "#27ae60" : d.pct >= 50 ? "#f39c12" : "#e74c3c";
                          return (
                            <g key={d.day}>
                              <rect x={x} y={H - barH} width={BAR_W} height={barH}
                                fill={color} rx={3} opacity={0.9} />
                              <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle"
                                fontSize={8} fill={darkMode ? "#6d88a0" : "#aaa"}
                                fontFamily="Nunito, sans-serif">
                                {d.label}
                              </text>
                              <title>{d.day}: {d.pct}%</title>
                            </g>
                          );
                        })}
                        <line x1={0} y1={H} x2={TOTAL_W} y2={H}
                          stroke={darkMode ? "#253040" : "#ddd"} strokeWidth={1} />
                      </svg>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* ── Badges ── */}
        {tab === "badges" && (
          <>
            {achievements === null && <div className={styles.loading}>Načítám…</div>}
            {achievements !== null && (
              <div className={styles.badgesGrid}>
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`${styles.badge} ${a.earned ? styles.badgeEarned : styles.badgeLocked}`}
                  >
                    <div className={styles.badgeEmoji}>{a.emoji}</div>
                    <div className={styles.badgeName}>{a.name}</div>
                    <div className={styles.badgeDesc}>{a.desc}</div>
                    {a.earned && <div className={styles.badgeCheck}>✓ Získáno</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
