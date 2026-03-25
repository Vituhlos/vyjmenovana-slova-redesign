import { useRef, useState } from "react";
import { createUser, updateUser } from "../../../lib/api";
import { resizeImage } from "../../../lib/image";
import Modal from "../../ui/Modal/Modal";
import styles from "./ProfileModal.module.css";

export default function ProfileModal({ mode, user, onClose, onSaved, currentUserId }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    name: isEdit ? user.name : "",
    role: isEdit ? user.role : "child",
    pin: "",
    pin2: "",
    avatar: isEdit ? user.avatar : null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm((p) => ({ ...p, avatar: dataUrl }));
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Zadej jméno."); return; }
    if (form.role === "parent" && !isEdit && !form.pin) {
      setError("Rodič musí mít PIN."); return;
    }
    if (form.pin && form.pin !== form.pin2) {
      setError("PINy se neshodují."); return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { name: form.name.trim(), role: form.role, avatar: form.avatar };
      if (form.pin) body.pin = form.pin;
      if (isEdit) {
        await updateUser(user.id, body);
      } else {
        await createUser(body);
      }
      onSaved?.({ ...body, id: user?.id });
    } catch {
      setError("Nepodařilo se uložit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.title}>
        {isEdit ? `Upravit: ${user.name}` : "Nový profil"}
      </div>

      {/* Avatar */}
      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={handleAvatarChange}
      />
      <div className={styles.avatarRow}>
        <button
          className={styles.avatarBtn}
          onClick={() => avatarRef.current?.click()}
          type="button"
        >
          {form.avatar ? (
            <img src={form.avatar} className={styles.avatarImg} alt="avatar" />
          ) : (
            <span className={styles.avatarPlaceholder}>📷</span>
          )}
          <span className={styles.avatarEdit}>✏️</span>
        </button>
      </div>

      {/* Jméno */}
      <input
        className="form-input"
        placeholder="Jméno"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        style={{ marginBottom: 12 }}
      />

      {/* Role */}
      <div className={styles.roleRow}>
        {["child", "parent"].map((role) => (
          <button
            key={role}
            type="button"
            className={`${styles.roleBtn} ${form.role === role ? styles.roleActive : ""}`}
            onClick={() => setForm((p) => ({ ...p, role }))}
          >
            {role === "child" ? "👦 Dítě" : "🔒 Rodič"}
          </button>
        ))}
      </div>

      {/* PIN (jen pro rodiče) */}
      {form.role === "parent" && (
        <div className={styles.pinSection}>
          <input
            className="form-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder={isEdit ? "Nový PIN (nechej prázdné = beze změny)" : "PIN (4 číslice)"}
            value={form.pin}
            onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            style={{ marginBottom: 8, textAlign: "center", letterSpacing: "0.4em" }}
          />
          {form.pin && (
            <input
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Potvrď PIN"
              value={form.pin2}
              onChange={(e) => setForm((p) => ({ ...p, pin2: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              style={{ textAlign: "center", letterSpacing: "0.4em" }}
            />
          )}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.btnRow}>
        <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Zrušit</button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </Modal>
  );
}
