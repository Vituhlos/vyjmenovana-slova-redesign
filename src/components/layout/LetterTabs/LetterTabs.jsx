import { TAB_META, MIX_META, REVIEW_META, LETTERS } from "../../../lib/theme";
import styles from "./LetterTabs.module.css";

export default function LetterTabs({ activeTab, score, onSelect, showReview = true }) {
  const ScoreBadge = ({ tab }) =>
    score?.[tab] ? (
      <span className={styles.scoreBadge}>
        {score[tab].correct}/{score[tab].total}
      </span>
    ) : null;

  return (
    <nav className={styles.nav}>
      <div className={styles.scrollArea}>
        {LETTERS.map((letter) => {
          const meta = TAB_META[letter];
          const active = activeTab === letter;
          return (
            <button
              key={letter}
              className={`${styles.tab} ${active ? styles.active : ""}`}
              style={
                active
                  ? { background: meta.accent, color: "white", borderColor: meta.accent, boxShadow: `0 4px 16px ${meta.accent}55` }
                  : { background: "var(--tab-inactive-bg)", color: meta.accent, borderColor: meta.accent }
              }
              onClick={() => onSelect(letter)}
            >
              <span className={styles.emoji}>{meta.emoji}</span>
              <span className={styles.label}>Po {letter}</span>
              <ScoreBadge tab={letter} />
            </button>
          );
        })}

        {/* MIX */}
        <button
          className={`${styles.tab} ${activeTab === "MIX" ? styles.active : ""}`}
          style={
            activeTab === "MIX"
              ? { background: MIX_META.accent, color: "white", borderColor: MIX_META.accent, boxShadow: `0 4px 16px ${MIX_META.accent}55` }
              : { background: "var(--tab-inactive-bg)", color: MIX_META.accent, borderColor: MIX_META.accent }
          }
          onClick={() => onSelect("MIX")}
        >
          <span className={styles.emoji}>{MIX_META.emoji}</span>
          <span className={styles.label}>MIX</span>
          <ScoreBadge tab="MIX" />
        </button>

        {/* REVIEW (jen pro děti) */}
        {showReview && (
          <button
            className={`${styles.tab} ${activeTab === "REVIEW" ? styles.active : ""}`}
            style={
              activeTab === "REVIEW"
                ? { background: REVIEW_META.accent, color: "white", borderColor: REVIEW_META.accent, boxShadow: `0 4px 16px ${REVIEW_META.accent}55` }
                : { background: "var(--tab-inactive-bg)", color: REVIEW_META.accent, borderColor: REVIEW_META.accent }
            }
            onClick={() => onSelect("REVIEW")}
          >
            <span className={styles.emoji}>{REVIEW_META.emoji}</span>
            <span className={styles.label}>Procvič chyby</span>
            <ScoreBadge tab="REVIEW" />
          </button>
        )}
      </div>
    </nav>
  );
}
