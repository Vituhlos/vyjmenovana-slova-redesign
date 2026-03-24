import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER, SENTENCE_BANK, getBankSummary, getSentencePoolByCategories } from "./sentenceBank";

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
const SELECTABLE_CATS = CATEGORY_ORDER.filter((c) => c !== "trickQuestions");
const _initCats = (() => {
  try {
    const c = JSON.parse(localStorage.getItem("vs_cats"));
    return Array.isArray(c) && c.length > 0 ? c.filter((x) => x !== "trickQuestions") : [...SELECTABLE_CATS];
  } catch { return [...SELECTABLE_CATS]; }
})();

const TAHAK_DATA = {
  M: { words: ["my", "mýt", "mýdlo", "hmyz", "myš", "hlemýžď", "přemýšlet", "zamykat", "omyl", "dmýchat", "smýkat", "chm-ý-ří", "mýtit"], tricky: ["mísa", "místo", "mistr", "milý", "minuta", "míč", "minout"] },
  P: { words: ["pytel", "pýcha", "pysk", "pyl", "kopýto", "netopýr", "klopýtat", "pytlík"], tricky: ["pilný", "pilot", "piknik", "pivoňka", "pila", "píle", "píseň", "píšťalka", "písmo", "písek"] },
  L: { words: ["lyže", "lýtko", "lysý", "lyra", "pelyněk", "plytký", "blýskat", "polykat", "plynout", "plýtvat", "vzlykat", "palyhy"], tricky: ["líný", "líbí", "list", "lípa", "liška", "líčko", "lístek", "limonáda"] },
  B: { words: ["bydlet", "byt", "bylina", "býk", "kobyla", "obyčej", "bystrý", "obyvatel", "nábytek", "dobytek"], tricky: ["bílý", "bitva", "bič", "bizon", "bicykl", "bída", "bílek"] },
  F: { words: ["fyzika", "fyzický", "fyzioterapeut", "fyzioterapie", "fyziologie", "fyzikální"], tricky: ["firma", "film", "fialový", "fikus", "figura", "finance", "figurka"] },
  S: { words: ["syn", "sýr", "syrový", "sytý", "sýkora", "sychravo", "sypat", "sysel", "syčet", "nasytit"], tricky: ["silnice", "síla", "silný", "sirup", "Silvestr", "sice"] },
  V: { words: ["vy", "výr", "výt", "vyžle", "vydra", "výskat", "vysoký"], note: "Předpony vy-/vý-: vyhrát, vyjet, výroba, vyprávět, vybrat, výběr, vyučovat…", tricky: ["vidět", "vítr", "vím", "violka", "vítěz", "vítat", "víla", "vír", "virus", "vinice"] },
  Z: { words: ["zvyk", "jazyk", "brzy", "nazývat", "jazýček"], tricky: ["zítra", "zima", "zimní", "zírat", "zisk", "zívat"] },
};

const SEEN_MAX = 80;
function getSeenSigs(letter) {
  try { return new Set(JSON.parse(localStorage.getItem(`vs_seen_${letter}`) || "[]")); } catch { return new Set(); }
}
function addSeenSigs(letter, sigs) {
  try {
    const prev = JSON.parse(localStorage.getItem(`vs_seen_${letter}`) || "[]");
    localStorage.setItem(`vs_seen_${letter}`, JSON.stringify([...prev, ...sigs].slice(-SEEN_MAX)));
  } catch {}
}

