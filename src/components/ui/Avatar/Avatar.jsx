import { avatarColor } from "../../../lib/theme";
import styles from "./Avatar.module.css";

export default function Avatar({ user, size = 72, border = false }) {
  const color = avatarColor(user.id);
  const borderStyle = border ? { border: `3px solid ${color}` } : {};

  if (user.avatar) {
    return (
      <div
        className={styles.avatar}
        style={{ width: size, height: size, ...borderStyle }}
      >
        <img src={user.avatar} alt={user.name} className={styles.img} />
      </div>
    );
  }

  return (
    <div
      className={styles.initials}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.38,
        ...borderStyle,
      }}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}
