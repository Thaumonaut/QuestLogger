import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import TimeSelect from "./TimeSelect";
import { calcWorked, formatDuration, formatDecimal, todayStr, toDisplayTime } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";


export default function LogHoursForm() {
  const {
    form, setForm, setField, addBreak, updateBreak, removeBreak,
    handleSubmit, applyTemplate, templates, projects, settings,
    clockIn, handleClockIn, handleClockOut, clockedElapsed, breakElapsed,
    updateClockIn, startClockBreak, endClockBreak,
    clockedTick, timeRounding,
    logHoursRef, dateInputRef, deepseekKey, rewriteDescription, rewritingDesc,
  } = useApp();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [mode, setMode] = useState("manual"); // "manual" | "auto"

  // When clock in exists, switch to auto mode
  useEffect(() => {
    if (clockIn) setMode("auto");
  }, [clockIn]);

  function onClockOut() {
    const prefilled = handleClockOut();
    if (prefilled) {
      setForm(prefilled);
      setMode("manual");
    }
  }

  const previewMins = calcWorked(form.start, form.end, form.breaks);

  const inputCls = "bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-2 text-sm shadow-sm";
  const btnToggleBase = "px-3 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer transition-colors";

  const subCardCls = `p-6 rounded-xl border transition-all ${
    dark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50/50 border-slate-200/50"
  }`;

  return (
    <div
      ref={logHoursRef}
      className={`relative overflow-hidden rounded-2xl border mb-8 ${
        dark
          ? "bg-slate-900/50 backdrop-blur-2xl border-cyan-500/20 shadow-[0_8px_32px_rgba(6,182,212,0.15)]"
          : "bg-white/60 backdrop-blur-xl border-blue-200/50 shadow-xl shadow-blue-500/5"
      }`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${
        dark ? "from-cyan-500/5 via-transparent to-purple-500/5" : "from-blue-500/5 via-transparent to-purple-500/5"
      }`} />

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            fontFamily: "'Parkinsans', sans-serif",
            ...(dark ? {
              background: "linear-gradient(to right, #22d3ee, #2dd4bf, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            } : { color: "var(--color-text)" }),
          }}>
            Log Hours
          </h2>
          {/* Auto / Manual toggle */}
          <div style={{ display: "flex", background: "var(--color-tag-bg)", borderRadius: 8, padding: 3, gap: 2 }}>
            {["manual", "auto"].map((m) => (
              <button
                key={m}
                onClick={() => !clockIn && setMode(m)}
                disabled={!!clockIn}
                className={btnToggleBase}
                style={{
                  background: mode === m ? "var(--color-surface)" : "transparent",
                  color: mode === m ? "var(--color-accent)" : "var(--color-muted)",
                  boxShadow: mode === m ? "var(--color-toggle-shadow)" : "none",
                  cursor: clockIn ? "default" : "pointer",
                }}
              >
                {m === "manual" ? "Manual" : "Auto"}
              </button>
            ))}
          </div>
        </div>

        {/* ── AUTO MODE ── */}
        {mode === "auto" && (
          <>
            {!clockIn ? (
              <div style={{ padding: "24px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-accent-light)", border: "2px solid var(--color-accent-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  ⏱
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Ready to start?</p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
                    Clock in to start tracking time automatically.
                    {timeRounding !== "none" && ` Times will be rounded to ${timeRounding} min.`}
                  </p>
                </div>
                <Button
                  onClick={handleClockIn}
                  className="h-10 px-8 text-sm font-semibold"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  Clock In
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Timer header */}
                <div style={{
                  background: "var(--color-accent-light)",
                  border: "1px solid var(--color-accent-border)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "var(--color-accent)", fontFamily: "'DM Mono', monospace", lineHeight: 1, margin: 0 }}>
                      {clockedElapsed()}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-accent-text)", marginTop: 5 }}>
                      Clocked in at {toDisplayTime(clockIn.start)}
                      {clockIn.date !== todayStr() ? ` · ${clockIn.date}` : ""}
                    </p>
                  </div>
                  <Button
                    onClick={onClockOut}
                    className="h-9 px-5 text-sm font-semibold"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    Clock Out
                  </Button>
                </div>

                <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--color-border-light)" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    What are you working on?
                  </p>
                  <Textarea
                    value={clockIn.description || ""}
                    onChange={(e) => updateClockIn({ description: e.target.value })}
                    placeholder="Describe your work…"
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {projects.length > 0 && (
                    <Select
                      value={clockIn.projectId ? String(clockIn.projectId) : "__none__"}
                      onValueChange={(v) => updateClockIn({ projectId: v === "__none__" ? null : v })}
                    >
                      <SelectTrigger className={`${inputCls} w-44 h-9`}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                        <SelectItem value="__none__" className="focus:bg-[var(--color-accent-light)]">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="focus:bg-[var(--color-accent-light)]">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#14b8a6", display: "inline-block" }} />
                              {p.name}{p.client_name ? ` · ${p.client_name}` : ""}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Checkbox
                      id="clock-billable"
                      checked={clockIn.billable !== false}
                      onCheckedChange={(v) => updateClockIn({ billable: !!v })}
                      className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4"
                    />
                    <Label htmlFor="clock-billable" style={{ fontSize: 13, color: "var(--color-secondary)", cursor: "pointer" }}>
                      Billable
                    </Label>
                  </div>
                </div>

                {/* Breaks */}
                <div style={{ paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Breaks
                  </p>
                  {(clockIn.breaks || []).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {(clockIn.breaks || []).map((b) => {
                        const [sh, sm] = b.start.split(":").map(Number);
                        const [eh, em] = b.end.split(":").map(Number);
                        const mins = (eh * 60 + em) - (sh * 60 + sm);
                        return (
                          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-secondary)" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-muted)", display: "inline-block", flexShrink: 0 }} />
                            {toDisplayTime(b.start)} – {toDisplayTime(b.end)}
                            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>({mins}m)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {clockIn.activeBreak ? (
                    <div style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warn-text)", margin: 0 }}>
                          On break · {breakElapsed()}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--color-warn-muted)", marginTop: 2 }}>
                          Started at {toDisplayTime(clockIn.activeBreak.start)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={endClockBreak}
                        className="h-8 text-xs font-semibold"
                        style={{ borderColor: "var(--color-warn-border)", color: "var(--color-warn-text)" }}
                      >
                        End Break
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startClockBreak}
                      className="h-8 text-xs"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-secondary)" }}
                    >
                      + Start Break
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === "manual" && (
          <>
            {/* Template picker */}
            {templates.length > 0 && (
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--color-border-light)" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Templates</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{
                        background: "var(--color-accent-light)",
                        border: "1px solid var(--color-accent-border)",
                        borderRadius: 20,
                        padding: "4px 14px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-accent)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-light-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent-light)"; }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Two-column grid: Date+Time | Description+Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12, marginBottom: 16 }}>

              {/* Date & Time sub-card */}
              <div className={subCardCls}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Calendar size={15} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Date & Time</span>
                </div>

                {/* Date picker */}
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                      position: "relative", width: "100%",
                      background: form.date ? "var(--color-accent-light)" : "var(--color-input-bg)",
                      border: `1px solid ${form.date ? "var(--color-accent-border)" : "var(--color-border)"}`,
                      borderRadius: 8, padding: "8px 12px", transition: "border-color 0.15s",
                    }}
                    onClick={() => dateInputRef.current?.showPicker()}
                  >
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={form.date}
                      onChange={(e) => setField("date", e.target.value)}
                      style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", pointerEvents: "none" }}
                    />
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={form.date ? "var(--color-accent)" : "var(--color-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: "relative", zIndex: 0 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {form.date ? (
                      <div style={{ position: "relative", zIndex: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.2, margin: 0 }}>
                          {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--color-secondary)", margin: "2px 0 0" }}>
                          {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, position: "relative", zIndex: 0 }}>Select a date</p>
                    )}
                  </label>
                </div>

                {/* Start / End times */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Start</p>
                    <TimeSelect value={form.start} onChange={(v) => setField("start", v)} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>End</p>
                    <TimeSelect value={form.end} onChange={(v) => setField("end", v)} />
                  </div>
                </div>
              </div>

              {/* Details sub-card */}
              <div className={subCardCls}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Clock size={15} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Details</span>
                </div>

                {/* Description */}
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="What did you work on?"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                  {deepseekKey && form.description.trim() && (
                    <button
                      onClick={rewriteDescription}
                      disabled={rewritingDesc}
                      style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: rewritingDesc ? "var(--color-accent-light)" : "var(--color-surface)",
                        border: "1px solid var(--color-accent-border)",
                        borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                        color: "var(--color-accent)", cursor: rewritingDesc ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      {rewritingDesc ? (
                        <><span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--color-accent-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Rewriting…</>
                      ) : "✦ Rewrite"}
                    </button>
                  )}
                </div>

                {/* Project */}
                {projects.length > 0 && (
                  <Select
                    value={form.projectId ? String(form.projectId) : "__none__"}
                    onValueChange={(v) => setField("projectId", v === "__none__" ? null : v)}
                  >
                    <SelectTrigger className={`${inputCls} w-full h-9`}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectItem value="__none__" className="focus:bg-[var(--color-accent-light)]">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="focus:bg-[var(--color-accent-light)]">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#14b8a6", display: "inline-block" }} />
                            {p.name}{p.client_name ? ` · ${p.client_name}` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Breaks list — only shown when breaks exist */}
            {form.breaks.length > 0 && (
              <div className={`rounded-xl border p-4 ${dark ? "bg-slate-800/20 border-slate-700/50" : "bg-slate-50/50 border-slate-200/50"}`}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Breaks</p>
                <div className="space-y-3">
                  {form.breaks.map((b) => (
                    <div key={b.id} className={`p-3 rounded-lg border space-y-3 ${dark ? "bg-slate-800/40 border-slate-700/60" : "bg-white/70 border-slate-200"}`}>
                      {/* From / To — each in its own column so TimeSelect always has room */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>From</p>
                          <TimeSelect value={b.start} onChange={(v) => updateBreak(b.id, { start: v })} />
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>To</p>
                          <TimeSelect value={b.end} onChange={(v) => updateBreak(b.id, { end: v })} />
                        </div>
                      </div>
                      {/* Unpaid + Remove */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`u-${b.id}`}
                            checked={b.unpaid}
                            onCheckedChange={(v) => updateBreak(b.id, { unpaid: !!v })}
                            className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4"
                          />
                          <Label htmlFor={`u-${b.id}`} style={{ fontSize: 12, color: "var(--color-secondary)", cursor: "pointer" }}>Unpaid (deducted)</Label>
                        </div>
                        <button
                          onClick={() => removeBreak(b.id)}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${dark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-border-light)" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="form-billable"
                    checked={form.billable !== false}
                    onCheckedChange={(v) => setField("billable", !!v)}
                    className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4"
                  />
                  <Label htmlFor="form-billable" style={{ fontSize: 13, color: "var(--color-secondary)", cursor: "pointer" }}>
                    Billable
                  </Label>
                </div>
                <button
                  onClick={addBreak}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                    dark
                      ? "border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400"
                      : "border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-600"
                  }`}
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Add break</span>
                  <span className="sm:hidden">Break</span>
                </button>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div style={{ fontFamily: "'DM Mono', monospace" }}>
                  {form.start && form.end ? (
                    <>
                      <span
                        className="text-xl sm:text-2xl font-semibold"
                        style={dark ? {
                          background: "linear-gradient(to right, #22d3ee, #2dd4bf, #34d399)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        } : { color: "var(--color-accent)" }}
                      >{formatDuration(previewMins)}</span>
                      <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: 8 }}>{formatDecimal(previewMins)} hrs</span>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Select times to see hours</p>
                  )}
                </div>
                <button
                  onClick={() => handleSubmit(form)}
                  disabled={!form.date || !form.start || !form.end}
                  className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold text-white transition-all disabled:opacity-40 ${
                    dark
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                      : "bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/20"
                  }`}
                >
                  Log Hours
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
