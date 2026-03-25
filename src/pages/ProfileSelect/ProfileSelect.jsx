import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { login } from "../../lib/api";
import { avatarColor } from "../../lib/theme";
import Avatar from "../../components/ui/Avatar/Avatar";
import Modal from "../../components/ui/Modal/Modal";
import ProfileModal from "../../components/overlays/ProfileModal/ProfileModal";
import styles from "./ProfileSelect.module.css";

export default function ProfileSelect() {
  const { users, loadUsers, loginUser } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const navigate = useNavigate();

  const [pinModal, setPinModal] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const handleSelectUser = (user) => {
    if (user.role === "parent") {
      setPinInput("");
      setPinError("");
      setPinModal(user);
    } else {
      loginUser(user);
      navigate("/quiz");
    }
  };

  const handlePinSubmit = async () => {
    if (pinInput.length < 1) return;
    setPinLoading(true);
    try {
      const user = await login(pinModal.id, pinInput);
      loginUser(user);
      setPinModal(null);
      navigate("/quiz");
    } catch {
      setPinError("Špatný PIN, zkus to znovu.");
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <button
        className={styles.darkToggle}
        onClick={toggleDark}
        title={darkMode ? "Světlý režim" : "Tmavý režim"}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className={styles.hero}>
        <div className={styles.title}>Vyjmenovaná slova</div>
        <div className={styles.subtitle}>Kdo dnes cvičí?</div>
      </div>

      {users === null && (
        <div className={styles.loading}>Načítám…</div>
      )}

      {users !== null && (
        <div className={styles.grid}>
          {users.map((user) => (
            <button
              key={user.id}
              className={styles.profileCard}
              onClick={() => handleSelectUser(user)}
            >
              <div className={styles.avatarWrap}>
                <Avatar user={user} size={80} border />
              </div>
              <div className={styles.profileName}>{user.name}</div>
              {user.role === "parent" && (
                <div className={styles.profileRole}>🔒 Rodič</div>
              )}
            </button>
          ))}

          {/* Přidat profil */}
          <button
            className={`${styles.profileCard} ${styles.addCard}`}
            onClick={() => setShowCreate(true)}
          >
            <div className={styles.addIcon}>+</div>
            <div className={styles.addLabel}>Přidat profil</div>
          </button>
        </div>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <Modal onClose={() => setPinModal(null)}>
          <div className={styles.pinModal}>
            <div className={styles.pinAvatar}>
              <Avatar user={pinModal} size={72} border />
            </div>
            <div className={styles.pinName}>{pinModal.name}</div>
            <div className={styles.pinHint}>Zadej PIN</div>
            <input
              className={`form-input ${styles.pinInput}`}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              autoFocus
            />
            {pinError && <div className={styles.pinError}>{pinError}</div>}
            <div className={styles.pinBtns}>
              <button
                className={`btn btn-ghost ${styles.pinBtn}`}
                onClick={() => setPinModal(null)}
              >
                Zrušit
              </button>
              <button
                className={`btn ${styles.pinBtn}`}
                style={{ background: avatarColor(pinModal.id), color: "white" }}
                onClick={handlePinSubmit}
                disabled={pinLoading}
              >
                {pinLoading ? "…" : "Vstoupit"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Vytvořit profil */}
      {showCreate && (
        <ProfileModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => { loadUsers(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
