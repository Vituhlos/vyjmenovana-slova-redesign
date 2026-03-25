import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER, SENTENCE_BANK, getBankSummary, getSentencePoolByCategories } from "./sentenceBank";
import Avatar, { avatarColor as _avatarColor } from "./components/Avatar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import LoginView from "./components/views/LoginView.jsx";
import ExerciseView from "./components/views/ExerciseView.jsx";
import ParentDashboard from "./components/views/ParentDashboard.jsx";
import HistoryPanel from "./components/panels/HistoryPanel.jsx";
import TahakPanel from "./components/panels/TahakPanel.jsx";
import SettingsPanel from "./components/panels/SettingsPanel.jsx";
import PinModal from "./components/modals/PinModal.jsx";
import ProfileModal from "./components/modals/ProfileModal.jsx";

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

  // ── Auto-generate helpers ─────────────────────────────────────────────────
  const handleToggleAutoGenerate = useCallback(async () => {
    if (!aiSettings) return;
    const next = !aiSettings.auto_generate_enabled;
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_generate_enabled: next }) }).catch(() => {});
    await loadAiSettings();
  }, [aiSettings, loadAiSettings]);

  const handleSetAutoInterval = useCallback(async (days) => {
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_generate_interval_days: days }) }).catch(() => {});
    await loadAiSettings();
  }, [loadAiSettings]);

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

  // ── Obrazovka výběru profilu ───────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div data-dark={darkMode ? "true" : "false"}>
        <style>{sharedCSS}</style>
        <LoginView
          users={users}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectUser={handleSelectUser}
          onCreateProfile={openCreate}
        />
        {pinModal && (
          <PinModal
            user={pinModal}
            pinInput={pinInput}
            setPinInput={setPinInput}
            pinError={pinError}
            onSubmit={handlePinSubmit}
            onClose={() => setPinModal(null)}
            darkMode={darkMode}
          />
        )}
        {profileModal && (
          <ProfileModal
            profileModal={profileModal}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            profileError={profileError}
            profileSaving={profileSaving}
            onSave={handleSaveProfile}
            onClose={() => setProfileModal(null)}
            onAvatarChange={handleAvatarChange}
            avatarInputRef={avatarInputRef}
            darkMode={darkMode}
          />
        )}
      </div>
    );
  }

  // ── Hlavní UI ────────────────────────────────────────────────────────────
  return (
    <div
      data-dark={darkMode ? "true" : "false"}
      className={`flex h-screen overflow-hidden ${darkMode ? "bg-gray-950" : "bg-slate-50"}`}
    >
      <style>{sharedCSS}</style>

      {/* Sidebar (desktop) */}
      <div className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0 h-full">
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          score={score}
          streakData={streakData}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          onLogout={handleLogout}
          onShowHistory={loadHistory}
          onShowTahak={() => setShowTahak(true)}
          onShowSettings={() => { loadUsers(); loadAiSettings(); loadAiDebug(); loadAiManageSentences(aiManageLetter); setShowManage(true); }}
          onReviewTab={() => { setSentences(prev => ({ ...prev, REVIEW: null })); setActiveTab("REVIEW"); }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentUser?.role === "parent" ? (
          <ParentDashboard
            darkMode={darkMode}
            users={users}
            sessions={sessions}
            stats={stats}
            statsByUser={statsByUser}
            streakDataByUser={null}
            onShowHistory={loadHistory}
            onShowSettings={() => { loadUsers(); loadAiSettings(); loadAiDebug(); loadAiManageSentences(aiManageLetter); setShowManage(true); }}
            onSwitchToExercise={() => setActiveTab("M")}
          />
        ) : (
          <ExerciseView
            activeTab={activeTab}
            darkMode={darkMode}
            sentences={sentences}
            inputs={inputs}
            checked={checked}
            score={score}
            sentenceCount={sentenceCount}
            setSentenceCount={setSentenceCount}
            activeCats={activeCats}
            toggleCat={toggleCat}
            SELECTABLE_CATS={SELECTABLE_CATS}
            bankSummary={bankSummary}
            activeAiCount={activeAiCount}
            onNewSentences={loadSentences}
            onInput={handleInput}
            onCheck={checkAnswers}
            onClear={clearInputs}
          />
        )}
      </div>

      {/* Mobile navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReviewTab={() => { setSentences(prev => ({ ...prev, REVIEW: null })); setActiveTab("REVIEW"); }}
        onShowHistory={loadHistory}
        onShowTahak={() => setShowTahak(true)}
        darkMode={darkMode}
      />

      {/* Historie panel */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          darkMode={darkMode}
          currentUser={currentUser}
          users={users}
          sessions={sessions}
          stats={stats}
          statsByUser={statsByUser}
          achievements={achievements}
          histTab={histTab}
          setHistTab={setHistTab}
          histFilterUser={histFilterUser}
          setHistFilterUser={setHistFilterUser}
          onExportCSV={exportCSV}
        />
      )}

      {/* Tahák panel */}
      {showTahak && (
        <TahakPanel onClose={() => setShowTahak(false)} darkMode={darkMode} />
      )}

      {/* Nastavení panel */}
      {showManage && (
        <SettingsPanel
          onClose={() => setShowManage(false)}
          darkMode={darkMode}
          currentUser={currentUser}
          users={users}
          aiSettings={aiSettings}
          aiKeyInput={aiKeyInput}
          setAiKeyInput={setAiKeyInput}
          aiGenerating={aiGenerating}
          aiNotice={aiNotice}
          aiManageLetter={aiManageLetter}
          setAiManageLetter={setAiManageLetter}
          aiManageSentences={aiManageSentences}
          aiManageLoading={aiManageLoading}
          aiDebug={aiDebug}
          problemSents={problemSents}
          problemSentsUser={problemSentsUser}
          setProblemSentsUser={setProblemSentsUser}
          problemSentsLoading={problemSentsLoading}
          onLoadProblemSents={loadProblemSents}
          onSaveAiKey={handleSaveAiKey}
          onDeleteAiKey={handleDeleteAiKey}
          onGenerateAI={handleGenerateAI}
          onDeleteAISentences={handleDeleteAISentences}
          onReviewAISentence={handleReviewAISentence}
          onDeleteAISentenceItem={handleDeleteAISentenceItem}
          onDeleteByModel={handleDeleteByModel}
          onLoadAiManageSentences={loadAiManageSentences}
          onOpenCreate={openCreate}
          onOpenEdit={openEdit}
          onDeleteProfile={handleDeleteProfile}
          onExportLocalBankCSV={exportLocalBankCSV}
          onToggleAutoGenerate={handleToggleAutoGenerate}
          onSetAutoInterval={handleSetAutoInterval}
        />
      )}

      {/* PIN modál */}
      {pinModal && (
        <PinModal
          user={pinModal}
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinError={pinError}
          onSubmit={handlePinSubmit}
          onClose={() => setPinModal(null)}
          darkMode={darkMode}
        />
      )}

      {/* Profil modál */}
      {profileModal && (
        <ProfileModal
          profileModal={profileModal}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileError={profileError}
          profileSaving={profileSaving}
          onSave={handleSaveProfile}
          onClose={() => setProfileModal(null)}
          onAvatarChange={handleAvatarChange}
          avatarInputRef={avatarInputRef}
          darkMode={darkMode}
        />
      )}

      {/* Achievement toast */}
      {achievementToast && (
        <div className="achievement-toast">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-green-500 shadow-2xl min-w-[220px] ${
              darkMode ? "bg-gray-900" : "bg-white"
            }`}
          >
            <span className="text-3xl">{achievementToast.emoji}</span>
            <div>
              <div className="text-xs font-bold text-green-500 uppercase tracking-wider">Nový odznak!</div>
              <div className={`font-extrabold text-base ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                {achievementToast.name}
              </div>
              <div className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {achievementToast.desc}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
