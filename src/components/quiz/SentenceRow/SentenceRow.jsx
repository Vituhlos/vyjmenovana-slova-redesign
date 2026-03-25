import BlankInput from "../BlankInput/BlankInput";
import styles from "./SentenceRow.module.css";

export default function SentenceRow({
  sentence,
  index,
  inputs,
  checked,
  accentColor,
  numBg,
  onInput,
  onEnter,
  textColor,
}) {
  let blankCounter = 0;
  const partsWithIdx = sentence.parts.map((p) =>
    "blank" in p ? { ...p, bi: blankCounter++ } : p
  );

  const renderParts = () => {
    const result = [];
    let pi = 0;

    while (pi < partsWithIdx.length) {
      const p = partsWithIdx[pi];

      if ("blank" in p) {
        const { bi, blank } = p;
        const val = inputs?.[bi] ?? "";
        const isCorrect = checked && val.toLowerCase() === blank.toLowerCase();
        const isWrong = checked && val.toLowerCase() !== blank.toLowerCase();
        result.push(
          <BlankInput
            key={pi}
            value={val}
            onChange={(v) => onInput(bi, v)}
            onEnter={onEnter}
            isCorrect={isCorrect}
            isWrong={isWrong}
            correctAnswer={blank}
            checked={checked}
          />
        );
        pi++;
        continue;
      }

      // Text part — try to keep word + blank together (no-wrap)
      const nextP = partsWithIdx[pi + 1];
      if (!nextP || "text" in nextP) {
        result.push(
          <span key={pi} style={{ color: textColor }}>{p.text}</span>
        );
        pi++;
        continue;
      }

      // nextP is a blank — attach adjacent word to avoid wrapping
      const { bi, blank } = nextP;
      const val = inputs?.[bi] ?? "";
      const isCorrect = checked && val.toLowerCase() === blank.toLowerCase();
      const isWrong = checked && val.toLowerCase() !== blank.toLowerCase();
      const lastSpace = p.text.lastIndexOf(" ");
      const textBefore = lastSpace >= 0 ? p.text.slice(0, lastSpace + 1) : "";
      const wordBefore = lastSpace >= 0 ? p.text.slice(lastSpace + 1) : p.text;
      const afterP = partsWithIdx[pi + 2];
      let wordAfter = "";
      let textAfter = "";
      let advance = 2;
      if (afterP && "text" in afterP) {
        const fs = afterP.text.indexOf(" ");
        wordAfter = fs >= 0 ? afterP.text.slice(0, fs) : afterP.text;
        textAfter = fs >= 0 ? afterP.text.slice(fs) : "";
        advance = 3;
      }

      result.push(
        <span key={pi}>
          {textBefore && <span style={{ color: textColor }}>{textBefore}</span>}
          <span style={{ whiteSpace: "nowrap" }}>
            {wordBefore && <span style={{ color: textColor }}>{wordBefore}</span>}
            <BlankInput
              value={val}
              onChange={(v) => onInput(bi, v)}
              onEnter={onEnter}
              isCorrect={isCorrect}
              isWrong={isWrong}
              correctAnswer={blank}
              checked={checked}
            />
            {wordAfter && <span style={{ color: textColor }}>{wordAfter}</span>}
          </span>
          {textAfter && <span style={{ color: textColor }}>{textAfter}</span>}
        </span>
      );
      pi += advance;
    }

    return result;
  };

  return (
    <div className={`sentence-row ${styles.row}`}>
      <span
        className={`sentence-num ${styles.num}`}
        style={{ background: numBg, color: accentColor }}
      >
        {index + 1}
      </span>
      <span className={styles.text}>{renderParts()}</span>
    </div>
  );
}
