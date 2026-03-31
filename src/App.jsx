import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./supabase";
import AuthPage from "./AuthPage";
import { ThemeProvider } from "./context/ThemeContext";
import { AppProvider } from "./context/AppContext";
import Nav from "./components/Nav";
import SettingsModal from "./components/SettingsModal";
import InvoiceModal from "./components/InvoiceModal";
import LogPage from "./pages/LogPage";
import OverviewPage from "./pages/OverviewPage";

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
          <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text)" }}>
            <Nav />
            <SettingsModal />
            <InvoiceModal />
            <Routes>
              <Route path="/" element={<LogPage />} />
              <Route path="/overview" element={<OverviewPage />} />
            </Routes>
          </div>
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
