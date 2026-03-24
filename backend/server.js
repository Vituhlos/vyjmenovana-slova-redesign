import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import {
  AI_SENTENCE_FETCH_LIMIT,
  AI_SENTENCE_LIMIT_PER_LETTER,
  GEMINI_MAX_MODEL_ATTEMPTS,
  GEMINI_SENTENCE_SCHEMA,
  GEMINI_SENTENCE_TARGET,
  buildGeminiModelCandidates,
  createGeminiError,
  isTemporaryGeminiError,
  normalizeGeminiSentenceBatch,
  parseGeminiCandidateText,
  shouldSwitchGeminiModel,
  sleep,
  summarizeAiStatus,
} from "./gemini.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "sessions.db"));

// ── Schéma ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'child',
    pin_hash   TEXT,
    avatar     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    letter     TEXT NOT NULL,
    correct    INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    mistakes   TEXT NOT NULL,
    user_id    INTEGER REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ai_sentences (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    letter       TEXT NOT NULL,
    sentence_json TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'active',
    source_model  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrace: přidej chybějící sloupce do starší DB
const cols = db.prepare("PRAGMA table_info(sessions)").all();
if (!cols.find((c) => c.name === "user_id")) {
  db.exec("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)");
}
if (!cols.find((c) => c.name === "duration_s")) {
  db.exec("ALTER TABLE sessions ADD COLUMN duration_s INTEGER");
}
const aiCols = db.prepare("PRAGMA table_info(ai_sentences)").all();
if (!aiCols.find((c) => c.name === "review_status")) {
  db.exec("ALTER TABLE ai_sentences ADD COLUMN review_status TEXT NOT NULL DEFAULT 'active'");
}
if (!aiCols.find((c) => c.name === "source_model")) {
  db.exec("ALTER TABLE ai_sentences ADD COLUMN source_model TEXT");
}

// ── Helpers ───────────────────────────────────────────────────────────────
const hashPin = (pin) => createHash("sha256").update("vs:" + pin).digest("hex");

const getSetting = (key) => db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
const setSetting = (key, value) => db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
const getJsonSetting = (key, fallback = null) => {
  const value = getSetting(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const setJsonSetting = (key, value) => setSetting(key, JSON.stringify(value));

// ── Gemini AI generování vět ──────────────────────────────────────────────
const WORD_HINTS = {
  M: "my, mýt, mýdlo, hmyz, myš, hlemýžď, přemýšlet, zamykat, omyl, dmýchat, smýkat, chm-ý-ří, mýtit. Chytáky (mi/mí): mísa, místo, mistr, milý, minuta, míč, minout.",
  P: "pytel, pýcha, pysk, pyl, kopýto, netopýr, klopýtat, pytlík. Chytáky (pi/pí): pilný, pilot, piknik, pivoňka, pila, píle, píseň, píšťalka, písmo, písek.",
  L: "lyže, lýtko, lysý, lyra, pelyněk, plytký, blýskat, polykat, plynout, plýtvat, vzlykat, palyhy. Chytáky (li/lí): líný, líbí, list, lípa, liška, líčko, lístek, limonáda.",
  B: "bydlet, byt, bylina, býk, kobyla, obyčej, bystrý, obyvatel, nábytek, dobytek. Chytáky (bi/bí): bílý, bitva, bič, bizon, bicykl, bída, bílek.",
  F: "fyzika, fyzický, fyzioterapeut, fyzioterapie, fyziologie, fyzikální. Chytáky (fi/fí): firma, film, fialový, fikus, figura, finance, figurka.",
  S: "syn, sýr, syrový, sytý, sýkora, sychravo, sypat, sysel, syčet, nasytit, sykavky. Chytáky (si/sí): silnice, síla, silný, sirup, Silvestr, sice.",
  V: "vy, výr, výt, vyžle, vydra, výskat, vysoký + předpony vy-/vý- (vyhrát, vyjet, výroba, vyprávět...). Chytáky (vi/ví): vidět, vítr, vím, violka, vítěz, vítat, víla, vír, virus, vinice.",
  Z: "zvyk, jazyk, brzy, nazývat, jazýček. Chytáky (zi/zí): zítra, zima, zimní, zírat, zisk, zívat.",
};
let mockAiSequence = 0;

function loadAiStatus() {
  return summarizeAiStatus(getJsonSetting("ai_status", {}));
}

function saveAiStatus(patch) {
  const current = loadAiStatus();
  const next = summarizeAiStatus({
    ...current,
    ...patch,
    last_event_at: new Date().toISOString(),
  });
  setJsonSetting("ai_status", next);
  return next;
}

function recordAiAttempt(event) {
  const current = loadAiStatus();
  const attempts = Array.isArray(current.last_attempts) ? current.last_attempts : [];
  const nextAttempts = [{ at: new Date().toISOString(), ...event }, ...attempts].slice(0, 12);
  return saveAiStatus({ ...current, last_attempts: nextAttempts });
}

function getExistingAiSignatures(letter) {
  const rows = db
    .prepare("SELECT sentence_json FROM ai_sentences WHERE letter = ? AND review_status = 'active'")
    .all(letter);
  const signatures = new Set();

  for (const row of rows) {
    try {
      const sentence = JSON.parse(row.sentence_json);
      const signature = sentence.parts
        ?.map((part) => ("text" in part ? part.text : part.blank))
        .join("")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (signature) signatures.add(signature);
    } catch {}
  }

  return signatures;
}

function trimAiSentenceCache(letter) {
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM ai_sentences WHERE letter = ? AND review_status = 'active'")
    .get(letter).n;
  const overflow = total - AI_SENTENCE_LIMIT_PER_LETTER;
  if (overflow <= 0) return total;

  db.prepare(
    `DELETE FROM ai_sentences
     WHERE id IN (
       SELECT id FROM ai_sentences
       WHERE letter = ? AND review_status = 'active'
       ORDER BY created_at ASC, id ASC
       LIMIT ?
     )`
  ).run(letter, overflow);

  return db
    .prepare("SELECT COUNT(*) AS n FROM ai_sentences WHERE letter = ? AND review_status = 'active'")
    .get(letter).n;
}

function getAiCounts() {
  const counts = {};
  for (const letter of ["M", "P", "L", "B", "F", "S", "V", "Z"]) {
    counts[letter] = db
      .prepare("SELECT COUNT(*) AS n FROM ai_sentences WHERE letter = ? AND review_status = 'active'")
      .get(letter).n;
  }
  return counts;
}

function getAiOverview() {
  const rows = db.prepare(`
    SELECT
      letter,
      review_status,
      COUNT(*) AS n
    FROM ai_sentences
    GROUP BY letter, review_status
    ORDER BY letter, review_status
  `).all();

  const overview = Object.fromEntries(["M", "P", "L", "B", "F", "S", "V", "Z"].map((letter) => [letter, { active: 0, hidden: 0, rejected: 0 }]));
  for (const row of rows) {
    if (overview[row.letter]) overview[row.letter][row.review_status] = row.n;
  }
  return overview;
}

async function listGeminiGenerateContentModels(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    console.warn(`[Gemini] ListModels selhal: HTTP ${response.status}`);
    return [];
  }

  const data = await response.json().catch(() => ({}));
  const models = Array.isArray(data.models) ? data.models : [];

  return models
    .filter((model) =>
      Array.isArray(model.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes("generateContent")
    )
    .map((model) => model.baseModelId || model.name?.replace(/^models\//, ""))
    .filter(Boolean);
}

async function generateSentencesFromGemini(letter, apiKey) {
  if (process.env.GEMINI_TEST_MODE === "1") {
    const existingSignatures = getExistingAiSignatures(letter);
    const base = mockAiSequence;
    mockAiSequence += GEMINI_SENTENCE_TARGET;
    const mockBatch = Array.from({ length: GEMINI_SENTENCE_TARGET }, (_, i) => ({
      before: `Testovací věta ${base + i + 1} pro ${letter} m`,
      blank: i % 2 === 0 ? "y" : "í",
      after: i % 2 === 0 ? "š vznikla při testu." : "sa vznikla při testu.",
    }));
    const sentences = normalizeGeminiSentenceBatch(mockBatch, existingSignatures);
    saveAiStatus({
      last_success_at: new Date().toISOString(),
      last_letter: letter,
      last_model: "mock-gemini",
      last_generated: sentences.length,
      tried_models: ["mock-gemini"],
      retries: 0,
      last_error: null,
      last_attempts: [{ at: new Date().toISOString(), letter, model: "mock-gemini", attempt: 1, outcome: "success", generated: sentences.length }],
    });
    return sentences;
  }

  const prompt = `Vygeneruj ${GEMINI_SENTENCE_TARGET} různých českých vět pro žáky 2.–5. třídy procvičující vyjmenovaná slova po písmenu ${letter}.

Slova k použití: ${WORD_HINTS[letter]}

Pravidla:
- Každá věta má PRÁVĚ JEDNO doplňovací místo (y/ý nebo i/í)
- Věty jsou přiměřené dětem, krátké a srozumitelné
- Zahrň přibližně 5 "chytáků" (slova kde se píše i/í, ne y/ý)
- Věty musí být gramaticky správné česky

Vrať POUZE kompaktní JSON pole bez markdownu, bez vysvětlení a ideálně na co nejméně znacích:
[
  {"before": "text před doplňovacím místem vč. písmene před y/ý/i/í", "blank": "y", "after": "zbytek slova a věty"},
  ...
]

Příklady správného rozdělení:
- "myš" → {"before": "Malá m", "blank": "y", "after": "š utekla do nory."}
- "přemýšlel" → {"before": "Dlouho přem", "blank": "ý", "after": "šlel nad úkolem."}
- "hmyz" → {"before": "Na louce bzučel hm", "blank": "y", "after": "z."}
- "mísa" → {"before": "Na stole stála velká m", "blank": "í", "after": "sa s ovocem."}
- "výr" → {"before": "Na skále seděl v", "blank": "ý", "after": "r."}`;

  let lastError = null;
  const triedModels = [];
  let totalRetries = 0;
  const availableModels = await listGeminiGenerateContentModels(apiKey);
  const modelCandidates = buildGeminiModelCandidates(availableModels);
  const existingSignatures = getExistingAiSignatures(letter);

  for (const model of modelCandidates) {
    let switchedModel = false;

    for (let attempt = 1; attempt <= GEMINI_MAX_MODEL_ATTEMPTS; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              responseSchema: GEMINI_SENTENCE_SCHEMA,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message = err.error?.message || `Gemini API chyba ${response.status}`;
        console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} HTTP ${response.status}: ${message}`);

        if (shouldSwitchGeminiModel(response.status, message)) {
          recordAiAttempt({ letter, model, attempt, outcome: "switch", error: message });
          triedModels.push(model);
          lastError = createGeminiError(`Model ${model}: ${message}`, { temporary: false });
          switchedModel = true;
          break;
        }

        if (isTemporaryGeminiError(response.status, message)) {
          recordAiAttempt({ letter, model, attempt, outcome: "retryable_error", error: message });
          lastError = createGeminiError(`Model ${model}: ${message}`, { temporary: true });
          if (attempt < GEMINI_MAX_MODEL_ATTEMPTS) {
            totalRetries++;
            await sleep(600 * attempt);
            continue;
          }
          triedModels.push(model);
          switchedModel = true;
          break;
        }

        throw new Error(message);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "";

      if (candidate?.finishReason === "MAX_TOKENS") {
        console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} finishReason=MAX_TOKENS`);
        recordAiAttempt({ letter, model, attempt, outcome: "max_tokens", error: "MAX_TOKENS" });
        lastError = createGeminiError(`Model ${model}: odpověď byla uříznutá kvůli limitu tokenů`, { temporary: true });
        triedModels.push(model);
        switchedModel = true;
        break;
      }

      let raw;
      try {
        raw = parseGeminiCandidateText(text, model);
      } catch (error) {
        console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} vrátil neparsovatelný obsah`);
        recordAiAttempt({ letter, model, attempt, outcome: "invalid_json", error: error.message });
        lastError = createGeminiError(`Model ${model}: ${error.message}`, { temporary: true });
        triedModels.push(model);
        switchedModel = true;
        break;
      }

      const sentences = normalizeGeminiSentenceBatch(raw, existingSignatures);

      if (sentences.length === 0) {
        console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} vrátil 0 validních vět`);
        recordAiAttempt({ letter, model, attempt, outcome: "empty_valid_batch", error: "No usable sentences" });
        lastError = createGeminiError(`Model ${model}: nevrátil žádné použitelné věty`, { temporary: true });
        triedModels.push(model);
        switchedModel = true;
        continue;
      }

      console.info(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} uspěl, vět=${sentences.length}`);
      recordAiAttempt({ letter, model, attempt, outcome: "success", generated: sentences.length });
      saveAiStatus({
        last_success_at: new Date().toISOString(),
        last_letter: letter,
        last_model: model,
        last_generated: sentences.length,
        tried_models: triedModels.length > 0 ? [...triedModels, model] : [model],
        retries: totalRetries,
        last_error: null,
      });
      return sentences;
    }

    if (switchedModel) {
      continue;
    }
  }

  if (lastError) {
    saveAiStatus({
      last_letter: letter,
      last_model: triedModels.at(-1) || null,
      last_generated: 0,
      tried_models: triedModels,
      retries: totalRetries,
      last_error: lastError.message,
    });
    const prefix = lastError.temporary
      ? "AI generování je teď dočasně nedostupné."
      : "AI generování teď není dostupné.";
    throw new Error(
      `${prefix} Vyzkoušené modely: ${triedModels.join(", ")}. Poslední chyba: ${lastError.message} Zkuste to prosím za chvíli znovu.`
    );
  }

  throw new Error(
    "Nepodařilo se najít žádný podporovaný Gemini model pro generateContent. Zkontrolujte dostupné modely pro tento API key v ListModels."
  );
}

// ── Express ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Rate limiting
app.use("/api/", rateLimit({ windowMs: 60_000, max: 60 }));
app.use("/api/sessions", rateLimit({ windowMs: 60_000, max: 10 }));

// Statické soubory React buildu
const PUBLIC_DIR = join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// ── Nastavení ─────────────────────────────────────────────────────────────

// Vrátí info o nastavení (klíč se nikdy neposílá klientovi)
app.get("/api/settings", (req, res) => {
  const keySet = !!getSetting("gemini_key");
  res.json({
    gemini_key_set: keySet,
    ai_counts: getAiCounts(),
    ai_overview: getAiOverview(),
    ai_status: loadAiStatus(),
    ai_limit_per_letter: AI_SENTENCE_LIMIT_PER_LETTER,
    ai_target_per_generate: GEMINI_SENTENCE_TARGET,
  });
});

// Ulož Gemini API klíč (nebo ho smaž prázdným stringem)
app.put("/api/settings", (req, res) => {
  const { gemini_key } = req.body;
  if (gemini_key !== undefined) {
    if (gemini_key === "") {
      db.prepare("DELETE FROM settings WHERE key = 'gemini_key'").run();
    } else {
      setSetting("gemini_key", gemini_key);
    }
  }
  res.json({ ok: true });
});

// ── AI věty ───────────────────────────────────────────────────────────────

// Vrátí uložené AI věty pro dané písmeno
app.get("/api/ai-sentences", (req, res) => {
  const { letter, include_meta } = req.query;
  if (!letter) return res.status(400).json({ error: "Chybí písmeno" });
  if (include_meta === "1") {
    const rows = db
      .prepare(`
        SELECT id, sentence_json, review_status, source_model, created_at
        FROM ai_sentences
        WHERE letter = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 120
      `)
      .all(letter);
    return res.json(rows.map((r) => ({ ...r, sentence: JSON.parse(r.sentence_json) })));
  }
  const rows = db
    .prepare("SELECT sentence_json FROM ai_sentences WHERE letter = ? AND review_status = 'active' ORDER BY RANDOM() LIMIT ?")
    .all(letter, AI_SENTENCE_FETCH_LIMIT);
  res.json(rows.map((r) => JSON.parse(r.sentence_json)));
});

app.put("/api/ai-sentences/:id", (req, res) => {
  const { review_status } = req.body;
  if (!["active", "hidden", "rejected"].includes(review_status)) {
    return res.status(400).json({ error: "Neplatný review_status" });
  }
  const existing = db.prepare("SELECT id, letter FROM ai_sentences WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "AI věta nenalezena" });
  db.prepare("UPDATE ai_sentences SET review_status = ? WHERE id = ?").run(review_status, req.params.id);
  const total = trimAiSentenceCache(existing.letter);
  res.json({ ok: true, total });
});

// Vygeneruj nové AI věty pro dané písmeno přes Gemini
app.post("/api/generate", async (req, res) => {
  const { letter } = req.body;
  if (!letter || !["M", "P", "L", "B", "F", "S", "V", "Z"].includes(letter)) {
    return res.status(400).json({ error: "Neplatné písmeno" });
  }
  const apiKey = getSetting("gemini_key");
  if (!apiKey) return res.status(400).json({ error: "Gemini API klíč není nastaven" });

  try {
    const sentences = await generateSentencesFromGemini(letter, apiKey);
    if (sentences.length === 0) throw new Error("Žádné věty se nepodařilo vygenerovat");

    const status = loadAiStatus();
    const insert = db.prepare("INSERT INTO ai_sentences (letter, sentence_json, review_status, source_model) VALUES (?, ?, 'active', ?)");
    const insertMany = db.transaction((sents) => {
      for (const s of sents) insert.run(letter, JSON.stringify(s), status.last_model || null);
    });
    insertMany(sentences);

    const total = trimAiSentenceCache(letter);
    res.json({ generated: sentences.length, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Smaž všechny AI věty pro dané písmeno
app.delete("/api/ai-sentences/:letter", (req, res) => {
  db.prepare("DELETE FROM ai_sentences WHERE letter = ?").run(req.params.letter);
  res.json({ ok: true });
});

app.delete("/api/ai-sentence/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM ai_sentences WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "AI věta nenalezena" });
  db.prepare("DELETE FROM ai_sentences WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Export všech vět (AI + lokální banka) jako CSV
app.get("/api/export-sentences", (req, res) => {
  const rows = db
    .prepare("SELECT id, letter, sentence_json, review_status, source_model, created_at FROM ai_sentences ORDER BY letter, created_at DESC")
    .all();

  const escape = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;

  const header = "Zdroj,ID,Písmeno,Věta (celá),Blank,Stav,Model,Datum";
  const lines = rows.map((row) => {
    let sentence = null;
    try { sentence = JSON.parse(row.sentence_json); } catch {}
    const fullText = sentence?.parts
      ? sentence.parts.map((p) => ("text" in p ? p.text : p.blank)).join("")
      : "";
    const blank = sentence?.parts?.find((p) => "blank" in p)?.blank ?? "";
    return [
      "AI",
      row.id,
      row.letter,
      escape(fullText),
      blank,
      row.review_status,
      escape(row.source_model ?? ""),
      escape(row.created_at ?? ""),
    ].join(",");
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"vety-ai.csv\"");
  res.send("\uFEFF" + [header, ...lines].join("\n"));
});

app.get("/api/ai-debug", (req, res) => {
  res.json({
    ai_status: loadAiStatus(),
    ai_overview: getAiOverview(),
    ai_counts: getAiCounts(),
    ai_limit_per_letter: AI_SENTENCE_LIMIT_PER_LETTER,
    ai_target_per_generate: GEMINI_SENTENCE_TARGET,
  });
});

// ── Uživatelé ─────────────────────────────────────────────────────────────

app.get("/api/users", (req, res) => {
  const users = db
    .prepare("SELECT id, name, role, avatar, created_at FROM users ORDER BY role DESC, name")
    .all();
  res.json(users);
});

app.post("/api/users", (req, res) => {
  const { name, role = "child", pin, avatar } = req.body;
  if (!name) return res.status(400).json({ error: "Chybí jméno" });
  if (role === "parent" && !pin) return res.status(400).json({ error: "Rodič musí mít PIN" });
  const pin_hash = pin ? hashPin(String(pin)) : null;
  const result = db
    .prepare("INSERT INTO users (name, role, pin_hash, avatar) VALUES (?, ?, ?, ?)")
    .run(name, role, pin_hash, avatar || null);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/users/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Uživatel nenalezen" });
  const name = req.body.name ?? user.name;
  const pin_hash = req.body.pin ? hashPin(String(req.body.pin)) : user.pin_hash;
  const avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
  db.prepare("UPDATE users SET name = ?, pin_hash = ?, avatar = ? WHERE id = ?")
    .run(name, pin_hash, avatar, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const { userId, pin } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "Uživatel nenalezen" });
  if (user.role === "parent") {
    if (!pin || hashPin(String(pin)) !== user.pin_hash) {
      return res.status(401).json({ error: "Špatný PIN" });
    }
  }
  res.json({ id: user.id, name: user.name, role: user.role, avatar: user.avatar });
});

// ── Sezení ────────────────────────────────────────────────────────────────

app.post("/api/sessions", (req, res) => {
  const { letter, correct, total, mistakes, userId, duration_s } = req.body;
  if (!letter || correct == null || total == null || !Array.isArray(mistakes)) {
    return res.status(400).json({ error: "Chybí povinná pole" });
  }
  const result = db
    .prepare("INSERT INTO sessions (letter, correct, total, mistakes, user_id, duration_s) VALUES (?, ?, ?, ?, ?, ?)")
    .run(letter, correct, total, JSON.stringify(mistakes), userId || null, duration_s || null);
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/sessions", (req, res) => {
  const { letter, limit = 200, userId } = req.query;
  const params = [];
  const conditions = [];
  if (letter) { conditions.push("letter = ?"); params.push(letter); }
  if (userId) { conditions.push("user_id = ?"); params.push(parseInt(userId)); }
  let query = "SELECT * FROM sessions";
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(parseInt(limit));
  const rows = db.prepare(query).all(...params);
  res.json(rows.map((r) => ({ ...r, mistakes: JSON.parse(r.mistakes) })));
});

app.get("/api/stats", (req, res) => {
  const { userId, byUser } = req.query;
  const params = [];
  let where = "";
  if (userId) { where = "WHERE user_id = ?"; params.push(parseInt(userId)); }
  if (byUser === "1") {
    const rows = db.prepare(`
      SELECT
        user_id,
        letter,
        COUNT(*)                                                  AS sessions,
        SUM(correct)                                              AS total_correct,
        SUM(total)                                                AS total_blanks,
        ROUND(AVG(CAST(correct AS FLOAT) / NULLIF(total, 0)) * 100, 1) AS avg_accuracy
      FROM sessions
      GROUP BY user_id, letter
      ORDER BY user_id, letter
    `).all();
    return res.json(rows);
  }
  const rows = db.prepare(`
    SELECT
      letter,
      COUNT(*)                                                  AS sessions,
      SUM(correct)                                              AS total_correct,
      SUM(total)                                                AS total_blanks,
      ROUND(AVG(CAST(correct AS FLOAT) / NULLIF(total, 0)) * 100, 1) AS avg_accuracy
    FROM sessions ${where}
    GROUP BY letter
    ORDER BY letter
  `).all(...params);
  res.json(rows);
});

// ── SPA fallback ──────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

const PORT = process.env.PORT || 3001;
export { app, db };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server běží na portu ${PORT}`);
  });
}
