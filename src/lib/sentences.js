import { CATEGORY_ORDER, getSentencePoolByCategories } from "../sentenceBank";
import { LETTERS } from "./theme";

export { CATEGORY_ORDER };

export const SELECTABLE_CATS = CATEGORY_ORDER.filter((c) => c !== "trickQuestions");

const SEEN_MAX = 80;

export function getSeenSigs(letter) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`vs_seen_${letter}`) || "[]"));
  } catch {
    return new Set();
  }
}

export function addSeenSigs(letter, sigs) {
  try {
    const prev = JSON.parse(localStorage.getItem(`vs_seen_${letter}`) || "[]");
    localStorage.setItem(
      `vs_seen_${letter}`,
      JSON.stringify([...prev, ...sigs].slice(-SEEN_MAX))
    );
  } catch {}
}

function shuffle(pool) {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function signature(sentence) {
  return sentence.parts
    .map((p) => ("text" in p ? p.text : p.blank))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function family(sentence) {
  return signature(sentence).slice(0, 28);
}

export function pickSentences(letter, count, cats, aiSentences = [], seenSignatures = new Set()) {
  const selectedCats = cats && cats.length > 0
    ? cats
    : CATEGORY_ORDER.filter((c) => c !== "trickQuestions");
  const catsWithTricks = [...new Set([...selectedCats, "trickQuestions"])];

  const localPool = (
    letter === "MIX"
      ? LETTERS.flatMap((l) => getSentencePoolByCategories(l, catsWithTricks))
      : getSentencePoolByCategories(letter, catsWithTricks)
  ).map((s) => ({ ...s, _source: "local" }));

  const aiPool = aiSentences.map((s) => ({ ...s, _source: "ai" }));

  const byUnseen = (pool) => {
    const s = shuffle(pool);
    return [
      ...s.filter((x) => !seenSignatures.has(signature(x))),
      ...s.filter((x) => seenSignatures.has(signature(x))),
    ];
  };

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
      usedSignatures.add(signature(candidate));
    }
  }

  return selected.slice(0, Math.min(count, selected.length));
}

export function sentenceSignature(sentence) {
  return sentence.parts
    .map((p) => ("text" in p ? p.text : p.blank))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function formatDateTime(value) {
  if (!value) return "—";
  const normalized =
    typeof value === "string" && !value.endsWith("Z") && !value.includes("+")
      ? value.replace(" ", "T") + "Z"
      : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("cs-CZ")} ${date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
