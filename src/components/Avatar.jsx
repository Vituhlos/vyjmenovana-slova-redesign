const AVATAR_COLORS = ["#e74c3c", "#8e44ad", "#27ae60", "#2980b9", "#e67e22", "#16a085", "#d35400", "#7f8c8d"];
export const avatarColor = (id) => AVATAR_COLORS[((id ?? 0) - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length];

export default function Avatar({ user, size = 72, border }) {
  const color = avatarColor(user.id);
  const borderStyle = border ? { border: `3px solid ${color}` } : {};
  const sizeStyle = { width: size, height: size, flexShrink: 0 };

  if (user.avatar) {
    return (
      <div style={{ ...sizeStyle, ...borderStyle, borderRadius: "50%", overflow: "hidden" }}>
        <img src={user.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={user.name} />
      </div>
    );
  }

  return (
    <div style={{
      ...sizeStyle,
      ...borderStyle,
      borderRadius: "50%",
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      color: "white",
      fontWeight: 800,
    }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}
