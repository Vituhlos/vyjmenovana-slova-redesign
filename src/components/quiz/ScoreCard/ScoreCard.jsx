import styles from "./ScoreCard.module.css";

export default function ScoreCard({ correct, total }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isPerfect = correct === total;
  const isGood = correct >= Math.ceil(total / 2);

  const emoji = isPerfect ? "🏆" : isGood ? "🌟" : "💪";
  const message = isPerfect ? "Perfektní!" : isGood ? "Výborně!" : "Zkus to znovu!";
  const cardClass = isPerfect ? styles.good : isGood ? styles.mid : styles.bad;

  return (
    <div className={`${styles.card} ${cardClass} anim-celebrate`}>
      <div className={styles.emoji}>{emoji}</div>
      <div className={styles.score}>
        <span className={styles.fraction}>{correct} / {total}</span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.message}>{message}</div>
    </div>
  );
}
