export default function ProfileModal({
  profileModal,
  profileForm,
  setProfileForm,
  profileError,
  profileSaving,
  onSave,
  onClose,
  onAvatarChange,
  avatarInputRef,
  darkMode,
}) {
  const dark = darkMode;
  const isCreate = profileModal === "create";

  const cardBg = dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-100";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-400" : "text-gray-500";
  const inputBg = dark ? "bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm border rounded-2xl p-7 shadow-2xl ${cardBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className={`font-extrabold text-lg mb-5 ${textColor}`}>
          {isCreate ? "Nový profil" : `Upravit: ${profileModal.name}`}
        </h2>

        {/* Avatar upload */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onAvatarChange}
        />
        <div className="flex justify-center mb-5">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative group cursor-pointer"
          >
            {profileForm.avatar ? (
              <div className={`w-20 h-20 rounded-full overflow-hidden border-2 ${dark ? "border-gray-600" : "border-gray-200"}`}>
                <img src={profileForm.avatar} className="w-full h-full object-cover" alt="avatar" />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center text-3xl ${
                dark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-gray-50"
              }`}>
                📷
              </div>
            )}
            <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${
              dark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
            }`}>
              ✏️
            </div>
          </button>
        </div>

        {/* Name */}
        <input
          placeholder="Jméno"
          value={profileForm.name}
          onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
          className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none transition-colors mb-3 text-sm ${inputBg}`}
        />

        {/* Role */}
        <div className="flex gap-2 mb-4">
          {["child", "parent"].map(role => (
            <button
              key={role}
              onClick={() => setProfileForm(p => ({ ...p, role }))}
              className="flex-1 py-2 rounded-xl font-bold text-sm transition-all"
              style={profileForm.role === role
                ? { background: "#2980b9", color: "white" }
                : { background: dark ? "#1e293b" : "#f1f5f9", color: dark ? "#64748b" : "#94a3b8" }
              }
            >
              {role === "child" ? "👦 Dítě" : "🔒 Rodič"}
            </button>
          ))}
        </div>

        {/* PIN (parent only) */}
        {profileForm.role === "parent" && (
          <>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={isCreate ? "PIN (4 číslice)" : "Nový PIN (prázdné = beze změny)"}
              value={profileForm.pin}
              onChange={e => setProfileForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none transition-colors mb-3 text-center text-sm ${inputBg}`}
              style={{ letterSpacing: "0.4em" }}
            />
            {profileForm.pin && (
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Potvrď PIN"
                value={profileForm.pin2}
                onChange={e => setProfileForm(p => ({ ...p, pin2: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none transition-colors mb-3 text-center text-sm ${inputBg}`}
                style={{ letterSpacing: "0.4em" }}
              />
            )}
          </>
        )}

        {/* Error */}
        {profileError && (
          <div className="text-red-500 text-sm mb-3 font-medium">{profileError}</div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              dark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Zrušit
          </button>
          <button
            onClick={onSave}
            disabled={profileSaving}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#2980b9" }}
          >
            {profileSaving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </div>
    </div>
  );
}
