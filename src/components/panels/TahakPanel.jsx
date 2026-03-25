import { useState } from "react";
import SlidePanel from "./SlidePanel.jsx";

const TAB_META = {
  M: { color: "#c0392b", accent: "#e74c3c", bg: "#fff5f5", emoji: "🐭" },
  P: { color: "#6c3483", accent: "#8e44ad", bg: "#fdf2ff", emoji: "🎒" },
  L: { color: "#1a5e34", accent: "#27ae60", bg: "#f0fff5", emoji: "⛷️" },
  B: { color: "#154360", accent: "#2980b9", bg: "#f0f8ff", emoji: "🏠" },
  F: { color: "#7d3c00", accent: "#e67e22", bg: "#fff8f0", emoji: "🧪" },
  S: { color: "#1a4e0d", accent: "#27ae60", bg: "#f5fff0", emoji: "🧀" },
  V: { color: "#0d3b5e", accent: "#2471a3", bg: "#f0faff", emoji: "🦦" },
  Z: { color: "#4a0050", accent: "#8e44ad", bg: "#fdf5ff", emoji: "🔔" },
};

const TAHAK_DATA = {
  M: { words: ["my", "mýt", "mýdlo", "hmyz", "myš", "hlemýžď", "přemýšlet", "zamykat", "omyl", "dmýchat", "smýkat", "chm-ý-ří", "mýtit"], tricky: ["mísa", "místo", "mistr", "milý", "minuta", "míč", "minout"] },
  P: { words: ["pytel", "pýcha", "pysk", "pyl", "kopýto", "netopýr", "klopýtat", "pytlík"], tricky: ["pilný", "pilot", "piknik", "pivoňka", "pila", "píle", "píseň", "píšťalka", "písmo", "písek"] },
  L: { words: ["lyže", "lýtko", "lysý", "lyra", "pelyněk", "plytký", "blýskat", "polykat", "plynout", "plýtvat", "vzlykat", "palyhy"], tricky: ["líný", "líbí", "list", "lípa", "liška", "líčko", "lístek", "limonáda"] },
  B: { words: ["bydlet", "byt", "bylina", "býk", "kobyla", "obyčej", "bystrý", "obyvatel", "nábytek", "dobytek"], tricky: ["bílý", "bitva", "bič", "bizon", "bicykl", "bída", "bílek"] },
  F: { words: ["fyzika", "fyzický", "fyzioterapeut", "fyzioterapie", "fyziologie", "fyzikální"], tricky: ["firma", "film", "fialový", "fikus", "figura", "finance", "figurka"] },
  S: { words: ["syn", "sýr", "syrový", "sytý", "sýkora", "sychravo", "sypat", "sysel", "syčet", "nasytit"], tricky: ["silnice", "síla", "silný", "sirup", "Silvestr", "sice"] },
  V: { words: ["vy", "výr", "výt", "vyžle", "vydra", "výskat", "vysoký"], note: "Předpony vy-/vý-: vyhrát, vyjet, výroba, vyprávět, vybrat, výběr, vyučovat…", tricky: ["vidět", "vítr", "vím", "violka", "vítěz", "vítat", "víla", "vír", "virus", "vinice"] },
  Z: { words: ["zvyk", "jazyk", "brzy", "nazývat", "jazýček"], tricky: ["zítra", "zima", "zimní", "zírat", "zisk", "zívat"] },
};

export default function TahakPanel({ onClose, darkMode }) {
  const [activeTab, setActiveTab] = useState("M");
  const dark = darkMode;
  const entry = TAHAK_DATA[activeTab];
  const meta = TAB_META[activeTab];

  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const borderColor = dark ? "border-gray-800" : "border-gray-100";
  const bg = dark ? "bg-gray-900" : "bg-white";

  return (
    <SlidePanel title="📖 Tahák — vyjmenovaná slova" onClose={onClose} darkMode={darkMode}>
      {/* Letter tabs */}
      <div className={`flex flex-wrap gap-2 px-5 py-3 border-b ${borderColor} ${bg} sticky top-0 z-10`}>
        {Object.entries(TAB_META).map(([letter, m]) => (
          <button
            key={letter}
            onClick={() => setActiveTab(letter)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={activeTab === letter
              ? { background: m.accent, color: "white" }
              : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
            }
          >
            {m.emoji} {letter}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {/* Title */}
        <h2 className="font-extrabold text-base mb-4" style={{ color: meta.color }}>
          Vyjmenovaná slova po {activeTab}
        </h2>

        {/* Words */}
        <div className="flex flex-wrap gap-2 mb-6">
          {entry.words.map(w => (
            <span
              key={w}
              className="px-3 py-1.5 rounded-xl font-serif font-semibold text-sm border-2"
              style={{
                background: dark ? `${meta.accent}18` : meta.bg,
                color: meta.color,
                borderColor: meta.accent + "55",
              }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Note */}
        {entry.note && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-serif italic mb-5 ${
            dark ? "border-gray-700 bg-gray-800 text-gray-400" : "border-gray-100 bg-gray-50 text-gray-500"
          }`}>
            {entry.note}
          </div>
        )}

        {/* Tricky words */}
        <h3 className="font-extrabold text-sm mb-3 text-red-500">⚠️ Chytáky — píší se s i/í</h3>
        <div className="flex flex-wrap gap-2">
          {entry.tricky.map(w => (
            <span
              key={w}
              className={`px-3 py-1.5 rounded-xl font-serif font-semibold text-sm border-2 ${
                dark ? "border-red-900 bg-red-950 text-red-400" : "border-red-100 bg-red-50 text-red-600"
              }`}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </SlidePanel>
  );
}
