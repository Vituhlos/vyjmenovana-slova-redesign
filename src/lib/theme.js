export const TAB_META = {
  M: { color: "#c0392b", bg: "#fff5f5", accent: "#e74c3c", emoji: "🐭" },
  P: { color: "#6c3483", bg: "#fdf2ff", accent: "#8e44ad", emoji: "🎒" },
  L: { color: "#1a5e34", bg: "#f0fff5", accent: "#27ae60", emoji: "⛷️" },
  B: { color: "#154360", bg: "#f0f8ff", accent: "#2980b9", emoji: "🏠" },
  F: { color: "#7d3c00", bg: "#fff8f0", accent: "#e67e22", emoji: "🧪" },
  S: { color: "#1a4e0d", bg: "#f5fff0", accent: "#27ae60", emoji: "🧀" },
  V: { color: "#0d3b5e", bg: "#f0faff", accent: "#2471a3", emoji: "🦦" },
  Z: { color: "#4a0050", bg: "#fdf5ff", accent: "#8e44ad", emoji: "🔔" },
};

export const MIX_META = { color: "#5d4e8a", bg: "#f5f2ff", accent: "#7f6ccc", emoji: "🎲" };
export const REVIEW_META = { color: "#1a5e34", bg: "#f0fff5", accent: "#27ae60", emoji: "🔁" };

export const LETTERS = Object.keys(TAB_META);

export const AVATAR_COLORS = [
  "#e74c3c", "#8e44ad", "#27ae60", "#2980b9",
  "#e67e22", "#16a085", "#d35400", "#7f8c8d",
];

export const avatarColor = (id) =>
  AVATAR_COLORS[((id ?? 0) - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length];

export const TAHAK_DATA = {
  M: {
    words: ["my", "mýt", "mýdlo", "hmyz", "myš", "hlemýžď", "přemýšlet", "zamykat", "omyl", "dmýchat", "smýkat", "chm-ý-ří", "mýtit"],
    tricky: ["mísa", "místo", "mistr", "milý", "minuta", "míč", "minout"],
  },
  P: {
    words: ["pytel", "pýcha", "pysk", "pyl", "kopýto", "netopýr", "klopýtat", "pytlík"],
    tricky: ["pilný", "pilot", "piknik", "pivoňka", "pila", "píle", "píseň", "píšťalka", "písmo", "písek"],
  },
  L: {
    words: ["lyže", "lýtko", "lysý", "lyra", "pelyněk", "plytký", "blýskat", "polykat", "plynout", "plýtvat", "vzlykat", "palyhy"],
    tricky: ["líný", "líbí", "list", "lípa", "liška", "líčko", "lístek", "limonáda"],
  },
  B: {
    words: ["bydlet", "byt", "bylina", "býk", "kobyla", "obyčej", "bystrý", "obyvatel", "nábytek", "dobytek"],
    tricky: ["bílý", "bitva", "bič", "bizon", "bicykl", "bída", "bílek"],
  },
  F: {
    words: ["fyzika", "fyzický", "fyzioterapeut", "fyzioterapie", "fyziologie", "fyzikální"],
    tricky: ["firma", "film", "fialový", "fikus", "figura", "finance", "figurka"],
  },
  S: {
    words: ["syn", "sýr", "syrový", "sytý", "sýkora", "sychravo", "sypat", "sysel", "syčet", "nasytit"],
    tricky: ["silnice", "síla", "silný", "sirup", "Silvestr", "sice"],
  },
  V: {
    words: ["vy", "výr", "výt", "vyžle", "vydra", "výskat", "vysoký"],
    note: "Předpony vy-/vý-: vyhrát, vyjet, výroba, vyprávět, vybrat, výběr, vyučovat…",
    tricky: ["vidět", "vítr", "vím", "violka", "vítěz", "vítat", "víla", "vír", "virus", "vinice"],
  },
  Z: {
    words: ["zvyk", "jazyk", "brzy", "nazývat", "jazýček"],
    tricky: ["zítra", "zima", "zimní", "zírat", "zisk", "zívat"],
  },
};

export const getTabMeta = (tab) => {
  if (tab === "MIX") return MIX_META;
  if (tab === "REVIEW") return REVIEW_META;
  return TAB_META[tab] ?? MIX_META;
};
