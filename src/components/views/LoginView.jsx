import Avatar, { avatarColor } from "../Avatar.jsx";

export default function LoginView({ users, darkMode, setDarkMode, onSelectUser, onCreateProfile }) {
  const bg = darkMode
    ? "bg-gray-950 text-gray-100"
    : "bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${bg}`}>
      {/* Dark mode toggle */}
      <div className="fixed top-4 right-4">
        <button
          onClick={() => setDarkMode(d => !d)}
          className={`px-3 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
            darkMode
              ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Logo */}
      <div className="mb-12 text-center">
        <div className={`text-4xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Vyjmenovaná slova
        </div>
        <div className={`text-base font-serif italic ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Kdo dnes cvičí?
        </div>
      </div>

      {/* User cards */}
      {users === null && (
        <div className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Načítám…</div>
      )}

      {users !== null && (
        <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
          {users.map(user => (
            <UserCard key={user.id} user={user} darkMode={darkMode} onClick={() => onSelectUser(user)} />
          ))}
          <AddProfileCard darkMode={darkMode} onClick={onCreateProfile} />
        </div>
      )}
    </div>
  );
}

function UserCard({ user, darkMode, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl w-36 transition-all duration-200 border-2 group ${
        darkMode
          ? "bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-800"
          : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-lg"
      }`}
    >
      <Avatar user={user} size={64} border />
      <div>
        <div className={`font-bold text-sm text-center ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
          {user.name}
        </div>
        {user.role === "parent" && (
          <div className={`text-xs text-center mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            🔒 Rodič
          </div>
        )}
      </div>
    </button>
  );
}

function AddProfileCard({ darkMode, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl w-36 transition-all duration-200 border-2 border-dashed ${
        darkMode
          ? "border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-400 hover:bg-gray-900"
          : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50"
      }`}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
        darkMode ? "bg-gray-800" : "bg-gray-100"
      }`}>
        +
      </div>
      <div className="text-sm font-semibold">Přidat profil</div>
    </button>
  );
}
