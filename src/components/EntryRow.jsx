import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import TimeSelect from "./TimeSelect";
import { calcWorked, formatDuration, formatDecimal, toDisplayTime, unpaidBreakMins, formatMoney } from "../lib/utils";
import { Edit2, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function timeToHour(t) {
  if (!t) return 8;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

export default function EntryRow({ entry, index }) {
  const {
    inlineEditId, inlineForm,
    startInlineEdit, cancelInlineEdit, saveInlineEdit, setInlineField,
    addInlineBreak, updateInlineBreak, removeInlineBreak,
    handleDelete, duplicateEntry,
    hourlyRate, projects,
  } = useApp();

  const { theme } = useTheme();
  const dark = theme === "dark";
  const isEditing = inlineEditId === entry.id;
  const inputCls = "bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-2 text-sm shadow-sm";

  if (isEditing && inlineForm) {
    const inlinePreviewMins = calcWorked(inlineForm.start, inlineForm.end, inlineForm.breaks);
    return (
      <div style={{ padding: "16px 18px", borderTop: index > 0 ? "1px solid var(--color-border-light)" : "none", background: "var(--color-accent-light)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 4 }}>Date</p>
            <input type="date" value={inlineForm.date} onChange={(e) => setInlineField("date", e.target.value)}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "var(--color-text)", background: "var(--color-input-bg)", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 4 }}>Start</p>
            <TimeSelect value={inlineForm.start} onChange={(v) => setInlineField("start", v)} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginBottom: 4 }}>End</p>
            <TimeSelect value={inlineForm.end} onChange={(v) => setInlineField("end", v)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <Textarea value={inlineForm.description} onChange={(e) => setInlineField("description", e.target.value)}
            placeholder="Description…" rows={2} className={`${inputCls} resize-none`} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          {projects.length > 0 && (
            <Select
              value={inlineForm.projectId ? String(inlineForm.projectId) : "__none__"}
              onValueChange={(v) => setInlineField("projectId", v === "__none__" ? null : v)}
            >
              <SelectTrigger className={`${inputCls} w-44 h-9`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                <SelectItem value="__none__" className="focus:bg-[var(--color-accent-light)]">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="focus:bg-[var(--color-accent-light)]">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#14b8a6", display: "inline-block" }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Checkbox id={`ib-bill-${entry.id}`} checked={inlineForm.billable !== false}
              onCheckedChange={(v) => setInlineField("billable", !!v)}
              className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4" />
            <Label htmlFor={`ib-bill-${entry.id}`} style={{ fontSize: 12, color: "var(--color-secondary)", cursor: "pointer" }}>Billable</Label>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          {inlineForm.breaks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 10px", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--color-muted)" }}>From</span>
              <TimeSelect value={b.start} onChange={(v) => updateInlineBreak(b.id, { start: v })} />
              <span style={{ fontSize: 11, color: "var(--color-muted)" }}>→</span>
              <TimeSelect value={b.end} onChange={(v) => updateInlineBreak(b.id, { end: v })} />
              <Checkbox id={`ib-${b.id}`} checked={b.unpaid} onCheckedChange={(v) => updateInlineBreak(b.id, { unpaid: !!v })}
                className="border-[var(--color-border)] data-[state=checked]:bg-[var(--color-accent)] data-[state=checked]:border-[var(--color-accent)] h-4 w-4" />
              <Label htmlFor={`ib-${b.id}`} style={{ fontSize: 11, color: "var(--color-secondary)", cursor: "pointer" }}>Unpaid</Label>
              <button onClick={() => removeInlineBreak(b.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 14, lineHeight: 1 }} className="hover:text-red-400">✕</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addInlineBreak} className="h-7 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-secondary)" }}>+ Add break</Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'DM Mono', monospace" }}>
            {inlineForm.start && inlineForm.end && (
              <>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-accent)" }}>{formatDuration(inlinePreviewMins)}</span>
                <span style={{ fontSize: 11, color: "var(--color-muted)", marginLeft: 6 }}>{formatDecimal(inlinePreviewMins)} hrs</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={cancelInlineEdit} className="h-8 px-3 text-sm" style={{ color: "var(--color-secondary)" }}>Cancel</Button>
            <Button size="sm" onClick={saveInlineEdit} disabled={!inlineForm.date || !inlineForm.start || !inlineForm.end}
              className="h-8 px-4 text-sm font-semibold disabled:opacity-40"
              style={{ background: "var(--color-accent)", color: "#fff" }}>Save</Button>
          </div>
        </div>
      </div>
    );
  }

  const bm = unpaidBreakMins(entry);
  const project = projects.find((p) => p.id === entry.project_id);

  const startH = timeToHour(entry.start);
  const endH = timeToHour(entry.end);
  const leftPct = Math.max(0, Math.min(100, ((startH - 8) / 12) * 100));
  const widthPct = Math.max(0, Math.min(100 - leftPct, ((endH - startH) / 12) * 100));

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      dark
        ? "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50"
        : "bg-white/50 border-slate-200/50 hover:border-slate-300/60 hover:shadow-sm"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {project ? (
              <span
                style={{ background: project.color + "22", color: project.color, borderColor: project.color + "44" }}
                className="text-xs px-2 py-0.5 rounded-full font-medium border"
              >
                {project.name}
              </span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                dark ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-500"
              }`}>
                No project
              </span>
            )}
            {entry.billable !== false ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                dark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
              }`}>
                Billable
              </span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"
              }`}>
                Non-billable
              </span>
            )}
          </div>
          {/* Description */}
          <p className={`font-medium mb-2 truncate ${dark ? "text-white" : "text-slate-800"} ${!entry.description ? "opacity-40 italic" : ""}`}>
            {entry.description || "No description"}
          </p>
          {/* Time range + break deduction */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`text-sm font-mono ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {toDisplayTime(entry.start)} → {toDisplayTime(entry.end)}
            </span>
            {bm > 0 && (
              <span className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
                −{formatDuration(bm)} break
              </span>
            )}
          </div>
        </div>

        <div className="text-right ml-4 flex-shrink-0">
          {hourlyRate > 0 && (
            <div className={`text-xs font-mono mb-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {formatMoney((entry.billable !== false ? entry.minutes : 0) / 60 * hourlyRate)}
            </div>
          )}
          <div className={`text-xl font-mono font-semibold ${dark ? "text-cyan-400" : "text-teal-600"}`}>
            {formatDuration(entry.minutes)}
          </div>
          {/* Action buttons — always visible, icon style */}
          <div className="flex items-center gap-1 mt-2 justify-end">
            <button
              onClick={() => startInlineEdit(entry)}
              title="Edit"
              className={`p-1.5 rounded-lg transition-all ${dark ? "text-cyan-400 hover:bg-cyan-500/10" : "text-blue-600 hover:bg-blue-50"}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => duplicateEntry(entry)}
              title="Duplicate to today"
              className={`p-1.5 rounded-lg transition-all ${dark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(entry.id)}
              title="Delete"
              className={`p-1.5 rounded-lg transition-all ${dark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline bar */}
      <div className={`relative h-2 rounded-full overflow-hidden ${dark ? "bg-slate-800/50" : "bg-slate-200/50"}`}>
        <div
          className={`absolute top-0 h-full rounded-full ${
            entry.billable !== false
              ? dark ? "bg-gradient-to-r from-cyan-500 to-teal-500" : "bg-gradient-to-r from-teal-500 to-emerald-500"
              : dark ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-purple-400 to-pink-400"
          }`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {(entry.breaks || []).filter((b) => b.unpaid).map((b, i) => {
          const bStart = timeToHour(b.start);
          const bEnd = timeToHour(b.end);
          const bLeft = Math.max(0, ((bStart - 8) / 12) * 100);
          const bWidth = Math.max(0, ((bEnd - bStart) / 12) * 100);
          return (
            <div
              key={i}
              className={`absolute top-0 h-full ${dark ? "bg-slate-950/80" : "bg-white/80"}`}
              style={{ left: `${bLeft}%`, width: `${bWidth}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
