import { useState } from "react";
import { LETTERS, TAB_META, TAHAK_DATA } from "../../../lib/theme";
import { useTheme } from "../../../context/ThemeContext";
import styles from "./TahakOverlay.module.css";

export default function TahakOverlay({ onClose }) {
  const [tab, setTab] = useState("M");
  const { darkMode } = useTheme();

  const entry = TAHAK_DATA[tab];
  const meta = TAB_META[tab];

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>📖 Tahák — vyjmenovaná slova</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Letter tabs */}
        <div className={styles.tabs}>
          {LETTERS.map((l) => (
            <button
              key={l}
              className={`chip ${tab === l ? styles.tabActive : styles.tabInactive}`}
              style={tab === l ? { background: TAB_META[l].accent, color: "white" } : {}}
              onClick={() => setTab(l)}
            >
              {TAB_META[l].emoji} {l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.sectionTitle} style={{ color: meta.color }}>
            Vyjmenovaná slova po {tab}
          </div>

          <div className={styles.wordGrid}>
            {entry.words.map((w) => (
              <span
                key={w}
                className={styles.wordChip}
                style={{
                  background: darkMode ? `${meta.accent}22` : meta.bg,
                  color: meta.color,
                  borderColor: `${meta.accent}66`,
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {entry.note && (
            <div className={styles.note}>{entry.note}</div>
          )}

          <div className={styles.trickyTitle}>⚠️ Chytáky — píší se s i/í</div>
          <div className={styles.wordGrid}>
            {entry.tricky.map((w) => (
              <span key={w} className={styles.trickyChip}>{w}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
