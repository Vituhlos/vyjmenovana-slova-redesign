import Avatar, { avatarColor } from "../Avatar.jsx";

export default function PinModal({ user, pinInput, setPinInput, pinError, onSubmit, onClose, darkMode }) {
  const dark = darkMode;
  const color = avatarColor(user.id);

  const overlayBg = "rgba(0,0,0,0.5)";
  const cardBg = dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-100";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark ? "bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-800";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: overlayBg }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm border rounded-2xl p-7 shadow-2xl ${cardBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Avatar & name */}
        <div className="flex flex-col items-center mb-6">
          <Avatar user={user} size={64} border />
          <div className={`font-extrabold text-lg mt-3 ${textColor}`}>{user.name}</div>
          <div className={`text-sm mt-1 ${subtextColor}`}>Zadej PIN</div>
        </div>

        {/* PIN input */}
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="••••"
          value={pinInput}
          onChange={e => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); }}
          onKeyDown={e => e.key === "Enter" && onSubmit()}
          autoFocus
          className={`w-full px-4 py-3 rounded-xl border-2 text-center text-2xl tracking-widest outline-none transition-colors mb-3 ${inputBg}`}
          style={{ letterSpacing: "0.5em" }}
        />

        {/* Error */}
        {pinError && (
          <div className="text-red-500 text-sm text-center mb-3 font-medium">{pinError}</div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              dark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Zrušit
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
            style={{ background: color }}
          >
            Vstoupit
          </button>
        </div>
      </div>
    </div>
  );
}
