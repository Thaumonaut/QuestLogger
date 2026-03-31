import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import TimeSelect from "./TimeSelect";
import { calcWorked, formatDuration, formatDecimal, todayStr, toDisplayTime } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function FieldRow({ label, children, hint }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      columnGap: 24,
      alignItems: "start",
      paddingTop: 14,
      paddingBottom: 14,
      borderBottom: "1px solid var(--color-border-light)",
    }}
      className="last:border-0"
    >
      <div style={{ paddingTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-secondary)", margin: 0 }}>{label}</p>
        {hint && <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function LogHoursForm() {
  const {
    form, setForm, setField, addBreak, updateBreak, removeBreak,
    handleSubmit, applyTemplate, templates, projects, settings,
    clockIn, handleClockIn, handleClockOut, clockedElapsed, breakElapsed,
    updateClockIn, startClockBreak, endClockBreak,
    clockedTick, timeRounding,
    logHoursRef, dateInputRef, deepseekKey, rewriteDescription, rewritingDesc,
  } = useApp();

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

  return (
    <Card ref={logHoursRef} style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }} className="shadow-sm mb-8">
      <CardHeader className="px-6 pt-6 pb-2">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <CardTitle style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", fontFamily: "'Parkinsans', sans-serif" }}>
              Log Hours
            </CardTitle>
          </div>
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
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  opacity: clockIn ? 1 : 1, // always visible, just locked when clocked in
                  cursor: clockIn ? "default" : "pointer",
                }}
              >
                {m === "manual" ? "Manual" : "Auto"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2">

        {/* ── AUTO MODE ── */}
        {mode === "auto" && (
          <>
            {!clockIn ? (
              /* Not clocked in */
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
              /* Clocked in state */
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

                {/* What are you working on */}
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

                {/* Project + Billable row */}
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
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#0d9488", display: "inline-block" }} />
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

                  {/* Completed breaks */}
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

                  {/* Active break or Start Break button */}
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
              <FieldRow label="Template" hint="Apply saved defaults">
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
              </FieldRow>
            )}

            <FieldRow label="Date">
              <label
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer",
                  position: "relative",
                  background: form.date ? "var(--color-accent-light)" : "var(--color-surface-raised)",
                  border: `1px solid ${form.date ? "var(--color-accent-border)" : "var(--color-border)"}`,
                  borderRadius: 10, padding: "10px 16px", transition: "border-color 0.15s",
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
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={form.date ? "var(--color-accent)" : "var(--color-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: "relative", zIndex: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {form.date ? (
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.2, margin: 0 }}>
                      {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-secondary)", margin: "2px 0 0" }}>
                      {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, position: "relative", zIndex: 0 }}>Select a date</p>
                )}
              </label>
            </FieldRow>

            <FieldRow label="Start time">
              <TimeSelect value={form.start} onChange={(v) => setField("start", v)} />
            </FieldRow>

            <FieldRow label="End time">
              <TimeSelect value={form.end} onChange={(v) => setField("end", v)} />
            </FieldRow>

            <FieldRow label="Description" hint="What did you work on?">
              <div style={{ position: "relative" }}>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="e.g. Reviewed pull requests, team standup, client call…"
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
            </FieldRow>

            {/* Project */}
            {projects.length > 0 && (
              <FieldRow label="Project">
                <Select
                  value={form.projectId ? String(form.projectId) : "__none__"}
                  onValueChange={(v) => setField("projectId", v === "__none__" ? null : v)}
                >
                  <SelectTrigger className={`${inputCls} w-48 h-10`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                    <SelectItem value="__none__" className="focus:bg-[var(--color-accent-light)]">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="focus:bg-[var(--color-accent-light)]">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#0d9488", display: "inline-block" }} />
                          {p.name}{p.client_name ? ` · ${p.client_name}` : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            )}

            {/* Billable */}
            <FieldRow label="Billable">
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                <Checkbox
                  id="form-billable"
                  checked={form.billable !== false}
                  onCheckedChange={(v) => setField("billable", !!v)}
                  className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4"
                />
                <Label htmlFor="form-billable" style={{ fontSize: 13, color: "var(--color-secondary)", cursor: "pointer" }}>
                  Billable time
                </Label>
              </div>
            </FieldRow>

            <FieldRow label="Breaks" hint="Unpaid breaks are deducted">
              <div className="space-y-2">
                {form.breaks.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--color-muted)", fontStyle: "italic" }}>No breaks added.</p>
                )}
                {form.breaks.map((b) => (
                  <div key={b.id} style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>From</p>
                        <TimeSelect value={b.start} onChange={(v) => updateBreak(b.id, { start: v })} />
                      </div>
                      <div style={{ paddingTop: 18, color: "var(--color-muted)" }}>→</div>
                      <div>
                        <p style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>To</p>
                        <TimeSelect value={b.end} onChange={(v) => updateBreak(b.id, { end: v })} />
                      </div>
                      <button onClick={() => removeBreak(b.id)} style={{ marginLeft: "auto", paddingTop: 18, background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 16, lineHeight: 1 }} className="hover:text-red-400">✕</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Checkbox id={`u-${b.id}`} checked={b.unpaid} onCheckedChange={(v) => updateBreak(b.id, { unpaid: !!v })} className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4" />
                      <Label htmlFor={`u-${b.id}`} style={{ fontSize: 13, color: "var(--color-secondary)", cursor: "pointer" }}>
                        Unpaid break <span style={{ color: "var(--color-muted)", fontSize: 12 }}>(deducted from hours)</span>
                      </Label>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addBreak} className="h-8 text-xs mt-1" style={{ borderColor: "var(--color-border)", color: "var(--color-secondary)" }}>
                  + Add break
                </Button>
              </div>
            </FieldRow>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                {form.start && form.end ? (
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>
                    <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-accent)" }}>{formatDuration(previewMins)}</span>
                    <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: 8 }}>{formatDecimal(previewMins)} hrs</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Select times to see hours</p>
                )}
              </div>
              <Button
                onClick={() => handleSubmit(form)}
                disabled={!form.date || !form.start || !form.end}
                className="h-9 px-5 text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                Log Hours
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
