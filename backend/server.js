import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
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

// ── Helpers ───────────────────────────────────────────────────────────────
const hashPin = (pin) => createHash("sha256").update("vs:" + pin).digest("hex");

const getSetting = (key) => db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
const setSetting = (key, value) => db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);

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

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
].filter(Boolean);

const GEMINI_SENTENCE_TARGET = 20;
const GEMINI_MAX_MODEL_ATTEMPTS = 3;
const GEMINI_TEMPORARY_ERROR_RE = /rate limit|high demand|try again later|temporarily unavailable|overloaded|internal error|backend error/i;
const GEMINI_SWITCH_MODEL_ERROR_RE = /not found|not supported|quota exceeded/i;

const GEMINI_SENTENCE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      before: { type: "string" },
      blank: { type: "string", enum: ["y", "ý", "i", "í"] },
      after: { type: "string" },
    },
    required: ["before", "blank", "after"],
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createGeminiError = (message, extra = {}) => Object.assign(new Error(message), extra);

const isTemporaryGeminiError = (status, message) =>
  status === 429 || GEMINI_TEMPORARY_ERROR_RE.test(message);

const shouldSwitchGeminiModel = (status, message) =>
  status === 404 || GEMINI_SWITCH_MODEL_ERROR_RE.test(message);

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

function buildGeminiModelCandidates(availableModels) {
  const preferred = [];
  const seen = new Set();

  const add = (model) => {
    if (!model || seen.has(model)) return;
    seen.add(model);
    preferred.push(model);
  };

  for (const model of GEMINI_MODEL_CANDIDATES) add(model);

  for (const model of availableModels) {
    if (/flash/i.test(model)) add(model);
  }

  for (const model of availableModels) add(model);

  return preferred;
}

async function generateSentencesFromGemini(letter, apiKey) {
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
  const availableModels = await listGeminiGenerateContentModels(apiKey);
  const modelCandidates = buildGeminiModelCandidates(availableModels);

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
          triedModels.push(model);
          lastError = createGeminiError(`Model ${model}: ${message}`, { temporary: false });
          switchedModel = true;
          break;
        }

        if (isTemporaryGeminiError(response.status, message)) {
          lastError = createGeminiError(`Model ${model}: ${message}`, { temporary: true });
          if (attempt < GEMINI_MAX_MODEL_ATTEMPTS) {
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
        lastError = createGeminiError(`Model ${model}: odpověď byla uříznutá kvůli limitu tokenů`, { temporary: true });
        triedModels.push(model);
        switchedModel = true;
        break;
      }

      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} vrátil neparsovatelný obsah`);
          lastError = createGeminiError(`Model ${model}: nevrátil validní JSON pole`, { temporary: true });
          triedModels.push(model);
          switchedModel = true;
          break;
        }
        raw = JSON.parse(jsonMatch[0]);
      }

      const sentences = raw
        .filter((s) =>
          typeof s.before === "string" &&
          typeof s.after === "string" &&
          ["y", "ý", "i", "í"].includes(s.blank)
        )
        .map((s) => ({
          parts: [{ text: s.before }, { blank: s.blank }, { text: s.after }],
        }));

      if (sentences.length === 0) {
        console.warn(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} vrátil 0 validních vět`);
        lastError = createGeminiError(`Model ${model}: nevrátil žádné použitelné věty`, { temporary: true });
        triedModels.push(model);
        switchedModel = true;
        continue;
      }

      console.info(`[Gemini] model=${model} attempt=${attempt}/${GEMINI_MAX_MODEL_ATTEMPTS} uspěl, vět=${sentences.length}`);
      return sentences;
    }

    if (switchedModel) {
      continue;
    }
  }

  if (lastError) {
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
  const counts = {};
  for (const letter of ["M", "P", "L", "B", "F", "S", "V", "Z"]) {
    counts[letter] = db.prepare("SELECT COUNT(*) AS n FROM ai_sentences WHERE letter = ?").get(letter).n;
  }
  res.json({ gemini_key_set: keySet, ai_counts: counts });
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
  const { letter } = req.query;
  if (!letter) return res.status(400).json({ error: "Chybí písmeno" });
  const rows = db.prepare("SELECT sentence_json FROM ai_sentences WHERE letter = ? ORDER BY RANDOM() LIMIT 80").all(letter);
  res.json(rows.map((r) => JSON.parse(r.sentence_json)));
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

    const insert = db.prepare("INSERT INTO ai_sentences (letter, sentence_json) VALUES (?, ?)");
    const insertMany = db.transaction((sents) => {
      for (const s of sents) insert.run(letter, JSON.stringify(s));
    });
    insertMany(sentences);

    const total = db.prepare("SELECT COUNT(*) AS n FROM ai_sentences WHERE letter = ?").get(letter).n;
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server běží na portu ${PORT}`);
});
