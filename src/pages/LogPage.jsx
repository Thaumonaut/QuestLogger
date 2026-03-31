import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import LogHoursForm from "../components/LogHoursForm";
import EntryRow from "../components/EntryRow";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateLabel, formatMonthLabel, formatDecimal, formatDuration, formatMoney, weekRangeLabel } from "../lib/utils";

export default function LogPage() {
  const {
    entries, grouped, loading, sortAsc, setSortAsc,
    expandedDates, toggleExpanded, inlineEditId, cancelInlineEdit,
    showSettings, hourlyRate, deepseekKey, monthSummaries, setMonthSummaries,
    generateMonthSummary, exportMonthXLSX, flash,
    localImportBanner, setLocalImportBanner, importFromLocalStorage,
    importEntriesRef, importProfileRef, importEntriesFromFile, importProfileFromFile,
  } = useApp();

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Escape" && inlineEditId) { cancelInlineEdit(); return; }
      if (editing || showSettings) return;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inlineEditId, showSettings, cancelInlineEdit]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>

      {/* LocalStorage migration banner */}
      {localImportBanner && (
        <div style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warn-text)", margin: 0 }}>Local data found</p>
            <p style={{ fontSize: 12, color: "var(--color-warn-muted)", marginTop: 2 }}>
              {localImportBanner.count} {localImportBanner.count === 1 ? "entry" : "entries"} saved in this browser before you created an account.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLocalImportBanner(null)} style={{ fontSize: 12, color: "var(--color-warn-text)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", opacity: 0.7 }}>Dismiss</button>
            <button onClick={importFromLocalStorage} style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#d97706", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px 14px" }}>Import to account</button>
          </div>
        </div>
      )}

      {/* Log Hours form */}
      <LogHoursForm />

      {/* Entry list controls */}
      {grouped.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
          <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
          <button onClick={() => setSortAsc((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid var(--color-border)", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 500, color: "var(--color-secondary)", cursor: "pointer" }}>
            {sortAsc ? "↑ Oldest first" : "↓ Newest first"}
          </button>
        </div>
      )}

      {/* Entry list */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 64, paddingBottom: 64 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗓</div>
          <p style={{ fontSize: 14, color: "var(--color-muted)" }}>No entries yet. Start logging your hours above.</p>
        </div>
      ) : (
        grouped.map(({ monthKey, weeks }) => {
          const monthMins = weeks.flatMap((w) => w.days).flatMap((d) => d.entries).reduce((a, e) => a + e.minutes, 0);
          return (
            <div key={monthKey} style={{ marginBottom: 28 }}>
              {/* Month header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: monthSummaries[monthKey]?.text ? 8 : 14, padding: "0 2px" }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>
                  {formatMonthLabel(monthKey)}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hourlyRate > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'DM Mono', monospace" }}>
                      {formatMoney((monthMins / 60) * hourlyRate)}
                    </span>
                  )}
                  <div style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: 20, padding: "3px 12px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--color-accent)", fontWeight: 600 }}>
                    {formatDuration(monthMins)}
                  </div>
                  {deepseekKey && (
                    <Button size="sm" variant="outline" onClick={() => generateMonthSummary(monthKey, weeks)} disabled={monthSummaries[monthKey]?.loading} className="h-7 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-secondary)" }}>
                      {monthSummaries[monthKey]?.loading ? "Summarising…" : "✦ Summarise"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => exportMonthXLSX(monthKey, weeks)} className="h-7 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-secondary)" }}>
                    Export XLSX
                  </Button>
                </div>
              </div>

              {/* AI summary */}
              {monthSummaries[monthKey]?.text && (
                <div style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: "var(--color-accent)" }}>✦</span>
                  <p style={{ fontSize: 13, color: "var(--color-accent-text)", lineHeight: 1.6, margin: 0, flex: 1 }}>{monthSummaries[monthKey].text}</p>
                  <button onClick={() => { navigator.clipboard.writeText(monthSummaries[monthKey].text); flash("✓ Copied"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent-border)", fontSize: 12, flexShrink: 0, padding: "2px 4px" }}>Copy</button>
                  <button onClick={() => setMonthSummaries((s) => { const n = { ...s }; delete n[monthKey]; return n; })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent-border)", fontSize: 14, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              )}

              {/* Weeks */}
              {weeks.map(({ weekKey, days }) => {
                const weekMins = days.flatMap((d) => d.entries).reduce((a, e) => a + e.minutes, 0);
                return (
                  <div key={weekKey} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "0 2px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                        {weekRangeLabel(weekKey)}
                      </p>
                      <span style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "'DM Mono', monospace" }}>{formatDuration(weekMins)}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {days.map(({ date, entries: dayEntries }) => {
                        const dayTotal = dayEntries.reduce((a, e) => a + e.minutes, 0);
                        return (
                          <Card key={date} style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }} className="shadow-sm overflow-hidden">
                            <div
                              onClick={() => toggleExpanded(date, dayEntries)}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--color-surface-raised)", borderBottom: expandedDates.has(date) ? "1px solid var(--color-border-light)" : "none", cursor: "pointer", userSelect: "none" }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>{formatDateLabel(date)}</p>
                              </div>
                              <span style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}</span>
                              {hourlyRate > 0 && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                                  {formatMoney((dayTotal / 60) * hourlyRate)}
                                </span>
                              )}
                              <div style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-border)", borderRadius: 20, padding: "2px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--color-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {formatDuration(dayTotal)}
                              </div>
                              {expandedDates.has(date) ? <ChevronUp size={14} color="var(--color-muted)" style={{ flexShrink: 0 }} /> : <ChevronDown size={14} color="var(--color-muted)" style={{ flexShrink: 0 }} />}
                            </div>

                            {expandedDates.has(date) && dayEntries.map((entry, i) => (
                              <EntryRow key={entry.id} entry={entry} index={i} />
                            ))}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Hidden file inputs */}
      <input ref={importEntriesRef} type="file" accept=".json" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importEntriesFromFile(f); e.target.value = ""; }} />
      <input ref={importProfileRef} type="file" accept=".json" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importProfileFromFile(f); e.target.value = ""; }} />
    </div>
  );
}
