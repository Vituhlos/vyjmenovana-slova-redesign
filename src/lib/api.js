const BASE = "";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Users ─────────────────────────────────────────────────────────────
export const getUsers = () => req("/api/users");

export const createUser = (data) =>
  req("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateUser = (id, data) =>
  req(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteUser = (id) =>
  fetch(`/api/users/${id}`, { method: "DELETE" });

export const login = (userId, pin) =>
  req("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, pin }),
  });

// ── Sessions & Stats ──────────────────────────────────────────────────
export const getSessions = (userId, isParent) => {
  const url = isParent
    ? "/api/sessions?limit=200"
    : `/api/sessions?limit=150&userId=${userId}`;
  return req(url);
};

export const saveSession = (data) =>
  req("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getStats = (userId, isParent) => {
  const url = isParent ? "/api/stats" : `/api/stats?userId=${userId}`;
  return req(url);
};

export const getStatsByUser = () => req("/api/stats?byUser=1");

export const getStreak = (userId) => req(`/api/streak?userId=${userId}`);

export const getAchievements = (userId) =>
  req(`/api/achievements?userId=${userId}`);

export const getMistakes = (userId, limit = 15) =>
  req(`/api/mistakes?userId=${userId}&limit=${limit}`);

export const getProblemSentences = (userId, limit = 20) =>
  req(`/api/stats/problem-sentences?userId=${userId}&limit=${limit}`);

// ── AI Sentences ──────────────────────────────────────────────────────
export const getAiSentences = (letter) =>
  req(`/api/ai-sentences?letter=${letter}`);

export const getAiSentencesMeta = (letter) =>
  req(`/api/ai-sentences?letter=${letter}&include_meta=1`);

export const updateAiSentence = (id, review_status) =>
  req(`/api/ai-sentences/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_status }),
  });

export const deleteAiSentence = (id) =>
  fetch(`/api/ai-sentence/${id}`, { method: "DELETE" });

export const deleteAiSentencesByLetter = (letter) =>
  fetch(`/api/ai-sentences/${letter}`, { method: "DELETE" });

export const deleteAiSentencesByModel = (model) =>
  fetch("/api/ai-sentences-by-model", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });

export const generateAiSentences = (letter) =>
  req("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ letter }),
  });

// ── Settings ──────────────────────────────────────────────────────────
export const getSettings = () => req("/api/settings");

export const updateSettings = (data) =>
  req("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getAiDebug = () => req("/api/ai-debug");
