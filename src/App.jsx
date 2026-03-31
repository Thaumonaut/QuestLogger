import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./supabase";
import AuthPage from "./AuthPage";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AppProvider } from "./context/AppContext";
import Nav from "./components/Nav";
import SettingsModal from "./components/SettingsModal";
import InvoiceModal from "./components/InvoiceModal";
import LogPage from "./pages/LogPage";
import OverviewPage from "./pages/OverviewPage";

function AppLayout({ session }) {
  const { theme } = useTheme();

  return (
    <div style={{ minHeight: "100vh", color: "var(--color-text)", position: "relative" }}>
      {/* Animated gradient orbs (dark mode only) */}
      {theme === "dark" && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          {/* Top-right — cyan-500 */}
          <div style={{
            position: "absolute", top: 0, right: "25%",
            width: 600, height: 600,
            background: "radial-gradient(ellipse, rgba(6,182,212,0.22) 0%, rgba(8,145,178,0.12) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            animation: "pulse 8s ease-in-out infinite",
          }} />
          {/* Bottom-left — purple/pink */}
          <div style={{
            position: "absolute", bottom: 0, left: "20%",
            width: 700, height: 700,
            background: "radial-gradient(ellipse, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.08) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(70px)",
            animation: "pulse 10s ease-in-out infinite",
            animationDelay: "2s",
          }} />
          {/* Center — indigo/blue */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 800, height: 800,
            background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, rgba(14,165,233,0.07) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(80px)",
            animation: "pulse 12s ease-in-out infinite",
            animationDelay: "4s",
          }} />
          {/* Subtle grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
        </div>
      )}

      {/* App content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />
        <SettingsModal />
        <InvoiceModal />
        <Routes>
          <Route path="/" element={<LogPage />} />
          <Route path="/overview" element={<OverviewPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</span>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppProvider session={session}>
          <AppLayout session={session} />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
