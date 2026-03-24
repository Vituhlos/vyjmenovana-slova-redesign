import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { AI_SENTENCE_LIMIT_PER_LETTER, GEMINI_SENTENCE_TARGET } from "./gemini.js";

process.env.NODE_ENV = "test";
process.env.GEMINI_TEST_MODE = "1";
process.env.DATA_DIR = mkdtempSync(join(os.tmpdir(), "vs-ai-test-"));

const { app, db } = await import("./server.js");

let server;
let baseUrl;

before(async () => {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_key', 'test-key')").run();
  server = await new Promise((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  server?.close();
  db.close();
});

test("GET /api/settings returns AI metadata", async () => {
  const res = await fetch(`${baseUrl}/api/settings`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.gemini_key_set, true);
  assert.equal(data.ai_limit_per_letter, AI_SENTENCE_LIMIT_PER_LETTER);
  assert.equal(data.ai_target_per_generate, GEMINI_SENTENCE_TARGET);
  assert.ok(data.ai_overview);
});

test("POST /api/generate stores AI sentences and updates status", async () => {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ letter: "M" }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.generated, GEMINI_SENTENCE_TARGET);

  const settingsRes = await fetch(`${baseUrl}/api/settings`);
  const settings = await settingsRes.json();
  assert.equal(settings.ai_counts.M, GEMINI_SENTENCE_TARGET);
  assert.equal(settings.ai_status.last_model, "mock-gemini");
  assert.equal(settings.ai_status.last_generated, GEMINI_SENTENCE_TARGET);
});

test("AI review endpoints can hide, reject, restore, and delete sentences", async () => {
  const listRes = await fetch(`${baseUrl}/api/ai-sentences?letter=M&include_meta=1`);
  const items = await listRes.json();
  assert.ok(items.length > 0);

  const firstId = items[0].id;

  let res = await fetch(`${baseUrl}/api/ai-sentences/${firstId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_status: "hidden" }),
  });
  assert.equal(res.status, 200);

  res = await fetch(`${baseUrl}/api/ai-sentences/${firstId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_status: "rejected" }),
  });
  assert.equal(res.status, 200);

  res = await fetch(`${baseUrl}/api/ai-sentences/${firstId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_status: "active" }),
  });
  assert.equal(res.status, 200);

  res = await fetch(`${baseUrl}/api/ai-sentence/${firstId}`, { method: "DELETE" });
  assert.equal(res.status, 200);
});

test("AI cache is trimmed to the configured limit", async () => {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter: "P" }),
    });
    assert.equal(res.status, 200);
  }

  const settingsRes = await fetch(`${baseUrl}/api/settings`);
  const settings = await settingsRes.json();
  assert.equal(settings.ai_counts.P, AI_SENTENCE_LIMIT_PER_LETTER);

  const debugRes = await fetch(`${baseUrl}/api/ai-debug`);
  const debug = await debugRes.json();
  assert.equal(debug.ai_limit_per_letter, AI_SENTENCE_LIMIT_PER_LETTER);
  assert.equal(debug.ai_overview.P.active, AI_SENTENCE_LIMIT_PER_LETTER);
});