function pickSentences(letter, count, cats, aiSentences = [], seenSignatures = new Set()) {
  const selectedCats = cats && cats.length > 0 ? cats : CATEGORY_ORDER.filter((c) => c !== "trickQuestions");
  const catsWithTricks = [...new Set([...selectedCats, "trickQuestions"])];
  const localPool = (letter === "MIX"
    ? LETTERS.flatMap((l) => getSentencePoolByCategories(l, catsWithTricks))
    : getSentencePoolByCategories(letter, catsWithTricks)
  ).map((sentence) => ({ ...sentence, _source: "local" }));
  const aiPool = aiSentences.map((sentence) => ({ ...sentence, _source: "ai" }));
  const shuffle = (pool) => {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const signature = (sentence) => sentence.parts.map((p) => ("text" in p ? p.text : p.blank)).join("").replace(/\s+/g, " ").trim().toLowerCase();
  const family = (sentence) => signature(sentence).slice(0, 28);
  const byUnseen = (pool) => { const s = shuffle(pool); return [...s.filter((x) => !seenSignatures.has(signature(x))), ...s.filter((x) => seenSignatures.has(signature(x)))]; };

  const aiQueue = byUnseen(aiPool);
  const localQueue = byUnseen(localPool);
  const aiTarget = Math.min(aiQueue.length, Math.max(0, Math.ceil(count * 0.35)));
  const selected = [];
  const usedSignatures = new Set();
  const usedFamilies = new Set();
  let aiUsed = 0;

  const tryTakeFrom = (queue, source) => {
    for (let i = 0; i < queue.length; i++) {
      const candidate = queue[i];
      const sig = signature(candidate);
      const fam = family(candidate);
      if (usedSignatures.has(sig) || usedFamilies.has(fam)) continue;
      if (source === "ai" && aiUsed >= aiTarget && localQueue.length > 0) continue;
      queue.splice(i, 1);
      usedSignatures.add(sig);
      usedFamilies.add(fam);
      if (source === "ai") aiUsed++;
      selected.push(candidate);
      return true;
    }
    return false;
  };

  while (selected.length < count && (aiQueue.length || localQueue.length)) {
    const preferAi = aiUsed < aiTarget && aiQueue.length > 0 && selected.length % 3 === 1;
    const picked = preferAi
      ? tryTakeFrom(aiQueue, "ai") || tryTakeFrom(localQueue, "local")
      : tryTakeFrom(localQueue, "local") || tryTakeFrom(aiQueue, "ai");
    if (!picked) {
      const fallbackPool = [...aiQueue, ...localQueue];
      if (!fallbackPool.length) break;
      const candidate = fallbackPool.shift();
      selected.push(candidate);
      const sig = signature(candidate);
      usedSignatures.add(sig);
    }
  }

  return selected.slice(0, Math.min(count, selected.length));
}

const _initM = pickSentences("M", _initCount, _initCats);

function formatDateTime(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" && !value.endsWith("Z") && !value.includes("+") ? value.replace(" ", "T") + "Z" : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("cs-CZ")} ${date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  const [sentences, setSentences] = useState(() => ({ ...LETTERS_OBJ(null), MIX: null, REVIEW: null, M: _initM }));
  const [inputs, setInputs] = useState(() => ({ ...LETTERS_OBJ([]), MIX: [], REVIEW: [], M: _initM.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
  const [checked, setChecked] = useState(() => ({ ...LETTERS_OBJ(false), MIX: false, REVIEW: false }));
  const [score, setScore] = useState(() => ({ ...LETTERS_OBJ(null), MIX: null, REVIEW: null }));
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

  // AI nastavení
  const [aiSettings, setAiSettings] = useState(null);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(null); // letter nebo null
  const [aiNotice, setAiNotice] = useState(null);
  const [aiDebug, setAiDebug] = useState(null);
  const [aiManageLetter, setAiManageLetter] = useState("M");
  const [aiManageSentences, setAiManageSentences] = useState([]);
  const [aiManageLoading, setAiManageLoading] = useState(false);
  const [problemSents, setProblemSents] = useState(null);
  const [problemSentsUser, setProblemSentsUser] = useState(null);
  const [problemSentsLoading, setProblemSentsLoading] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [showTahak, setShowTahak] = useState(false);
  const [tahakTab, setTahakTab] = useState("M");
  const currentUserRef = useRef(null);
  const prevAchievementsRef = useRef(null);
  const toastTimerRef = useRef(null);

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

  // ── AI nastavení ────────────────────────────────────────────────────────
  const loadAiSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      setAiSettings(await res.json());
    } catch {
      setAiSettings({
        gemini_key_set: false,
        ai_counts: {},
        ai_status: null,
        ai_limit_per_letter: 0,
        ai_target_per_generate: 20,
      });
    }
  }, []);

  const loadAiDebug = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-debug");
      setAiDebug(await res.json());
    } catch {
      setAiDebug(null);
    }
  }, []);

  const loadAiManageSentences = useCallback(async (letter) => {
    setAiManageLoading(true);
    try {
      const res = await fetch(`/api/ai-sentences?letter=${letter}&include_meta=1`);
      const data = await res.json();
      setAiManageSentences(Array.isArray(data) ? data : []);
    } catch {
      setAiManageSentences([]);
    }
    setAiManageLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) loadAiSettings();
  }, [currentUser, loadAiSettings]);

  const handleSaveAiKey = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_key: aiKeyInput }),
      });
      setAiKeyInput("");
      setAiNotice({ type: "success", text: "Gemini API klíč byl uložen." });
      await loadAiSettings();
      await loadAiDebug();
    } catch {
      setAiNotice({ type: "error", text: "API klíč se nepodařilo uložit." });
    }
  };

  const handleDeleteAiKey = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gemini_key: "" }),
    }).catch(() => {});
    setAiNotice({ type: "success", text: "Gemini API klíč byl smazán." });
    await loadAiSettings();
    await loadAiDebug();
  };

  const handleGenerateAI = async (letter) => {
    setAiGenerating(letter);
    setAiNotice(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chyba generování");
      await loadAiSettings();
      await loadAiDebug();
      if (aiManageLetter === letter) await loadAiManageSentences(letter);
      setAiNotice({ type: "success", text: `AI úspěšně vygenerovala ${data.generated ?? "nové"} věty pro písmeno ${letter}.` });
    } catch (e) {
      await loadAiDebug();
      setAiNotice({ type: "error", text: e.message || "AI generování se nepodařilo. Zkuste to prosím znovu." });
    }
    setAiGenerating(null);
  };

  const handleDeleteAISentences = async (letter) => {
    if (!window.confirm(`Smazat všechny AI věty pro písmeno ${letter}?`)) return;
    await fetch(`/api/ai-sentences/${letter}`, { method: "DELETE" }).catch(() => {});
    await loadAiSettings();
    await loadAiDebug();
    if (aiManageLetter === letter) await loadAiManageSentences(letter);
  };

  const handleReviewAISentence = async (id, review_status) => {
    try {
      await fetch(`/api/ai-sentences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status }),
      });
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
      await fetch(`/api/ai-sentence/${id}`, { method: "DELETE" });
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
      await fetch("/api/ai-sentences-by-model", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      await loadAiSettings();
      await loadAiManageSentences(aiManageLetter);
    } catch {
      setAiNotice({ type: "error", text: "Nepodařilo se smazat věty modelu." });
    }
  };

  const loadProblemSents = useCallback(async (userId) => {
    if (!userId) return;
    setProblemSentsLoading(true);
    try {
      const res = await fetch(`/api/stats/problem-sentences?userId=${userId}&limit=20`);
      setProblemSents(await res.json());
    } catch { setProblemSents([]); }
    setProblemSentsLoading(false);
  }, []);

  const loadStreak = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/streak?userId=${userId}`);
      setStreakData(await res.json());
    } catch {}
  }, []);

  const loadAchievements = useCallback(async (userId, checkNew = false) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/achievements?userId=${userId}`);
      const data = await res.json();
      if (checkNew && prevAchievementsRef.current) {
        const prevEarned = new Set(prevAchievementsRef.current.filter((a) => a.earned).map((a) => a.id));
        const newlyEarned = data.filter((a) => a.earned && !prevEarned.has(a.id));
        if (newlyEarned.length > 0) {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setAchievementToast(newlyEarned[0]);
          toastTimerRef.current = setTimeout(() => setAchievementToast(null), 4000);
        }
      }
      prevAchievementsRef.current = data;
      setAchievements(data);
    } catch {}
  }, []);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => {
    if (currentUser?.id) {
      loadStreak(currentUser.id);
      loadAchievements(currentUser.id);
    }
  }, [currentUser?.id, loadStreak, loadAchievements]);

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
    setSentences({ ...LETTERS_OBJ(null), MIX: null, REVIEW: null, [letter]: picked });
    setInputs({ ...LETTERS_OBJ([]), MIX: [], REVIEW: [], [letter]: picked.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) });
    setChecked({ ...LETTERS_OBJ(false), MIX: false, REVIEW: false });
    setScore({ ...LETTERS_OBJ(null), MIX: null, REVIEW: null });
  }, [sentenceCount, activeCats]);

  const loadSentences = useCallback(async (letter) => {
    if (letter === "REVIEW") {
      const uid = currentUserRef.current?.id;
      if (!uid) { setSentences((prev) => ({ ...prev, REVIEW: [] })); return; }
      try {
        const res = await fetch(`/api/mistakes?userId=${uid}&limit=15`);
        if (res.ok) {
          const mistakes = await res.json();
          const reviewSents = mistakes.filter((m) => m.parts).map((m) => ({ parts: m.parts, _source: "review" }));
          setSentences((prev) => ({ ...prev, REVIEW: reviewSents }));
          setInputs((prev) => ({ ...prev, REVIEW: reviewSents.map((s) => s.parts.filter((p) => "blank" in p).map(() => "")) }));
          setChecked((prev) => ({ ...prev, REVIEW: false }));
          setScore((prev) => ({ ...prev, REVIEW: null }));
          sessionStartRef.current = Date.now();
          return;
        }
      } catch {}
      setSentences((prev) => ({ ...prev, REVIEW: [] }));
      return;
    }
    let aiSentences = [];
    try {
      if (letter === "MIX") {
        const results = await Promise.allSettled(
          LETTERS.map((l) => fetch(`/api/ai-sentences?letter=${l}`).then((r) => r.ok ? r.json() : []))
        );
        aiSentences = results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
      } else {
        const res = await fetch(`/api/ai-sentences?letter=${letter}`);
        if (res.ok) aiSentences = await res.json();
      }
    } catch {}
    const seenSigs = getSeenSigs(letter);
    const picked = pickSentences(letter, sentenceCount, activeCats, aiSentences, seenSigs);
    addSeenSigs(letter, picked.map((s) => s.parts.map((p) => ("text" in p ? p.text : p.blank)).join("").replace(/\s+/g, " ").trim().toLowerCase()));
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
        else mistakes.push({ sentence: sentenceText, expected: part.blank, given: given || "—", parts: sentence.parts });
      });
    });
    setScore((prev) => ({ ...prev, [activeTab]: { correct, total } }));
    setChecked((prev) => ({ ...prev, [activeTab]: true }));
    playSound(correct === total ? "correct" : "wrong");
    if (activeTab !== "REVIEW") {
      const duration_s = Math.round((Date.now() - sessionStartRef.current) / 1000);
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter: activeTab, correct, total, mistakes, userId: currentUser?.id, duration_s }),
      }).then(() => { if (currentUser?.id) { loadStreak(currentUser.id); loadAchievements(currentUser.id, true); } }).catch(() => {});
    }
  }, [sentences, inputs, activeTab, playSound, currentUser, loadStreak, loadAchievements]);

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
    const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = isParent
      ? ["Datum", "Čas", "Trvání", "Profil", "Písmeno", "Správně", "Celkem", "Přesnost", "Stav", "Věta", "Napsáno", "Správně má být"]
      : ["Datum", "Čas", "Trvání", "Písmeno", "Správně", "Celkem", "Přesnost", "Stav", "Věta", "Napsáno", "Správně má být"];
    const toDate = (ts) => new Date(typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+") ? ts.replace(" ", "T") + "Z" : ts);
    const rows = sessions.flatMap((s) => {
      const d = toDate(s.timestamp);
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const dur = s.duration_s ? `${Math.floor(s.duration_s / 60)}:${String(s.duration_s % 60).padStart(2, "0")}` : "";
      const base = [
        d.toLocaleDateString("cs-CZ"),
        d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        dur,
        ...(isParent ? [(users?.find((u) => u.id === s.user_id)?.name) ?? "—"] : []),
        `Po ${s.letter}`,
        s.correct,
        s.total,
        `${pct}%`,
      ];

      if (!s.mistakes || s.mistakes.length === 0) {
        return [[...base, "Bez chyby", "", "", ""].map(csvEscape).join(",")];
      }

      return s.mistakes.map((m) =>
        [...base, "Chyba", m.sentence, m.given, m.expected].map(csvEscape).join(",")
      );
    });
    const blob = new Blob(["\uFEFF" + [header.map(csvEscape).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cviceni-vyjmenovana-slova.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportLocalBankCSV = () => {
    const escape = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const header = "Písmeno,Kategorie,Věta (celá),Blank";
    const lines = [];
    for (const [letter, letterData] of Object.entries(SENTENCE_BANK)) {
      for (const [category, sentences_] of Object.entries(letterData.categories || {})) {
        for (const sentence of sentences_) {
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

  // ── Derived ───────────────────────────────────────────────────────────────
  const data = TAB_META[activeTab] ?? (activeTab === "REVIEW" ? REVIEW_META : MIX_META);
  const currentSentences = sentences[activeTab];
  const bankSummary = getBankSummary(activeTab);
  const activeAiCount = aiSettings?.ai_counts?.[activeTab] ?? 0;
  const totalSentencePool = (bankSummary?.total ?? 0) + activeAiCount;
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
    @keyframes toastIn { from { opacity: 0; transform: translateY(-24px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes toastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-16px) scale(0.95); } }
    .achievement-toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 200; animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; pointer-events: none; }
    .achievement-toast.hiding { animation: toastOut 0.3s ease forwards; }
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

          {/* AI sekce */}
          <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 14, fontSize: "1rem" }}>
              🤖 AI generování vět
            </div>
            {aiSettings === null && (
              <div style={{ color: t.subtext, fontFamily: "'Nunito', sans-serif", fontSize: "0.85rem" }}>Načítám…</div>
            )}
            {aiSettings !== null && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext, marginBottom: 8 }}>
                    Gemini API klíč:{" "}
                    {aiSettings.gemini_key_set
                      ? <span style={{ color: "#27ae60", fontWeight: 700 }}>✓ nastaven</span>
                      : <span style={{ color: "#e74c3c" }}>✗ není nastaven</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      type="password"
                      placeholder={aiSettings.gemini_key_set ? "Změnit klíč…" : "Vložit API klíč…"}
                      value={aiKeyInput}
                      onChange={(e) => setAiKeyInput(e.target.value)}
                      style={{ background: t.inputBg, border: `2px solid ${t.inputBorder}`, color: t.text, flex: 1, padding: "8px 12px", fontSize: "0.9rem" }}
                    />
                    <button className="chip-btn" onClick={handleSaveAiKey} disabled={!aiKeyInput} style={{ background: "#2980b9", color: "white", whiteSpace: "nowrap" }}>
                      Uložit
                    </button>
                    {aiSettings.gemini_key_set && (
                      <button className="chip-btn" onClick={handleDeleteAiKey} style={{ background: t.chipInactiveBg, color: "#e74c3c" }} title="Smazat klíč">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {aiNotice && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: aiNotice.type === "error" ? "#fff4f2" : "#eefaf1",
                      color: aiNotice.type === "error" ? "#b7412d" : "#1f7a3f",
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: "0.82rem",
                      lineHeight: 1.45,
                    }}
                  >
                    {aiNotice.text}
                  </div>
                )}
                {aiSettings.gemini_key_set && (
                  <div>
                    <div style={{ marginBottom: 14, padding: "12px 12px", borderRadius: 10, background: t.rowBg, border: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.85rem", color: t.text }}>⏰ Auto-generování</span>
                        <button
                          className="chip-btn"
                          onClick={async () => {
                            const next = !aiSettings.auto_generate_enabled;
                            await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_generate_enabled: next }) });
                            await loadAiSettings();
                          }}
                          style={{ background: aiSettings.auto_generate_enabled ? "#27ae60" : t.chipInactiveBg, color: aiSettings.auto_generate_enabled ? "white" : t.chipInactiveText, fontSize: "0.78rem" }}
                        >
                          {aiSettings.auto_generate_enabled ? "Zapnuto" : "Vypnuto"}
                        </button>
                      </div>
                      {aiSettings.auto_generate_enabled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: t.subtext }}>Interval:</span>
                          {[3, 7, 14, 30].map((d) => (
                            <button key={d} className="chip-btn" onClick={async () => { await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_generate_interval_days: d }) }); await loadAiSettings(); }} style={{ background: aiSettings.auto_generate_interval_days === d ? "#2980b9" : t.chipInactiveBg, color: aiSettings.auto_generate_interval_days === d ? "white" : t.chipInactiveText, fontSize: "0.75rem" }}>
                              {d}d
                            </button>
                          ))}
                          {aiSettings.auto_generate_last_run && (
                            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.74rem", color: t.subtext, marginLeft: 4 }}>
                              naposledy {formatDateTime(aiSettings.auto_generate_last_run)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: t.subtext, marginBottom: 8 }}>
                      Každé generování přidá ~{aiSettings.ai_target_per_generate ?? 20} vět (Google Gemini · zdarma)
                    </div>
                    <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: t.rowBg, border: `1px solid ${t.border}` }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, marginBottom: 4 }}>
                        Poslední úspěšné generování: <strong style={{ color: t.text }}>{formatDateTime(aiSettings.ai_status?.last_success_at)}</strong>
                      </div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, marginBottom: 4 }}>
                        Poslední model: <strong style={{ color: t.text }}>{aiSettings.ai_status?.last_model || "—"}</strong>
                      </div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, marginBottom: aiSettings.ai_status?.last_error ? 6 : 0 }}>
                        Retry pokusy naposledy: <strong style={{ color: t.text }}>{aiSettings.ai_status?.retries ?? 0}</strong>
                      </div>
                      {aiSettings.ai_status?.last_error && (
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: "#b7412d", lineHeight: 1.45 }}>
                          Poslední AI chyba: {aiSettings.ai_status.last_error}
                        </div>
                      )}
                    </div>
                    {aiDebug?.ai_status?.last_attempts?.length > 0 && (
                      <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: t.rowBg, border: `1px solid ${t.border}` }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 8, fontSize: "0.88rem" }}>
                          Poslední AI pokusy
                        </div>
                        {aiDebug.ai_status.last_attempts.slice(0, 5).map((attempt, idx) => (
                          <div key={`${attempt.at}-${idx}`} style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: t.subtext, marginBottom: 5, lineHeight: 1.4 }}>
                            {formatDateTime(attempt.at)} · <strong style={{ color: t.text }}>{attempt.model}</strong> · {attempt.outcome}
                            {attempt.error ? ` · ${attempt.error}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {LETTERS.map((letter) => {
                      const count = aiSettings.ai_counts?.[letter] ?? 0;
                      const isGenerating = aiGenerating === letter;
                      const overview = aiSettings.ai_overview?.[letter];
                      return (
                        <div key={letter} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${t.border}` }}>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: TAB_META[letter].color, width: 64, fontSize: "0.88rem", flexShrink: 0 }}>
                            {TAB_META[letter].emoji} Po {letter}
                          </span>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext, flex: 1, lineHeight: 1.35 }}>
                            {count}{aiSettings.ai_limit_per_letter ? ` / ${aiSettings.ai_limit_per_letter}` : ""} vět
                            {overview && ` · skryté ${overview.hidden} · špatné ${overview.rejected}`}
                          </span>
                          <button
                            className="chip-btn"
                            onClick={() => handleGenerateAI(letter)}
                            disabled={!!aiGenerating}
                            style={{ background: isGenerating ? t.chipInactiveBg : "#27ae60", color: isGenerating ? t.subtext : "white", fontSize: "0.78rem" }}
                          >
                            {isGenerating ? "Generuji…" : count > 0 ? "+ Doplnit" : "+ Generovat"}
                          </button>
                          {count > 0 && (
                            <button
                              className="chip-btn"
                              onClick={() => handleDeleteAISentences(letter)}
                              disabled={!!aiGenerating}
                              style={{ background: t.chipInactiveBg, color: "#e74c3c", fontSize: "0.78rem" }}
                              title="Smazat AI věty"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 16, padding: "12px 12px 8px", borderRadius: 12, background: t.rowBg, border: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, fontSize: "0.88rem" }}>
                            Správa AI vět
                          </div>
                          <a
                            href="/api/export-sentences"
                            download="vety-ai.csv"
                            style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.75rem", fontWeight: 700, background: t.pillBg, color: t.subtext, border: `1px solid ${t.borderMid}`, borderRadius: 8, padding: "3px 10px", textDecoration: "none", whiteSpace: "nowrap" }}
                          >
                            ⬇ AI CSV
                          </a>
                          <button
                            className="chip-btn"
                            onClick={() => exportLocalBankCSV()}
                            style={{ fontSize: "0.75rem", background: t.pillBg, color: t.subtext, border: `1px solid ${t.borderMid}` }}
                          >
                            ⬇ Lokální CSV
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {LETTERS.map((letter) => (
                            <button
                              key={letter}
                              className="chip-btn"
                              onClick={() => { setAiManageLetter(letter); loadAiManageSentences(letter); }}
                              style={{ background: aiManageLetter === letter ? TAB_META[letter].accent : t.chipInactiveBg, color: aiManageLetter === letter ? "white" : t.chipInactiveText, fontSize: "0.75rem" }}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      </div>
                      {aiManageLoading && (
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, padding: "8px 0" }}>
                          Načítám AI věty…
                        </div>
                      )}
                      {!aiManageLoading && aiManageSentences.length === 0 && (
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, padding: "8px 0" }}>
                          Pro písmeno {aiManageLetter} zatím nejsou uložené žádné AI věty.
                        </div>
                      )}
                      {!aiManageLoading && aiManageSentences.slice(0, 12).map((item) => {
                        const sentenceText = item.sentence?.parts?.map((part) => ("text" in part ? part.text : `[${part.blank}]`)).join("") || "—";
                        const statusColor = item.review_status === "active" ? "#1f7a3f" : item.review_status === "hidden" ? "#8c6d1f" : "#b7412d";
                        return (
                          <div key={item.id} style={{ padding: "9px 0", borderTop: `1px solid ${t.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.text, lineHeight: 1.45 }}>
                                  {sentenceText}
                                </div>
                                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.74rem", color: statusColor, marginTop: 4 }}>
                                  {item.review_status} · {formatDateTime(item.created_at)}{item.source_model ? ` · ${item.source_model}` : ""}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {item.review_status !== "active" && (
                                  <button className="chip-btn" onClick={() => handleReviewAISentence(item.id, "active")} style={{ background: "#eefaf1", color: "#1f7a3f", fontSize: "0.74rem" }}>
                                    Obnovit
                                  </button>
                                )}
                                {item.review_status !== "hidden" && (
                                  <button className="chip-btn" onClick={() => handleReviewAISentence(item.id, "hidden")} style={{ background: "#fff7e6", color: "#9a6b10", fontSize: "0.74rem" }}>
                                    Skrýt
                                  </button>
                                )}
                                {item.review_status !== "rejected" && (
                                  <button className="chip-btn" onClick={() => handleReviewAISentence(item.id, "rejected")} style={{ background: "#fff1f0", color: "#b7412d", fontSize: "0.74rem" }}>
                                    Špatná
                                  </button>
                                )}
                                <button className="chip-btn" onClick={() => handleDeleteAISentenceItem(item.id)} style={{ background: t.chipInactiveBg, color: "#e74c3c", fontSize: "0.74rem" }}>
                                  Smazat
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {aiSettings.ai_model_breakdown?.length > 0 && (
                      <div style={{ marginTop: 16, padding: "12px 12px 8px", borderRadius: 12, background: t.rowBg, border: `1px solid ${t.border}` }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 10, fontSize: "0.88rem" }}>
                          Věty podle modelu
                        </div>
                        {aiSettings.ai_model_breakdown.map((item) => (
                          <div key={item.source_model} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${t.border}` }}>
                            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.text, flex: 1 }}>{item.source_model ?? "—"}</span>
                            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem", color: t.subtext }}>{item.n} vět</span>
                            <button className="chip-btn" onClick={() => handleDeleteByModel(item.source_model)} disabled={!!aiGenerating} style={{ background: t.chipInactiveBg, color: "#e74c3c", fontSize: "0.74rem" }}>
                              🗑 Smazat
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {currentUser?.role === "parent" && users && users.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 14, fontSize: "1rem" }}>
                🔴 Problémové věty
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {users.map((u) => (
                  <button key={u.id} className="chip-btn" onClick={() => { setProblemSentsUser(u.id); loadProblemSents(u.id); }} style={{ background: problemSentsUser === u.id ? avatarColor(u.id) : t.chipInactiveBg, color: problemSentsUser === u.id ? "white" : t.chipInactiveText, display: "flex", alignItems: "center", gap: 5 }}>
                    <Avatar user={u} size={14} />
                    {u.name}
                  </button>
                ))}
              </div>
              {problemSentsLoading && <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.85rem", color: t.subtext }}>Načítám…</div>}
              {!problemSentsLoading && problemSents !== null && problemSents.length === 0 && (
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.85rem", color: t.subtext }}>Žádné chyby nenalezeny.</div>
              )}
              {!problemSentsLoading && problemSents !== null && problemSents.length > 0 && problemSents.map((item, i) => (
                <div key={i} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 6, background: t.rowBg, border: `1px solid ${t.border}` }}>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: "0.88rem", color: t.text, lineHeight: 1.45 }}>{item.sentence}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: "#b7412d", marginTop: 3 }}>
                    {item.errors}× špatně · správně: <strong>{item.expected}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {streakData && streakData.streak > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: darkMode ? "#2a1f00" : "#fff3cd", border: "2px solid #f39c12", borderRadius: 10, padding: "5px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.85rem", color: "#c0790d" }} title={`${streakData.streak} dní v řadě!`}>
                🔥 {streakData.streak}
              </div>
            )}
            {currentUser.role === "parent" && (
              <button onClick={() => { loadUsers(); loadAiSettings(); loadAiDebug(); loadAiManageSentences(aiManageLetter); setShowManage(true); }} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: t.pillText, cursor: "pointer" }}>
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
            <button onClick={() => setShowTahak(true)} style={{ background: t.pillBg, border: `2px solid ${t.borderMid}`, borderRadius: 10, padding: "7px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: t.pillText, cursor: "pointer" }}>
              📖 Tahák
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
        <button
          className="tab-btn"
          onClick={() => setActiveTab("MIX")}
          style={{ background: activeTab === "MIX" ? MIX_META.accent : t.tabInactiveBg, color: activeTab === "MIX" ? "white" : MIX_META.accent, borderColor: MIX_META.accent, boxShadow: activeTab === "MIX" ? `0 4px 14px ${MIX_META.accent}55` : "0 2px 6px rgba(0,0,0,0.08)" }}
        >
          {MIX_META.emoji} MIX
          {score["MIX"] && (
            <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "1px 7px", fontSize: "0.82rem" }}>
              {score["MIX"].correct}/{score["MIX"].total}
            </span>
          )}
        </button>
        {currentUser?.role !== "parent" && (
          <button
            className="tab-btn"
            onClick={() => { setSentences((prev) => ({ ...prev, REVIEW: null })); setActiveTab("REVIEW"); }}
            style={{ background: activeTab === "REVIEW" ? REVIEW_META.accent : t.tabInactiveBg, color: activeTab === "REVIEW" ? "white" : REVIEW_META.accent, borderColor: REVIEW_META.accent, boxShadow: activeTab === "REVIEW" ? `0 4px 14px ${REVIEW_META.accent}55` : "0 2px 6px rgba(0,0,0,0.08)" }}
          >
            {REVIEW_META.emoji} Procvič chyby
            {score["REVIEW"] && (
              <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "1px 7px", fontSize: "0.82rem" }}>
                {score["REVIEW"].correct}/{score["REVIEW"].total}
              </span>
            )}
          </button>
        )}
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
          {SELECTABLE_CATS.map((cat) => {
            const active = activeCats.includes(cat);
            return (
              <button key={cat} className="chip-btn" onClick={() => toggleCat(cat)} style={{ background: active ? t.chipActiveBg : t.chipInactiveBg, color: active ? t.chipActiveText : t.chipInactiveText, textDecoration: active ? "none" : "line-through" }}>
                {CAT_LABELS[cat]}
              </button>
            );
          })}
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.8rem", color: t.subtext, whiteSpace: "nowrap" }}>+ Chytáky vždy</span>
        </div>
      </div>

      {/* Exercise card */}
      <div style={{ maxWidth: 700, margin: "0 auto", "--accent": data.accent }}>
        <div style={{ background: t.cardBg, borderRadius: 20, padding: "26px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.7rem" }}>{data.emoji}</span>
                <span style={{ fontSize: "1.15rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: data.color }}>{activeTab === "MIX" ? "Všechna písmena" : activeTab === "REVIEW" ? "Procvič chyby" : `Po ${activeTab}`}</span>
              </div>
              {bankSummary && (
                <div style={{ marginTop: 4, fontSize: "0.8rem", fontFamily: "'Nunito', sans-serif", color: t.subtext }}>
                  Místní databáze: {bankSummary.total} / {bankSummary.targetTotal} vět
                  {activeAiCount > 0 && ` · AI věty: ${activeAiCount} · Celkem: ${totalSentencePool}`}
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
          Nové věty = náhodný výběr z místní databáze + AI vět (pokud jsou k dispozici).
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
              {[["sessions", "Sezení"], ["stats", "Statistiky"], ["badges", "🏅 Odznaky"]].map(([key, label]) => (
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
                    const date = new Date(typeof session.timestamp === "string" && !session.timestamp.endsWith("Z") && !session.timestamp.includes("+") ? session.timestamp.replace(" ", "T") + "Z" : session.timestamp);
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
                      {sessions && sessions.length > 0 && (() => {
                        const tsToDate = (ts) => new Date(typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+") ? ts.replace(" ", "T") + "Z" : ts);
                        const filtered = sessions.filter((s) => histFilterUser === null || s.user_id === histFilterUser);
                        const byDay = {};
                        filtered.forEach((s) => {
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
                        const chartData = days.map((day) => ({
                          day,
                          label: new Date(day + "T12:00:00Z").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
                          pct: byDay[day] && byDay[day].total > 0 ? Math.round(byDay[day].correct / byDay[day].total * 100) : null,
                        }));
                        if (!chartData.some((d) => d.pct !== null)) return null;
                        const BAR_W = 18, GAP = 3, H = 80, TOTAL_W = 14 * (BAR_W + GAP);
                        return (
                          <div style={{ marginTop: 20 }}>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: t.text, marginBottom: 8, fontSize: "0.88rem" }}>Přesnost — posledních 14 dní</div>
                            <svg width="100%" viewBox={`0 0 ${TOTAL_W} ${H + 22}`} style={{ display: "block", overflow: "visible" }}>
                              {chartData.map((d, i) => {
                                const x = i * (BAR_W + GAP);
                                if (d.pct === null) return (
                                  <g key={d.day}>
                                    <rect x={x} y={H - 4} width={BAR_W} height={4} fill={darkMode ? "#253040" : "#eee"} rx={2} />
                                  </g>
                                );
                                const barH = Math.max(4, Math.round(d.pct * H / 100));
                                const color = d.pct >= 80 ? "#27ae60" : d.pct >= 50 ? "#f39c12" : "#e74c3c";
                                return (
                                  <g key={d.day}>
                                    <rect x={x} y={H - barH} width={BAR_W} height={barH} fill={color} rx={3} opacity={0.9} />
                                    <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={8} fill={darkMode ? "#6d88a0" : "#aaa"} fontFamily="Nunito, sans-serif">{d.label}</text>
                                    <title>{d.day}: {d.pct}%</title>
                                  </g>
                                );
                              })}
                              <line x1={0} y1={H} x2={TOTAL_W} y2={H} stroke={darkMode ? "#253040" : "#ddd"} strokeWidth={1} />
                            </svg>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
              {histTab === "badges" && (
                <div>
                  {achievements === null && <div style={{ textAlign: "center", color: t.subtext, fontFamily: "'Nunito', sans-serif", padding: 40 }}>Načítám…</div>}
                  {achievements !== null && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {achievements.map((a) => (
                        <div key={a.id} style={{ padding: "14px 12px", borderRadius: 14, background: a.earned ? (darkMode ? "#1a2a1a" : "#eefaf1") : t.rowBg, border: `2px solid ${a.earned ? "#27ae60" : t.border}`, opacity: a.earned ? 1 : 0.5, transition: "all 0.2s" }}>
                          <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{a.emoji}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.88rem", color: a.earned ? (darkMode ? "#5dd88a" : "#1a6b30") : t.subtext, marginBottom: 3 }}>{a.name}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.75rem", color: t.subtext, lineHeight: 1.35 }}>{a.desc}</div>
                          {a.earned && <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.72rem", color: "#27ae60", fontWeight: 700, marginTop: 5 }}>✓ Získáno</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tahák overlay */}
      {showTahak && (
        <div className="history-overlay" style={{ background: t.overlayBg }} onClick={() => setShowTahak(false)}>
          <div className="history-panel" style={{ background: t.panelBg }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.panelBg, position: "sticky", top: 0, zIndex: 1 }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: t.text }}>📖 Tahák — vyjmenovaná slova</span>
              <button onClick={() => setShowTahak(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: t.subtext, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 20px 0", borderBottom: `1px solid ${t.border}`, paddingBottom: 10, position: "sticky", top: 57, background: t.panelBg, zIndex: 1 }}>
              {LETTERS.map((l) => (
                <button key={l} className="chip-btn" onClick={() => setTahakTab(l)} style={{ background: tahakTab === l ? TAB_META[l].accent : t.chipInactiveBg, color: tahakTab === l ? "white" : t.chipInactiveText, fontWeight: 800 }}>
                  {TAB_META[l].emoji} {l}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 20px" }}>
              {(() => {
                const entry = TAHAK_DATA[tahakTab];
                const meta = TAB_META[tahakTab];
                return (
                  <>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: meta.color, marginBottom: 12, fontSize: "1rem" }}>
                      Vyjmenovaná slova po {tahakTab}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                      {entry.words.map((w) => (
                        <span key={w} style={{ background: darkMode ? `${meta.accent}22` : meta.bg, color: meta.color, border: `2px solid ${meta.accent}55`, borderRadius: 10, padding: "5px 12px", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "0.95rem" }}>{w}</span>
                      ))}
                    </div>
                    {entry.note && (
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.88rem", color: t.subtext, marginBottom: 16, padding: "10px 12px", background: t.rowBg, borderRadius: 10, border: `1px solid ${t.border}`, fontStyle: "italic" }}>
                        {entry.note}
                      </div>
                    )}
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#c0392b", marginBottom: 10, fontSize: "0.88rem" }}>
                      ⚠️ Chytáky — píší se s i/í
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {entry.tricky.map((w) => (
                        <span key={w} style={{ background: darkMode ? "#2a1010" : "#fff5f5", color: "#c0392b", border: "2px solid #f1948a", borderRadius: 10, padding: "5px 12px", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "0.95rem" }}>{w}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {managePanel}
      {pinModalEl}
      {profileModalEl}

      {achievementToast && (
        <div className="achievement-toast">
          <div style={{ background: darkMode ? "#1a2a1a" : "#ffffff", border: "2px solid #27ae60", borderRadius: 16, padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 220 }}>
            <span style={{ fontSize: "2rem" }}>{achievementToast.emoji}</span>
            <div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "#27ae60", letterSpacing: "0.05em", textTransform: "uppercase" }}>Nový odznak!</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "1rem", color: darkMode ? "#d8e4f0" : "#2c3e50" }}>{achievementToast.name}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.78rem", color: darkMode ? "#6d88a0" : "#7f8c8d", marginTop: 2 }}>{achievementToast.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
