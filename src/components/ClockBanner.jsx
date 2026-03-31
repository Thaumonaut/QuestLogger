import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";

export default function ClockBanner() {
  const {
    clockIn, clockedElapsed, breakElapsed,
    startClockBreak, endClockBreak,
    clockOutAndFill, projects, clockedTick,
  } = useApp();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const navigate = useNavigate();

  // clockedTick keeps the elapsed time live
  void clockedTick;

  if (!clockIn) return null;

  const onBreak = !!clockIn.activeBreak;
  const entryProjects = (clockIn.projectIds || [])
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  function handleStop() {
    clockOutAndFill();
    navigate("/");
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 border-t backdrop-blur-xl ${
      dark ? "bg-slate-900/95 border-slate-700/60" : "bg-white/95 border-slate-200"
    }`}>
      {/* Left: status indicator + time + projects */}
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          onBreak ? "bg-orange-400" : "bg-emerald-400 animate-pulse"
        }`} />
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${dark ? "text-white" : "text-slate-800"}`}>
            {clockedElapsed()}
          </span>
          {onBreak && (
            <span className={`text-xs flex-shrink-0 ${dark ? "text-orange-400" : "text-orange-600"}`}>
              · break {breakElapsed()}
            </span>
          )}
          {entryProjects.map((p) => (
            <span
              key={p.id}
              className="text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0"
              style={{ backgroundColor: p.color + "22", color: p.color, borderColor: p.color + "44" }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Break + Stop buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onBreak ? endClockBreak : startClockBreak}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            onBreak
              ? dark ? "border-orange-500/50 text-orange-400 hover:bg-orange-500/10" : "border-orange-400 text-orange-600 hover:bg-orange-50"
              : dark ? "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white" : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800"
          }`}
        >
          {onBreak ? "End break" : "Break"}
        </button>
        <button
          onClick={handleStop}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            dark
              ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/60"
              : "border-teal-400 text-teal-700 bg-teal-50 hover:bg-teal-100"
          }`}
        >
          Stop
        </button>
      </div>
    </div>
  );
}
