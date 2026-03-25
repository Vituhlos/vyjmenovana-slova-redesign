import { useEffect, useState } from "react";
import styles from "./Toast.module.css";

export default function Toast({ achievement, onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    const timer1 = setTimeout(() => setHiding(true), 3500);
    const timer2 = setTimeout(() => onDone?.(), 3900);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div className={`${styles.toast} ${hiding ? styles.hiding : ""}`}>
      <span className={styles.emoji}>{achievement.emoji}</span>
      <div>
        <div className={styles.label}>Nový odznak!</div>
        <div className={styles.name}>{achievement.name}</div>
        <div className={styles.desc}>{achievement.desc}</div>
      </div>
    </div>
  );
}
