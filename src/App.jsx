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
const AVATAR_COLORS = ["#e74c3c", "#8e44ad", "#27ae60", "#2980b9", "#e67e22", "#16a085", "#d35400", "#7f8c8d"];
const avatarColor = (id) => AVATAR_COLORS[((id ?? 0) - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length];

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
  inputBg: "#f8f9fa",
  inputBorder: "#ddd",
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
  inputBg: "#1e2838",
  inputBorder: "#334455",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const _initDark = localStorage.getItem("vs_dark") === "true";
const _initCount = parseInt(localStorage.getItem("vs_count") || "6");
const _initCats = (() => {
  try {
    const c = JSON.parse(localStorage.getItem("vs_cats"));
    return Array.isArray(c) && c.length > 0 ? c : [...CATEGORY_ORDER];
  } catch { return [...CATEGORY_ORDER]; }
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

async function resizeImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 200;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      const ratio = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  });
}

// ── Avatar component ──────────────────────────────────────────────────────
function Avatar({ user, size = 72, border }) {
  const color = avatarColor(user.id);
  const bStyle = border ? { border: `3px solid ${color}` } : {};
  if (user.avatar) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, ...bStyle }}>
        <img src={user.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={user.name} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 800, flexShrink: 0, ...bStyle }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(_initDark);
  const [sentenceCount, setSentenceCount] = useState(_initCount);
  const [activeCats, setActiveCats] = useState(_initCats);
  const t = darkMode ? DARK : LIGHT;

  // Cvičení
  const [activeTab, setActiveTab] = useState("M");
  const [sentences, setSentences] = useState(() => ({ ...LETTERS_OBJ(null), M: _initM }));
  const [inputs, setInputs] = useState(() => ({ ...LETTERS_OBJ([]), M: _initM.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
  const [checked, setChecked] = useState(() => LETTERS_OBJ(false));
  const [score, setScore] = useState(() => LETTERS_OBJ(null));
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("vs_sound") !== "false");

  // Historie
  const [showHistory, setShowHistory] = useState(false);
  const [histTab, setHistTab] = useState("sessions");
  const [sessions, setSessions] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsByUser, setStatsByUser] = useState(null); // per-user stats pro rodiče
  const [histFilterUser, setHistFilterUser] = useState(null); // null = vše, nebo userId

  // Uživatelé
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("vs_user")); } catch { return null; }
  });
  const [users, setUsers] = useState(null);
  const [showManage, setShowManage] = useState(false);

  // Modály
  const [pinModal, setPinModal] = useState(null);    // user obj
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [profileModal, setProfileModal] = useState(null); // null | "create" | user obj (edit)
  const [profileForm, setProfileForm] = useState({ name: "", role: "child", pin: "", pin2: "", avatar: null });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const avatarInputRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  // ── Persist settings ────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("vs_dark", darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem("vs_count", sentenceCount); }, [sentenceCount]);
  useEffect(() => { localStorage.setItem("vs_cats", JSON.stringify(activeCats)); }, [activeCats]);
  useEffect(() => { localStorage.setItem("vs_sound", soundOn); }, [soundOn]);

  // ── Načtení uživatelů ───────────────────────────────────────────────────
  const loadUsers = useCallback(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (currentUser === null) loadUsers();
  }, [currentUser, loadUsers]);

  // ── Přihlášení / odhlášení ──────────────────────────────────────────────
  const loginUser = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem("vs_user", JSON.stringify(user));
  };

  const handleSelectUser = (user) => {
    if (user.role === "parent") {
      setPinInput("");
      setPinError("");
      setPinModal(user);
    } else {
      loginUser(user);
    }
  };

  const handlePinSubmit = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pinModal.id, pin: pinInput }),
      });
      if (res.ok) {
        const user = await res.json();
        loginUser(user);
        setPinModal(null);
      } else {
        setPinError("Špatný PIN, zkus to znovu.");
      }
    } catch {
      setPinError("Chyba připojení.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("vs_user");
    setShowHistory(false);
    setShowManage(false);
  };

  // ── Správa profilů ──────────────────────────────────────────────────────
  const openCreate = () => {
    setProfileForm({ name: "", role: "child", pin: "", pin2: "", avatar: null });
    setProfileError("");
    setProfileModal("create");
  };

  const openEdit = (user) => {
    setProfileForm({ name: user.name, role: user.role, pin: "", pin2: "", avatar: user.avatar });
    setProfileError("");
    setProfileModal(user);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setProfileForm((prev) => ({ ...prev, avatar: dataUrl }));
    e.target.value = "";
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { setProfileError("Zadej jméno."); return; }
    if (profileForm.role === "parent" && profileModal === "create" && !profileForm.pin) {
      setProfileError("Rodič musí mít PIN."); return;
    }
    if (profileForm.pin && profileForm.pin !== profileForm.pin2) {
      setProfileError("PINy se neshodují."); return;
    }
    setProfileSaving(true);
    setProfileError("");
    try {
      const body = { name: profileForm.name.trim(), role: profileForm.role, avatar: profileForm.avatar };
      if (profileForm.pin) body.pin = profileForm.pin;
      const isEdit = profileModal !== "create";
      const res = await fetch(isEdit ? `/api/users/${profileModal.id}` : "/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      // Pokud upravujeme aktuálně přihlášeného uživatele, aktualizuj session
      if (isEdit && currentUser?.id === profileModal.id) {
        const updated = { ...currentUser, name: body.name, avatar: body.avatar };
        setCurrentUser(updated);
        sessionStorage.setItem("vs_user", JSON.stringify(updated));
      }
      loadUsers();
      setProfileModal(null);
    } catch {
      setProfileError("Nepodařilo se uložit.");
    }
    setProfileSaving(false);
  };

  const handleDeleteProfile = async (user) => {
    if (!window.confirm(`Smazat profil „${user.name}"?`)) return;
    await fetch(`/api/users/${user.id}`, { method: "DELETE" }).catch(() => {});
    loadUsers();
  };

  // ── Zvuk ────────────────────────────────────────────────────────────────
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
        osc.start(); osc.stop(ctx.currentTime + 0.45);
      } else {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  }, [soundOn]);

  // ── Reload při změně nastavení ───────────────────────────────────────────
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

  const loadSentences = useCallback((letter) => {
    const picked = pickSentences(letter, sentenceCount, activeCats);
    setSentences((prev) => ({ ...prev, [letter]: picked }));
    setInputs((prev) => ({ ...prev, [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
    setChecked((prev) => ({ ...prev, [letter]: false }));
    setScore((prev) => ({ ...prev, [letter]: null }));
    sessionStartRef.current = Date.now();
  }, [sentenceCount, activeCats]);

  useEffect(() => {
    if (!sentences[activeTab]) loadSentences(activeTab);
  }, [activeTab, loadSentences, sentences]);

  // ── Vstup ────────────────────────────────────────────────────────────────
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
    const duration_s = Math.round((Date.now() - sessionStartRef.current) / 1000);
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter: activeTab, correct, total, mistakes, userId: currentUser?.id, duration_s }),
    }).catch(() => {});
  }, [sentences, inputs, activeTab, playSound, currentUser]);

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

  // ── Historie ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setSessions(null);
    setStats(null);
    setStatsByUser(null);
    setHistFilterUser(null);
    setShowHistory(true);
    const isParent = currentUser?.role === "parent";
    const uid = currentUser?.id;
    const sesUrl = isParent ? "/api/sessions?limit=200" : `/api/sessions?limit=150&userId=${uid}`;
    const stUrl = isParent ? "/api/stats" : `/api/stats?userId=${uid}`;
    try {
      const fetches = [fetch(sesUrl), fetch(stUrl)];
      if (isParent) fetches.push(fetch("/api/stats?byUser=1"));
      const results = await Promise.all(fetches);
      setSessions(await results[0].json());
      setStats(await results[1].json());
      if (isParent) setStatsByUser(await results[2].json());
    } catch {
      setSessions([]);
      setStats([]);
    }
  }, [currentUser]);

  const exportCSV = () => {
    if (!sessions || sessions.length === 0) return;
    const isParent = currentUser?.role === "parent";
    const header = isParent
      ? "Datum,Čas,Trvání,Profil,Písmeno,Správně,Celkem,Přesnost,Chyby"
      : "Datum,Čas,Trvání,Písmeno,Správně,Celkem,Přesnost,Chyby";
    const rows = sessions.map((s) => {
      const d = new Date(s.timestamp);
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const mistakes = s.mistakes.map((m) => `${m.sentence} (${m.given}→${m.expected})`).join("; ").replace(/"/g, '""');
      const dur = s.duration_s ? `${Math.floor(s.duration_s / 60)}:${String(s.duration_s % 60).padStart(2, "0")}` : "";
      const userName = isParent ? `"${(users?.find((u) => u.id === s.user_id)?.name) ?? "—"}",` : "";
      return `"${d.toLocaleDateString("cs-CZ")}","${d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}","${dur}",${userName}"Po ${s.letter}",${s.correct},${s.total},${pct}%,"${mistakes}"`;
    });
    const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cviceni-vyjmenovana-slova.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
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

  // ── Sdílené styly ─────────────────────────────────────────────────────────
  const sharedCSS = `
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
    .profile-card { background: var(--card-bg); border: 2px solid var(--border); border-radius: 20px; padding: 22px 16px 18px; width: 140px; text-align: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
    .profile-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.14); }
    .modal-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-box { width: 100%; max-width: 380px; border-radius: 20px; padding: 28px 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.25); }
    .form-input { width: 100%; padding: 10px 14px; border-radius: 10px; font-family: 'Nunito', sans-serif; font-size: 1rem; outline: none; transition: border-color 0.2s; }
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
      .header-btns { position: static !important; margin-top: 10px; justify-content: center; }
      .profile-card { width: 120px; padding: 16px 10px 14px; }
    }
  `;

  const rootStyle = {
    minHeight: "100vh",
    background: t.appBg,
    fontFamily: "Georgia, serif",
    "--card-bg": t.cardBg,
    "--border": t.border,
  };

  // ── Modál pro PIN ─────────────────────────────────────────────────────────
  const pinModalEl = pinModal && (
    <div className="modal-overlay" style={{ background: t.overlayBg }} onClick={() => setPinModal(null)}>
      <div className="modal-box" style={{ background: t.cardBg }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Avatar user={pinModal} size={64} border />
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: t.text, marginTop: 12 }}>
            {pinModal.name}
          </div>
          <div style={{ color: t.subtext, fontSize: "0.88rem", marginTop: 4 }}>Zadej PIN</div>
        </div>
        <input
          className="form-input"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="••••"
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
          autoFocus
          style={{ background: t.inputBg, border: `2px solid ${t.inputBorder}`, color: t.text, textAlign: "center", fontSize: "1.4rem", letterSpacing: "0.5em", marginBottom: 8 }}
        />
        {pinError && <div style={{ color: "#e74c3c", fontSize: "0.85rem", fontFamily: "'Nunito', sans-serif", textAlign: "center", marginBottom: 8 }}>{pinError}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button className="check-btn" onClick={() => setPinModal(null)} style={{ flex: 1, background: t.pillBg, color: t.pillText, padding: "10px" }}>Zrušit</button>
          <button className="check-btn" onClick={handlePinSubmit} style={{ flex: 1, background: avatarColor(pinModal.id), color: "white", padding: "10px" }}>Vstoupit</button>
        </div>
      </div>
    </div>
  );

  // ── Modál pro profil (vytvoření / úprava) ─────────────────────────────────
  const profileModalEl = profileModal && (
    <div className="modal-overlay" style={{ background: t.overlayBg }} onClick={() => setProfileModal(null)}>
      <div className="modal-box" style={{ background: t.cardBg }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: t.text, marginBottom: 20 }}>
          {profileModal === "create" ? "Nový profil" : `Upravit: ${profileModal.name}`}
        </div>

        {/* Avatar upload */}
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div onClick={() => avatarInputRef.current?.click()} style={{ cursor: "pointer", position: "relative" }}>
            {profileForm.avatar ? (
              <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `3px solid ${t.borderMid}` }}>
                <img src={profileForm.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
              </div>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: t.chipInactiveBg, border: `3px dashed ${t.borderMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>
                📷
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, background: t.cardBg, border: `2px solid ${t.borderMid}`, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>
              ✏️
            </div>
          </div>
        </div>

        {/* Jméno */}
        <input
          className="form-input"
          placeholder="Jméno"
          value={profileForm.name}
          onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
          style={{ background: t.inputBg, border: `2px solid ${t.inputBorder}`, color: t.text, marginBottom: 10 }}
        />

        {/* Role */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["child", "parent"].map((role) => (
            <button
              key={role}
              className="chip-btn"
              onClick={() => setProfileForm((p) => ({ ...p, role }))}
              style={{ flex: 1, padding: "8px", background: profileForm.role === role ? "#2980b9" : t.chipInactiveBg, color: profileForm.role === role ? "white" : t.chipInactiveText }}
            >
              {role === "child" ? "👦 Dítě" : "🔒 Rodič"}
            </button>
          ))}
        </div>

        {/* PIN (jen pro rodiče) */}
        {profileForm.role === "parent" && (
          <>
            <input
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={profileModal === "create" ? "PIN (4 číslice)" : "Nový PIN (nechej prázdné = beze změny)"}
              value={profileForm.pin}
              onChange={(e) => setProfileForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              style={{ background: t.inputBg, border: `2px solid ${t.inputBorder}`, color: t.text, marginBottom: 8, textAlign: "center", letterSpacing: "0.4em" }}
            />
            {profileForm.pin && (
              <input
                className="form-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Potvrď PIN"
                value={profileForm.pin2}
                onChange={(e) => setProfileForm((p) => ({ ...p, pin2: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                style={{ background: t.inputBg, border: `2px solid ${t.inputBorder}`, color: t.text, marginBottom: 8, textAlign: "center", letterSpacing: "0.4em" }}
              />
            )}
          </>
        )}

        {profileError && <div style={{ color: "#e74c3c", fontSize: "0.85rem", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>{profileError}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button className="check-btn" onClick={() => setProfileModal(null)} style={{ flex: 1, background: t.pillBg, color: t.pillText, padding: "10px" }}>Zrušit</button>
          <button className="check-btn" onClick={handleSaveProfile} disabled={profileSaving} style={{ flex: 1, background: "#2980b9", color: "white", padding: "10px" }}>
            {profileSaving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Obrazovka výběru profilu ───────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div data-dark={darkMode ? "true" : "false"} style={{ ...rootStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <style>{sharedCSS}</style>
        <div style={{ position: "fixed", top: 16, right: 16, display: "flex", gap: 8 }}>
          <button onClick={() => setDarkMode((d) => !d)} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.pillText, cursor: "pointer" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div style={{ fontSize: "2.4rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, letterSpacing: "-1px", marginBottom: 6 }}>
          Vyjmenovaná slova
        </div>
        <div style={{ fontSize: "0.95rem", color: t.subtext, fontFamily: "'Lora', serif", fontStyle: "italic", marginBottom: 40 }}>
          Kdo dnes cvičí?
        </div>

        {users === null && (
          <div style={{ color: t.subtext, fontFamily: "'Nunito', sans-serif" }}>Načítám…</div>
        )}

        {users !== null && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 700 }}>
            {users.map((user) => (
              <div key={user.id} className="profile-card" onClick={() => handleSelectUser(user)}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Avatar user={user} size={72} border />
                </div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1rem", color: t.text, marginBottom: 2 }}>
                  {user.name}
                </div>
                {user.role === "parent" && (
                  <div style={{ fontSize: "0.78rem", color: t.subtext, fontFamily: "'Nunito', sans-serif" }}>🔒 Rodič</div>
                )}
              </div>
            ))}

            {/* Přidat profil */}
            <div className="profile-card" onClick={openCreate} style={{ border: `2px dashed ${t.borderMid}`, cursor: "pointer" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: t.chipInactiveBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 12px" }}>
                +
              </div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: t.subtext }}>
                Přidat profil
              </div>
            </div>
          </div>
        )}

        {pinModalEl}
        {profileModalEl}
      </div>
    );
  }

  // ── Správa profilů (přístupná pro rodiče) ─────────────────────────────────
  const managePanel = showManage && (
    <div className="history-overlay" style={{ background: t.overlayBg }} onClick={() => setShowManage(false)}>
      <div className="history-panel" style={{ background: t.panelBg }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.panelBg, position: "sticky", top: 0, zIndex: 1 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: t.text }}>⚙️ Profily</span>
          <button onClick={() => setShowManage(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: t.subtext }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {(users || []).map((user) => (
            <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
              <Avatar user={user} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "0.95rem" }}>{user.name}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: t.subtext }}>{user.role === "parent" ? "🔒 Rodič" : "👦 Dítě"}</div>
              </div>
              <button className="chip-btn" onClick={() => openEdit(user)} style={{ background: t.chipInactiveBg, color: t.chipInactiveText }}>✏️</button>
              {user.id !== currentUser.id && (
                <button className="chip-btn" onClick={() => handleDeleteProfile(user)} style={{ background: "#f8d7da", color: "#721c24" }}>🗑</button>
              )}
            </div>
          ))}
          <button className="check-btn" onClick={openCreate} style={{ marginTop: 16, width: "100%", background: "#2980b9", color: "white" }}>
            + Přidat profil
          </button>
        </div>
        {profileModalEl}
      </div>
    </div>
  );

  // ── Hlavní UI ────────────────────────────────────────────────────────────
  return (
    <div data-dark={darkMode ? "true" : "false"} style={{ ...rootStyle, padding: "24px 16px" }}>
      <style>{sharedCSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, letterSpacing: "-1px" }}>
            Vyjmenovaná slova
          </div>
          <div style={{ fontSize: "0.95rem", color: t.subtext, fontFamily: "'Lora', serif", fontStyle: "italic", marginTop: 4 }}>
            Doplň správně <strong>i</strong> nebo <strong>y</strong> (popřípadě <strong>í / ý</strong>)
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {/* Levá strana: uživatel + správa */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div onClick={handleLogout} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "5px 10px 5px 6px" }} title="Odhlásit / Změnit uživatele">
              <Avatar user={currentUser} size={26} />
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.85rem", color: t.pillText }}>{currentUser.name}</span>
            </div>
            {currentUser.role === "parent" && (
              <button onClick={() => { loadUsers(); setShowManage(true); }} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: t.pillText, cursor: "pointer" }}>
                ⚙️
              </button>
            )}
          </div>
          {/* Pravá strana: akce */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setSoundOn((s) => !s)} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: t.pillText, cursor: "pointer" }}>
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button onClick={() => setDarkMode((d) => !d)} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: t.pillText, cursor: "pointer" }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button onClick={loadHistory} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: t.pillText, cursor: "pointer" }}>
              📊 Historie
            </button>
          </div>
        </div>
      </div>

      {/* Letter tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(TAB_META).map(([letter, meta]) => (
          <button
            key={letter}
            className="tab-btn"
            onClick={() => setActiveTab(letter)}
            style={{ background: activeTab === letter ? meta.accent : t.tabInactiveBg, color: activeTab === letter ? "white" : meta.accent, borderColor: meta.accent, boxShadow: activeTab === letter ? `0 4px 14px ${meta.accent}55` : "0 2px 6px rgba(0,0,0,0.08)" }}
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

      {/* Settings bar */}
      <div style={{ maxWidth: 700, margin: "0 auto 16px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "10px 16px", background: t.settingsBg, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", fontWeight: 700, color: t.subtext, whiteSpace: "nowrap" }}>Vět:</span>
          {COUNTS.map((n) => (
            <button key={n} className="chip-btn" onClick={() => setSentenceCount(n)} style={{ background: sentenceCount === n ? data.accent : t.chipInactiveBg, color: sentenceCount === n ? "white" : t.chipInactiveText }}>{n}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: t.border, flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", fontWeight: 700, color: t.subtext, whiteSpace: "nowrap" }}>Typ:</span>
          {CATEGORY_ORDER.map((cat) => {
            const active = activeCats.includes(cat);
            return (
              <button key={cat} className="chip-btn" onClick={() => toggleCat(cat)} style={{ background: active ? t.chipActiveBg : t.chipInactiveBg, color: active ? t.chipActiveText : t.chipInactiveText, textDecoration: active ? "none" : "line-through" }}>
                {CAT_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise card */}
      <div style={{ maxWidth: 700, margin: "0 auto", "--accent": data.accent }}>
        <div style={{ background: t.cardBg, borderRadius: 20, padding: "26px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.7rem" }}>{data.emoji}</span>
                <span style={{ fontSize: "1.15rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: data.color }}>Po {activeTab}</span>
              </div>
              {bankSummary && (
                <div style={{ marginTop: 4, fontSize: "0.8rem", fontFamily: "'Nunito', sans-serif", color: t.subtext }}>
                  Databáze: {bankSummary.total} / {bankSummary.targetTotal} vět
                </div>
              )}
            </div>
            <button className="check-btn" onClick={() => loadSentences(activeTab)} style={{ background: numBg, color: data.accent, fontSize: "0.88rem", padding: "7px 16px", border: `2px solid ${data.accent}` }}>
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
                  {(() => {
                    const result = [];
                    let pi = 0;
                    while (pi < partsWithIdx.length) {
                      const p = partsWithIdx[pi];
                      if ("blank" in p) {
                        const { bi, blank } = p;
                        const val = inputs[activeTab]?.[si]?.[bi] || "";
                        const isWrong = checked[activeTab] && val.toLowerCase() !== blank.toLowerCase();
                        const isCorrect = checked[activeTab] && val.toLowerCase() === blank.toLowerCase();
                        result.push(
                          <span key={pi} style={{ whiteSpace: "nowrap" }}>
                            <input className={`blank-input${isWrong ? " anim-wrong" : isCorrect ? " anim-correct" : ""}`} value={val} onChange={(e) => handleInput(si, bi, e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkAnswers()} maxLength={2} style={blankStyle(si, bi, blank)} />
                            {isWrong && <span className="hint">({blank})</span>}
                          </span>
                        );
                        pi++; continue;
                      }
                      const nextP = partsWithIdx[pi + 1];
                      if (!nextP || "text" in nextP) { result.push(<span key={pi} style={{ color: t.text }}>{p.text}</span>); pi++; continue; }
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
                          {textBefore && <span style={{ color: t.text }}>{textBefore}</span>}
                          <span style={{ whiteSpace: "nowrap" }}>
                            {wordBefore && <span style={{ color: t.text }}>{wordBefore}</span>}
                            <input className={`blank-input${isWrong ? " anim-wrong" : isCorrect ? " anim-correct" : ""}`} value={val} onChange={(e) => handleInput(si, bi, e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkAnswers()} maxLength={2} style={blankStyle(si, bi, blank)} />
                            {isWrong && <span className="hint">({blank})</span>}
                            {wordAfter && <span style={{ color: t.text }}>{wordAfter}</span>}
                          </span>
                          {textAfter && <span style={{ color: t.text }}>{textAfter}</span>}
                        </span>
                      );
                      pi += advance;
                    }
                    return result;
                  })()}
                </span>
              </div>
            );
          })}

          {checked[activeTab] && score[activeTab] && (() => {
            const { correct, total } = score[activeTab];
            const bg = correct === total ? t.scoreGood : correct >= Math.ceil(total / 2) ? t.scoreMid : t.scoreBad;
            return (
              <div style={{ margin: "18px 0 14px", textAlign: "center", padding: 14, borderRadius: 12, background: bg }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 2 }}>{correct === total ? "🏆" : correct >= 4 ? "🌟" : "💪"}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "1.05rem" }}>
                  {correct} / {total} správně{" "}
                  {correct === total ? "Perfektní!" : correct >= 4 ? "Výborně!" : "Zkus to znovu!"}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            <button className="check-btn" onClick={checkAnswers} disabled={!currentSentences} style={{ background: data.accent, color: "white" }}>✓ Zkontrolovat</button>
            <button className="check-btn" onClick={clearInputs} style={{ background: t.pillBg, color: t.pillText }}>↺ Vymazat</button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: "0.82rem", color: t.muted, fontStyle: "italic", fontFamily: "'Lora', serif" }}>
          Nové věty = náhodný výběr z místní databáze.
        </div>
      </div>

      {/* Historie panel */}
      {showHistory && (
        <div className="history-overlay" style={{ background: t.overlayBg }} onClick={() => setShowHistory(false)}>
          <div className="history-panel" style={{ background: t.panelBg }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.panelBg, position: "sticky", top: 0, zIndex: 1 }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: t.text }}>📊 Přehled</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {histTab === "sessions" && sessions && sessions.length > 0 && (
                  <button onClick={exportCSV} style={{ background: t.pillBg, border: `1px solid ${t.borderMid}`, borderRadius: 8, padding: "5px 12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: t.subtext, cursor: "pointer" }}>⬇ CSV</button>
                )}
                <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: t.subtext, lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, padding: "0 20px", background: t.panelBg, position: "sticky", top: 57, zIndex: 1 }}>
              {[["sessions", "Sezení"], ["stats", "Statistiky"]].map(([key, label]) => (
                <button key={key} onClick={() => setHistTab(key)} style={{ background: "none", border: "none", borderBottom: histTab === key ? `3px solid ${data.accent}` : "3px solid transparent", padding: "10px 16px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: histTab === key ? data.accent : t.subtext, cursor: "pointer", marginBottom: -1 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 20px", flex: 1 }}>
              {histTab === "sessions" && (
                <>
                  {sessions === null && <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>}
                  {sessions !== null && sessions.length === 0 && <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Žádná cvičení zatím nebyla uložena.</div>}
                  {/* Filtr podle profilu — jen pro rodiče */}
                  {sessions !== null && sessions.length > 0 && currentUser.role === "parent" && users && users.length > 1 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      <button className="chip-btn" onClick={() => setHistFilterUser(null)} style={{ background: histFilterUser === null ? data.accent : t.chipInactiveBg, color: histFilterUser === null ? "white" : t.chipInactiveText }}>
                        Všichni
                      </button>
                      {users.map((u) => (
                        <button key={u.id} className="chip-btn" onClick={() => setHistFilterUser(histFilterUser === u.id ? null : u.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: histFilterUser === u.id ? avatarColor(u.id) : t.chipInactiveBg, color: histFilterUser === u.id ? "white" : t.chipInactiveText }}>
                          <Avatar user={u} size={16} />
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {sessions !== null && sessions
                    .filter((s) => histFilterUser === null || s.user_id === histFilterUser)
                    .map((session) => {
                    const meta = TAB_META[session.letter];
                    const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
                    const date = new Date(session.timestamp);
                    const sessionUser = currentUser.role === "parent" && users ? users.find((u) => u.id === session.user_id) : null;
                    const durStr = session.duration_s ? `⏱ ${Math.floor(session.duration_s / 60)}:${String(session.duration_s % 60).padStart(2, "0")}` : null;
                    return (
                      <details key={session.id} className="session-card" style={{ border: `1px solid ${t.border}` }}>
                        <summary className="session-header" style={{ listStyle: "none" }}>
                          <span style={{ background: meta?.accent ?? "#999", color: "white", borderRadius: 8, padding: "3px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.9rem" }}>{meta?.emoji} Po {session.letter}</span>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.88rem", color: t.text, fontWeight: 700 }}>
                            {session.correct}/{session.total}
                            <span style={{ marginLeft: 5, color: pct === 100 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c", fontWeight: 800 }}>{pct}%</span>
                          </span>
                          {sessionUser && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: t.subtext, fontFamily: "'Nunito', sans-serif" }}>
                              <Avatar user={sessionUser} size={16} />
                              {sessionUser.name}
                            </span>
                          )}
                          <span style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext }}>{date.toLocaleDateString("cs-CZ")} {date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                            {durStr && <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.75rem", color: t.muted }}>{durStr}</span>}
                          </span>
                        </summary>
                        {session.mistakes.length > 0 ? session.mistakes.map((m, i) => (
                          <div key={i} className="mistake-row" style={{ borderTop: `1px solid ${t.border}`, background: t.mistakeBg }}>
                            <div style={{ color: t.subtext, marginBottom: 3 }}>{m.sentence}</div>
                            <div style={{ fontSize: "0.82rem", fontFamily: "'Nunito', sans-serif" }}>
                              <span style={{ color: "#e74c3c" }}>Napsáno: <strong>{m.given}</strong></span>
                              <span style={{ margin: "0 8px", color: t.muted }}>→</span>
                              <span style={{ color: "#27ae60" }}>Správně: <strong>{m.expected}</strong></span>
                            </div>
                          </div>
                        )) : (
                          <div className="mistake-row" style={{ borderTop: `1px solid ${t.border}`, background: t.mistakeBg, color: "#27ae60", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>🏆 Žádné chyby!</div>
                        )}
                      </details>
                    );
                  })}
                </>
              )}
              {histTab === "stats" && (
                <>
                  {stats === null && <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>}
                  {stats !== null && stats.length === 0 && <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Zatím žádná data.</div>}
                  {stats !== null && stats.length > 0 && (
                    <>
                      {/* Per-profil porovnání (jen pro rodiče s více uživateli) */}
                      {currentUser.role === "parent" && statsByUser && users && users.length > 1 && (() => {
                        const usersWithData = users.filter((u) => statsByUser.some((r) => r.user_id === u.id));
                        if (usersWithData.length < 2) return null;
                        return (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 14, fontSize: "1rem" }}>Porovnání profilů</div>
                            {LETTERS.filter((l) => statsByUser.some((r) => r.letter === l)).map((letter) => {
                              const meta = TAB_META[letter];
                              return (
                                <div key={letter} style={{ marginBottom: 14 }}>
                                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.subtext, fontSize: "0.82rem", marginBottom: 5 }}>{meta.emoji} Po {letter}</div>
                                  {usersWithData.map((u) => {
                                    const row = statsByUser.find((r) => r.user_id === u.id && r.letter === letter);
                                    if (!row) return null;
                                    const pct = row.avg_accuracy || 0;
                                    const barColor = avatarColor(u.id);
                                    return (
                                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <Avatar user={u} size={18} />
                                        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: t.text, minWidth: 60 }}>{u.name}</span>
                                        <div style={{ flex: 1, height: 8, background: t.barTrack, borderRadius: 4, overflow: "hidden" }}>
                                          <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 4, transition: "width 0.6s ease" }} />
                                        </div>
                                        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", fontWeight: 800, color: barColor, minWidth: 38, textAlign: "right" }}>{pct}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 14, fontSize: "1rem" }}>
                        {currentUser.role === "parent" ? "Celková přesnost (vše)" : "Průměrná přesnost"}
                      </div>
                      {LETTERS.filter((l) => stats.find((s) => s.letter === l)).map((letter) => {
                        const s = stats.find((st) => st.letter === letter);
                        const meta = TAB_META[letter];
                        const pct = s.avg_accuracy || 0;
                        const barColor = pct >= 90 ? "#27ae60" : pct >= 70 ? "#f39c12" : "#e74c3c";
                        return (
                          <div key={letter} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "0.92rem" }}>{meta.emoji} Po {letter}</span>
                              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext }}><strong style={{ color: barColor }}>{pct}%</strong> · {s.sessions} sez.</span>
                            </div>
                            <div style={{ height: 10, background: t.barTrack, borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 5, transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ marginTop: 24, padding: "14px 16px", background: t.rowBg, borderRadius: 12, border: `1px solid ${t.border}` }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 10, fontSize: "0.88rem" }}>Celkové součty</div>
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

      {managePanel}
      {pinModalEl}
      {profileModalEl}
    </div>
  );
}
