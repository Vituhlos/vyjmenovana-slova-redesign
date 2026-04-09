export default function SlidePanel({ title, onClose, darkMode, children, headerExtra }) {
  const dark = darkMode;
  const bg = dark ? "bg-gray-900" : "bg-white";
  const border = dark ? "border-gray-800" : "border-gray-100";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subtextColor = dark ? "text-gray-500" : "text-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className={`${bg} h-full w-full max-w-lg flex flex-col panel-slide-in custom-scrollbar`}
        style={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border} flex-shrink-0`}>
          <span className={`font-extrabold text-lg ${textColor}`}>{title}</span>
          <div className="flex items-center gap-3">
            {headerExtra}
            <button
              onClick={onClose}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl transition-colors ${
                dark ? "text-gray-500 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
