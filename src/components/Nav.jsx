import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabase";
import { formatDuration } from "../lib/utils";
import { Sun, Moon, LogOut } from "lucide-react";

export default function Nav() {
  const { settings, todayMins, exportMsg, openSettings } = useApp();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const navLinkClass = ({ isActive }) =>
    `px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
      isActive
        ? dark
          ? "bg-cyan-500/15 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          : "bg-teal-50 text-teal-600"
        : dark
          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
    }`;

  const themeBtnCls = `flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
    dark
      ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
  }`;

  return (
    <div
      data-nav
      style={{
        background: dark ? "rgba(2, 6, 23, 0.80)" : "var(--color-nav)",
        borderBottom: `1px solid ${dark ? "rgba(6,182,212,0.10)" : "var(--color-nav-border)"}`,
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: dark
          ? "0 1px 0 rgba(6,182,212,0.06), 0 4px 32px rgba(0,0,0,0.5)"
          : "0 1px 0 var(--color-nav-border)",
      }}
    >
      <div
        className="max-w-[720px] mx-auto px-4 sm:px-6 py-3 sm:py-0 h-auto sm:h-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
      >
        {/* Brand + today stat + mobile theme toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <img
            src="/logo.svg"
            alt="QuestLogger"
            style={{
              width: 32, height: 32, flexShrink: 0,
              filter: dark ? "brightness(0) invert(1)" : "none",
            }}
          />
          <div className="flex-1 sm:flex-none min-w-0">
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", lineHeight: 1, fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>
              {settings.name ? `${settings.name}'s WorkLog` : "QuestLogger"}
            </p>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "'DM Mono', monospace", margin: "2px 0 0" }}>
              {todayMins > 0 ? `Today · ${formatDuration(todayMins)}` : "No hours logged today"}
            </p>
          </div>
          {/* Mobile-only theme toggle */}
          <button onClick={toggleTheme} className={`sm:hidden ${themeBtnCls}`} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Right: nav tabs + controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Page tabs */}
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Log</NavLink>
            <NavLink to="/overview" className={navLinkClass}>Overview</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {exportMsg && (
              <span className="hidden sm:inline" style={{ fontSize: 12, color: "var(--color-accent)", fontFamily: "'DM Mono', monospace" }}>{exportMsg}</span>
            )}
            {/* Desktop theme toggle */}
            <button onClick={toggleTheme} className={`hidden sm:flex ${themeBtnCls}`} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {/* Settings */}
            <button
              onClick={openSettings}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                dark
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                  : "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30"
              }`}
            >
              Settings
            </button>
            {/* Sign out */}
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
              className={`hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dark
                  ? "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
