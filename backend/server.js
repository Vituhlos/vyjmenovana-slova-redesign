import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "sessions.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    letter     TEXT NOT NULL,
    correct    INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    mistakes   TEXT NOT NULL
  )
`);

const app = express();
app.use(cors());
app.use(express.json());

// Max 30 požadavků za minutu na celé API
app.use("/api/", rateLimit({ windowMs: 60_000, max: 30 }));
// Max 10 uložení výsledků za minutu (jedno cvičení = 1 požadavek)
app.use("/api/sessions", rateLimit({ windowMs: 60_000, max: 10 }));

// Statické soubory React buildu
const PUBLIC_DIR = join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// Ulož výsledek cvičení
app.post("/api/sessions", (req, res) => {
  const { letter, correct, total, mistakes } = req.body;
  if (!letter || correct == null || total == null || !Array.isArray(mistakes)) {
    return res.status(400).json({ error: "Chybí povinná pole" });
  }
  const stmt = db.prepare(
    "INSERT INTO sessions (letter, correct, total, mistakes) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(letter, correct, total, JSON.stringify(mistakes));
  res.json({ id: result.lastInsertRowid });
});

// Načti historii (volitelně filtruj podle písmene)
app.get("/api/sessions", (req, res) => {
  const { letter, limit = 200 } = req.query;
  const params = [];
  let query = "SELECT * FROM sessions";
  if (letter) {
    query += " WHERE letter = ?";
    params.push(letter);
  }
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(parseInt(limit));
  const rows = db.prepare(query).all(...params);
  res.json(rows.map((r) => ({ ...r, mistakes: JSON.parse(r.mistakes) })));
});

// Souhrnné statistiky podle písmene
app.get("/api/stats", (req, res) => {
  const rows = db.prepare(`
    SELECT
      letter,
      COUNT(*)                                                  AS sessions,
      SUM(correct)                                              AS total_correct,
      SUM(total)                                                AS total_blanks,
      ROUND(AVG(CAST(correct AS FLOAT) / NULLIF(total, 0)) * 100, 1) AS avg_accuracy
    FROM sessions
    GROUP BY letter
    ORDER BY letter
  `).all();
  res.json(rows);
});

// SPA fallback — všechno ostatní vrátí index.html
app.get("*", (req, res) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server běží na portu ${PORT}`);
});
