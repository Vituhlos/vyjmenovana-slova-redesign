import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_SENTENCE_LIMIT_PER_LETTER,
  GEMINI_SENTENCE_SCHEMA,
  buildGeminiModelCandidates,
  dedupeSentenceEntries,
  normalizeGeminiSentenceBatch,
  normalizeSentenceParts,
  parseGeminiCandidateText,
  sentenceSignatureFromParts,
  summarizeAiStatus,
} from "./gemini.js";

test("schema contains expected blanks", () => {
  assert.deepEqual(GEMINI_SENTENCE_SCHEMA.items.properties.blank.enum, ["y", "ý", "i", "í"]);
});

test("buildGeminiModelCandidates prefers flash models without duplicates", () => {
  const models = buildGeminiModelCandidates(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]);
  assert.equal(models[0], "gemini-2.5-flash");
  assert.equal(new Set(models).size, models.length);
  assert.ok(models.includes("gemini-2.5-pro"));
});

test("normalizeSentenceParts accepts a valid sentence", () => {
  const result = normalizeSentenceParts({
    before: "Malá m",
    blank: "y",
    after: "š utekla do nory.",
  });

  assert.equal(result.blank, "y");
  assert.equal(result.parts.length, 3);
});

test("normalizeSentenceParts rejects malformed content", () => {
  assert.equal(normalizeSentenceParts({ before: "", blank: "y", after: "test." }), null);
  assert.equal(normalizeSentenceParts({ before: "Krátké", blank: "x", after: " slovo." }), null);
  assert.equal(normalizeSentenceParts({ before: "Bez tečky", blank: "y", after: " konec" }), null);
});

test("sentenceSignatureFromParts normalizes case and whitespace", () => {
  const signature = sentenceSignatureFromParts([
    { text: "Malá   m" },
    { blank: "Y" },
    { text: "š utekla  do nory." },
  ]);
  assert.equal(signature, "malá myš utekla do nory.");
});

test("dedupeSentenceEntries removes duplicates against existing signatures and within batch", () => {
  const entries = [
    { parts: [{ text: "Malá m" }, { blank: "y" }, { text: "š utekla do nory." }] },
    { parts: [{ text: "Malá m" }, { blank: "y" }, { text: "š utekla do nory." }] },
    { parts: [{ text: "Na stole stála velká m" }, { blank: "í" }, { text: "sa s ovocem." }] },
  ];

  const result = dedupeSentenceEntries(entries, new Set(["malá myš utekla do nory."]));
  assert.equal(result.length, 1);
});

test("parseGeminiCandidateText parses raw JSON and markdown-wrapped JSON", () => {
  const plain = parseGeminiCandidateText('[{"before":"m","blank":"y","after":"š."}]', "gemini-2.5-flash");
  const wrapped = parseGeminiCandidateText('```json\n[{"before":"m","blank":"y","after":"š."}]\n```', "gemini-2.5-flash");
  assert.equal(plain.length, 1);
  assert.equal(wrapped.length, 1);
});

test("normalizeGeminiSentenceBatch filters invalid sentences and deduplicates", () => {
  const batch = [
    { before: "Malá m", blank: "y", after: "š utekla do nory." },
    { before: "Malá m", blank: "y", after: "š utekla do nory." },
    { before: "A", blank: "y", after: "!" },
    { before: "Na stole stála velká m", blank: "í", after: "sa s ovocem." },
  ];

  const result = normalizeGeminiSentenceBatch(batch);
  assert.equal(result.length, 2);
});

test("summarizeAiStatus normalizes missing values", () => {
  const status = summarizeAiStatus({ retries: 2, tried_models: ["gemini-2.5-flash"] });
  assert.equal(status.retries, 2);
  assert.equal(status.last_error, null);
  assert.deepEqual(status.tried_models, ["gemini-2.5-flash"]);
});

test("sentence limit constant stays in sync with cache expectations", () => {
  assert.equal(AI_SENTENCE_LIMIT_PER_LETTER, 120);
});
