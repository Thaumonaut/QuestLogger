import { useApp } from "../context/AppContext";
import TimeSelect from "./TimeSelect";
import { calcWorked, formatDuration, formatDecimal, toDisplayTime, unpaidBreakMins } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function EntryRow({ entry, index }) {
  const {
    inlineEditId, inlineForm,
    startInlineEdit, cancelInlineEdit, saveInlineEdit, setInlineField,
    addInlineBreak, updateInlineBreak, removeInlineBreak,
    handleDelete, duplicateEntry,
    hourlyRate, projects,
  } = useApp();

  const isEditing = inlineEditId === entry.id;
  const inputCls = "bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-2 text-sm shadow-sm";

  if (isEditing && inlineForm) {
    const inlinePreviewMins = calcWorked(inlineForm.start, inlineForm.end, inlineForm.breaks);
    const project = projects.find((p) => p.id === inlineForm.projectId);
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

        {/* Project + billable in inline edit */}
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
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#0d9488", display: "inline-block" }} />
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

  return (
    <div className="entry-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderTop: index > 0 ? "1px solid var(--color-border-light)" : "none", transition: "background 0.15s" }}>
      <span style={{ fontSize: 12, color: "var(--color-muted)", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", width: 130, flexShrink: 0 }}>
        {toDisplayTime(entry.start)} – {toDisplayTime(entry.end)}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: entry.description ? "var(--color-text-secondary)" : "var(--color-muted)", fontStyle: entry.description ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.description || "No description"}
      </span>
      {/* Project badge */}
      {project && (
        <span style={{ fontSize: 11, fontWeight: 500, background: project.color + "22", color: project.color, border: `1px solid ${project.color}44`, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
          {project.name}
        </span>
      )}
      {/* Non-billable badge */}
      {entry.billable === false && (
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", background: "var(--color-tag-bg)", border: "1px solid var(--color-border)", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
          non-billable
        </span>
      )}
      {bm > 0 && (
        <span style={{ fontSize: 11, color: "var(--color-muted)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
          −{formatDuration(bm)}
        </span>
      )}
      {hourlyRate > 0 && (
        <span style={{ fontSize: 12, fontWeight: 500, color: entry.billable !== false ? "var(--color-text-secondary)" : "var(--color-muted)", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
          ${((entry.billable !== false ? entry.minutes : 0) / 60 * hourlyRate).toFixed(0)}
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", width: 52, textAlign: "right", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
        {formatDuration(entry.minutes)}
      </span>
      <Button variant="ghost" size="sm" onClick={() => startInlineEdit(entry)} className="h-7 px-2 text-xs shrink-0" style={{ color: "var(--color-muted)" }}>Edit</Button>
      <Button variant="ghost" size="sm" onClick={() => duplicateEntry(entry)} className="delete-btn h-7 px-2 text-xs shrink-0" style={{ opacity: 0, transition: "opacity 0.15s", color: "var(--color-muted)" }} title="Duplicate to today">⧉</Button>
      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} className="delete-btn h-7 w-7 p-0 shrink-0 hover:text-red-400 hover:bg-red-50" style={{ opacity: 0, transition: "opacity 0.15s", color: "var(--color-muted)" }}>✕</Button>
    </div>
  );
}
