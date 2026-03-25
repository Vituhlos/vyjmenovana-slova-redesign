import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import Avatar from "../../ui/Avatar/Avatar";
import styles from "./Header.module.css";

export default function Header({ streakData, soundOn, onToggleSound, onOpenTahak }) {
  const { currentUser, logoutUser } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const navigate = useNavigate();

  const isParent = currentUser?.role === "parent";

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Uživatelský profil / odhlášení */}
        <button
          className={styles.userChip}
          onClick={logoutUser}
          title="Odhlásit / Změnit uživatele"
        >
          <Avatar user={currentUser} size={28} />
          <span className={styles.userName}>{currentUser.name}</span>
        </button>

        {/* Streak */}
        {streakData?.streak > 0 && (
          <div className={styles.streak} title={`${streakData.streak} dní v řadě!`}>
            🔥 {streakData.streak}
          </div>
        )}

        {/* Správa (jen pro rodiče) */}
        {isParent && (
          <button
            className={styles.iconBtn}
            onClick={() => navigate("/manage")}
            title="Správa profilů a AI"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          onClick={onToggleSound}
          title={soundOn ? "Vypnout zvuk" : "Zapnout zvuk"}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        <button
          className={styles.iconBtn}
          onClick={toggleDark}
          title={darkMode ? "Světlý režim" : "Tmavý režim"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
        <button
          className={`${styles.iconBtn} ${styles.tahakBtn}`}
          onClick={onOpenTahak}
          title="Tahák – vyjmenovaná slova"
        >
          📖 Tahák
        </button>
        <button
          className={`${styles.iconBtn} ${styles.historyBtn}`}
          onClick={() => navigate("/history")}
          title="Historie a statistiky"
        >
          📊 Historie
        </button>
      </div>
    </header>
  );
}
