import styles from "./BlankInput.module.css";

export default function BlankInput({
  value,
  onChange,
  onEnter,
  isCorrect,
  isWrong,
  correctAnswer,
  checked,
}) {
  const cls = [
    styles.input,
    "blank-input",
    checked && isCorrect ? "anim-correct" : "",
    checked && isWrong ? "anim-wrong" : "",
    checked && isCorrect ? "correct" : "",
    checked && isWrong ? "wrong" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={styles.wrapper}>
      <input
        className={cls}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(-2))}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        maxLength={2}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {checked && isWrong && (
        <span className="blank-hint">({correctAnswer})</span>
      )}
    </span>
  );
}
