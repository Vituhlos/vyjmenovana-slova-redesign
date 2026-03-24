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

// Migrace: přidej user_id do starší DB bez tohoto sloupce
const cols = db.prepare("PRAGMA table_info(sessions)").all();
if (!cols.find((c) => c.name === "user_id")) {
  db.exec("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

// ── Helpers ───────────────────────────────────────────────────────────────
const hashPin = (pin) => createHash("sha256").update("vs:" + pin).digest("hex");

// ── Express ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // profilovky jsou base64, potřebujeme větší limit

// Rate limiting
app.use("/api/", rateLimit({ windowMs: 60_000, max: 60 }));
app.use("/api/sessions", rateLimit({ windowMs: 60_000, max: 10 }));

// Statické soubory React buildu
const PUBLIC_DIR = join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// ── Uživatelé ─────────────────────────────────────────────────────────────

// Vrátí seznam uživatelů (bez pin_hash)
app.get("/api/users", (req, res) => {
  const users = db
    .prepare("SELECT id, name, role, avatar, created_at FROM users ORDER BY role DESC, name")
    .all();
  res.json(users);
});

// Vytvoř uživatele
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

// Uprav uživatele (jméno, avatar, PIN)
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

// Smaž uživatele
app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Přihlášení (ověř PIN pro rodiče)
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
  const { letter, correct, total, mistakes, userId } = req.body;
  if (!letter || correct == null || total == null || !Array.isArray(mistakes)) {
    return res.status(400).json({ error: "Chybí povinná pole" });
  }
  const result = db
    .prepare("INSERT INTO sessions (letter, correct, total, mistakes, user_id) VALUES (?, ?, ?, ?, ?)")
    .run(letter, correct, total, JSON.stringify(mistakes), userId || null);
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
  const { userId } = req.query;
  const params = [];
  let where = "";
  if (userId) { where = "WHERE user_id = ?"; params.push(parseInt(userId)); }
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
