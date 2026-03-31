import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabase";
import { formatDuration, todayStr } from "../lib/utils";
import { Button } from "@/components/ui/button";

export default function Nav() {
  const { settings, todayMins, exportMsg, openSettings } = useApp();
  const { theme, toggleTheme } = useTheme();

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? "text-[var(--color-accent)] bg-[var(--color-accent-light)]"
        : "text-[var(--color-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
    }`;

  return (
    <div
      data-nav
      style={{
        background: "var(--color-nav)",
        borderBottom: "1px solid var(--color-nav-border)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: theme === "dark"
          ? "0 1px 0 rgba(129,140,248,0.08), 0 4px 32px rgba(0,0,12,0.6)"
          : "0 1px 0 var(--color-nav-border)",
      }}
    >
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 24px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        {/* Brand + today stat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="QuestLogger"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 8,
            }}
          />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", lineHeight: 1, fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>
              {settings.name ? `${settings.name}'s WorkLog` : "QuestLogger"}
            </p>
            <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, fontFamily: "'DM Mono', monospace", margin: 0 }}>
              {todayMins > 0 ? `Today · ${formatDuration(todayMins)}` : "No hours logged today"}
            </p>
          </div>
        </div>

        {/* Page tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavLink to="/" end className={navLinkClass}>Log</NavLink>
          <NavLink to="/overview" className={navLinkClass}>Overview</NavLink>
        </nav>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {exportMsg && (
            <span style={{ fontSize: 12, color: "var(--color-accent)", fontFamily: "'DM Mono', monospace" }}>{exportMsg}</span>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              cursor: "pointer",
              padding: "5px 8px",
              fontSize: 15,
              lineHeight: 1,
              color: "var(--color-secondary)",
              transition: "all 0.15s",
            }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <Button size="sm" onClick={openSettings} className="h-8 text-xs font-semibold" style={{ background: "var(--color-accent)", color: "#fff" }}>
            Settings
          </Button>
          <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()} className="h-8 text-xs" style={{ color: "var(--color-muted)" }}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
