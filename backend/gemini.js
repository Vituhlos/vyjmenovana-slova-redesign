export const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
].filter(Boolean);

export const GEMINI_SENTENCE_TARGET = 20;
export const GEMINI_MAX_MODEL_ATTEMPTS = 3;
export const AI_SENTENCE_LIMIT_PER_LETTER = 120;
export const AI_SENTENCE_FETCH_LIMIT = 80;

const GEMINI_TEMPORARY_ERROR_RE = /rate limit|high demand|try again later|temporarily unavailable|overloaded|internal error|backend error/i;
const GEMINI_SWITCH_MODEL_ERROR_RE = /not found|not supported|quota exceeded/i;

export const GEMINI_SENTENCE_SCHEMA = {
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

const VALID_BLANKS = new Set(["y", "ý", "i", "í"]);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createGeminiError = (message, extra = {}) => Object.assign(new Error(message), extra);

export const isTemporaryGeminiError = (status, message) =>
  status === 429 || GEMINI_TEMPORARY_ERROR_RE.test(message);

export const shouldSwitchGeminiModel = (status, message) =>
  status === 404 || GEMINI_SWITCH_MODEL_ERROR_RE.test(message);

export function buildGeminiModelCandidates(availableModels) {
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

export function normalizeSentenceParts(sentence) {
  if (!sentence || typeof sentence.before !== "string" || typeof sentence.after !== "string") {
    return null;
  }

  const before = sentence.before.replace(/\s+/g, " ").trim();
  const after = sentence.after.replace(/\s+/g, " ").trim();
  const blank = typeof sentence.blank === "string" ? sentence.blank.trim() : "";

  if (!VALID_BLANKS.has(blank)) return null;
  if (before.length < 1 || after.length < 1) return null;

  const fullText = `${before}${blank}${after}`.replace(/\s+/g, " ").trim();
  if (fullText.length < 8 || fullText.length > 160) return null;
  if (!/[.?!]$/.test(fullText)) return null;
  if (!/[A-Za-zÀ-ž]/.test(before) || !/[A-Za-zÀ-ž]/.test(after)) return null;
  if ((before.match(/[.?!]/g) || []).length > 1 || (after.match(/[.?!]/g) || []).length > 1) return null;

  return {
    before,
    blank,
    after,
    parts: [{ text: before }, { blank }, { text: after }],
  };
}

export function sentenceSignatureFromParts(parts) {
  if (!Array.isArray(parts)) return null;
  const combined = parts
    .map((part) => ("text" in part ? part.text : part.blank))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return combined || null;
}

export function dedupeSentenceEntries(entries, existingSignatures = new Set()) {
  const unique = [];
  const seen = new Set(existingSignatures);

  for (const entry of entries) {
    const signature = sentenceSignatureFromParts(entry.parts);
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    unique.push(entry);
  }

  return unique;
}

export function parseGeminiCandidateText(text, model) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`Neplatná odpověď z Gemini (${model}) — žádné JSON pole`);
    }
    return JSON.parse(jsonMatch[0]);
  }
}

export function normalizeGeminiSentenceBatch(rawBatch, existingSignatures = new Set()) {
  const normalized = Array.isArray(rawBatch)
    ? rawBatch.map(normalizeSentenceParts).filter(Boolean)
    : [];

  return dedupeSentenceEntries(normalized, existingSignatures);
}

export function summarizeAiStatus(status = {}) {
  return {
    last_event_at: status.last_event_at || null,
    last_success_at: status.last_success_at || null,
    last_letter: status.last_letter || null,
    last_model: status.last_model || null,
    last_generated: status.last_generated || 0,
    tried_models: Array.isArray(status.tried_models) ? status.tried_models : [],
    retries: Number.isFinite(status.retries) ? status.retries : 0,
    last_error: status.last_error || null,
    last_attempts: Array.isArray(status.last_attempts) ? status.last_attempts : [],
  };
}
