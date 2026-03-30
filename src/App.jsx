import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import AuthPage from "./AuthPage";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function isUUID(id) {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
function normalizeTime(t) { return t ? t.slice(0, 5) : ""; }
function normalizeEntry(row) {
  return { ...row, start: normalizeTime(row.start), end: normalizeTime(row.end_time) };
}
function normalizeTemplate(row) {
  return { ...row, start: normalizeTime(row.start), end: normalizeTime(row.end_time) };
}
function normalizeSettings(row) {
  return {
    name: row.name || "",
    defaultStart: normalizeTime(row.default_start),
    defaultEnd: normalizeTime(row.default_end),
    defaultTemplateId: row.default_template_id || undefined,
    reminderTime: normalizeTime(row.reminder_time),
  };
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));
const MINUTE_OPTIONS = ["00", "15", "30", "45"].map((m) => ({
  value: m,
  label: m,
}));
const PERIOD_OPTIONS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

function TimeSelect({ value, onChange }) {
  let hour = "", minute = "", period = "AM";
  if (value) {
    const [h, m] = value.split(":").map(Number);
    period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    hour = String(h12);
    minute = m.toString().padStart(2, "0");
  }

  function emit(h, m, p) {
    if (!h || !m) return;
    let h24 = parseInt(h, 10);
    if (p === "AM" && h24 === 12) h24 = 0;
    if (p === "PM" && h24 !== 12) h24 += 12;
    onChange(`${h24.toString().padStart(2, "0")}:${m}`);
  }

  const triggerCls =
    "bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-teal-400/40 focus:ring-2 h-10 text-sm shadow-sm";

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(v) => emit(v, minute || "00", period)}>
        <SelectTrigger className={`${triggerCls} w-16`}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {HOUR_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="focus:bg-teal-50 focus:text-teal-800">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-slate-400 font-semibold text-base select-none">:</span>
      <Select value={minute} onValueChange={(v) => emit(hour || "12", v, period)}>
        <SelectTrigger className={`${triggerCls} w-16`}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {MINUTE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="focus:bg-teal-50 focus:text-teal-800">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => emit(hour || "12", minute || "00", v)}>
        <SelectTrigger className={`${triggerCls} w-20`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="focus:bg-teal-50 focus:text-teal-800">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function parseTime(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function calcWorked(start, end, breaks) {
  const s = parseTime(start), e = parseTime(end);
  if (s === null || e === null || e <= s) return 0;
  const unpaidMins = (breaks || [])
    .filter((b) => b.unpaid)
    .reduce((acc, b) => {
      const bs = parseTime(b.start), be = parseTime(b.end);
      return bs !== null && be !== null && be > bs ? acc + (be - bs) : acc;
    }, 0);
  return Math.max(0, e - s - unpaidMins);
}

function unpaidBreakMins(entry) {
  return (entry.breaks || [])
    .filter((b) => b.unpaid)
    .reduce((acc, b) => {
      const bs = parseTime(b.start), be = parseTime(b.end);
      return bs !== null && be !== null && be > bs ? acc + (be - bs) : acc;
    }, 0);
}

function formatDuration(mins) {
  if (mins <= 0) return "0h 0m";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDecimal(mins) {
  return (mins / 60).toFixed(2);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function weekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function formatMoney(amount) {
  return "$" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMonthLabel(yearMonth) {
  return new Date(yearMonth + "-15T12:00:00").toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });
}

function weekRangeLabel(weekSunStr) {
  const sun = new Date(weekSunStr + "T12:00:00");
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(sun)} – ${fmt(sat)}`;
}

function toDisplayTime(val) {
  if (!val) return "—";
  const [h, m] = val.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function makeEmptyForm(s = {}, templates = []) {
  if (s.defaultTemplateId) {
    const tmpl = templates.find((t) => t.id === s.defaultTemplateId);
    if (tmpl) {
      return {
        date: todayStr(),
        start: tmpl.start || "",
        end: tmpl.end || "",
        description: "",
        breaks: (tmpl.breaks || []).map((b) => ({ ...b, id: Date.now() + Math.random() })),
      };
    }
  }
  return {
    date: todayStr(),
    start: s.defaultStart || "",
    end: s.defaultEnd || "",
    description: "",
    breaks: [],
  };
}

function FieldRow({ label, children, hint }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-6 items-start py-3.5 border-b border-slate-100 last:border-0">
      <div className="pt-2">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Compact break row used inside template editor
function TemplateBreakRow({ b, onChange, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#94a3b8" }}>From</span>
      <TimeSelect value={b.start} onChange={(v) => onChange({ start: v })} />
      <span style={{ fontSize: 11, color: "#cbd5e1" }}>→</span>
      <TimeSelect value={b.end} onChange={(v) => onChange({ end: v })} />
      <Checkbox
        id={`tb-${b.id}`}
        checked={b.unpaid}
        onCheckedChange={(v) => onChange({ unpaid: !!v })}
        className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 h-4 w-4"
      />
      <Label htmlFor={`tb-${b.id}`} className="text-xs text-slate-500 cursor-pointer select-none">Unpaid</Label>
      <button onClick={onRemove} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 14, lineHeight: 1 }} className="hover:text-red-400">✕</button>
    </div>
  );
}

// Inline template editor (used for both new and editing)
function TemplateEditor({ value, onChange, onAddBreak, onChangeBreak, onRemoveBreak, onSave, onCancel, saveLabel = "Save template" }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginTop: 8 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 160px" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>Name</p>
          <Input
            value={value.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Regular day"
            className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-9"
          />
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>Start</p>
          <TimeSelect value={value.start || ""} onChange={(v) => onChange({ start: v })} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>End</p>
          <TimeSelect value={value.end || ""} onChange={(v) => onChange({ end: v })} />
        </div>
      </div>
      {(value.breaks || []).map((b) => (
        <TemplateBreakRow
          key={b.id}
          b={b}
          onChange={(patch) => onChangeBreak(b.id, patch)}
          onRemove={() => onRemoveBreak(b.id)}
        />
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <Button variant="outline" size="sm" onClick={onAddBreak} className="h-7 text-xs border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50">
          + Add break
        </Button>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-3 text-xs text-slate-500 hover:text-slate-700">Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={!value.name || !value.start || !value.end} className="h-7 px-3 text-xs font-semibold disabled:opacity-40" style={{ background: "#0d9488", color: "#fff" }}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ── Auth ────────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── App state ────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({});
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(() => makeEmptyForm());
  const [loading, setLoading] = useState(true);

  const [exportMsg, setExportMsg] = useState("");
  const [localImportBanner, setLocalImportBanner] = useState(null); // { count } | null
  const importEntriesRef = useRef(null);
  const importProfileRef = useRef(null);
  const [reminderTime, setReminderTime] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [deepseekKey, setDeepseekKey] = useState("");
  const [rewritingDesc, setRewritingDesc] = useState(false);
  const [monthSummaries, setMonthSummaries] = useState({});

  // Draft state for settings modal
  const [draftSettings, setDraftSettings] = useState({});
  const [draftTemplates, setDraftTemplates] = useState([]);
  const [draftNewTemplate, setDraftNewTemplate] = useState(null);
  const [draftEditingId, setDraftEditingId] = useState(null);
  const [draftEditingTemplate, setDraftEditingTemplate] = useState(null);

  const dateInputRef = useRef(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineForm, setInlineForm] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedDates, setExpandedDates] = useState(() => new Set([todayStr()]));
  const [hourlyRate, setHourlyRate] = useState(0);
  const [earningsPeriod, setEarningsPeriod] = useState("week");

  // ── Load data when session changes ──────────────────────────
  useEffect(() => {
    if (!session) return;
    async function loadData() {
      setLoading(true);
      const [entriesRes, templatesRes, settingsRes] = await Promise.all([
        supabase.from("entries").select("*").order("date", { ascending: false }),
        supabase.from("templates").select("*").order("created_at"),
        supabase.from("user_settings").select("*").single(),
      ]);
      const loadedTemplates = (templatesRes.data ?? []).map(normalizeTemplate);
      const loadedSettings = settingsRes.data ? normalizeSettings(settingsRes.data) : {};
      const loadedEntries = (entriesRes.data ?? []).map(normalizeEntry);
      setTemplates(loadedTemplates);
      setSettings(loadedSettings);
      setEntries(loadedEntries);
      setHourlyRate(settingsRes.data?.hourly_rate ?? 0);
      setDeepseekKey(settingsRes.data?.deepseek_key ?? "");
      setReminderTime(normalizeTime(settingsRes.data?.reminder_time ?? ""));
      setForm(makeEmptyForm(loadedSettings, loadedTemplates));
      setLoading(false);
      // Check for old localStorage data from before migration
      try {
        const oldEntries = JSON.parse(localStorage.getItem("worklog_entries_v2") || "[]");
        if (oldEntries.length > 0 && (entriesRes.data ?? []).length === 0) {
          setLocalImportBanner({ count: oldEntries.length });
        }
      } catch {}
    }
    loadData();
  }, [session]);

  // ── Notification reminder check ──────────────────────────────
  useEffect(() => {
    if (!reminderTime || !session) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const checkReminder = () => {
      const now = new Date();
      const [rh, rm] = reminderTime.split(":").map(Number);
      const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rh, rm, 0);
      const todayLogged = entries.some((e) => e.date === todayStr());
      const alreadyNotifiedKey = `ql_notified_${todayStr()}`;

      if (now >= reminderDate && !todayLogged && !localStorage.getItem(alreadyNotifiedKey)) {
        new Notification("QuestLogger reminder", {
          body: "You haven't logged any hours today. Tap to open.",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "daily-reminder",
        });
        localStorage.setItem(alreadyNotifiedKey, "1");
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 60_000);
    return () => clearInterval(interval);
  }, [reminderTime, session, entries]);

  function openSettings() {
    setDraftSettings({ ...settings, hourlyRate: hourlyRate || "", _deepseekKey: deepseekKey, _reminderTime: reminderTime });
    setDraftTemplates(templates.map((t) => ({ ...t, breaks: [...(t.breaks || [])] })));
    setDraftNewTemplate(null);
    setDraftEditingId(null);
    setDraftEditingTemplate(null);
    setShowSettings(true);
  }

  async function saveSettings() {
    const { hourlyRate: draftRate, _deepseekKey: draftKey, _reminderTime: draftReminder, ...rest } = draftSettings;
    const rate = parseFloat(draftRate) || 0;
    const key = (draftKey || "").trim();
    const reminder = draftReminder || null;

    // Sync templates: delete removed, upsert remaining
    const existingUUIDs = templates.map((t) => t.id).filter(isUUID);
    const draftUUIDs = draftTemplates.map((t) => t.id).filter(isUUID);
    const removed = existingUUIDs.filter((id) => !draftUUIDs.includes(id));
    if (removed.length) await supabase.from("templates").delete().in("id", removed);

    let finalDefaultTemplateId = rest.defaultTemplateId;
    if (draftTemplates.length > 0) {
      const toUpsert = draftTemplates.map((t) => {
        const obj = { user_id: session.user.id, name: t.name, start: t.start || null, end_time: t.end || null, breaks: t.breaks || [] };
        if (isUUID(t.id)) obj.id = t.id;
        return obj;
      });
      const { data: saved } = await supabase.from("templates").upsert(toUpsert).select();
      const normalizedSaved = (saved || []).map(normalizeTemplate);
      setTemplates(normalizedSaved);
      // Remap temp defaultTemplateId to real UUID if needed
      if (finalDefaultTemplateId && !isUUID(finalDefaultTemplateId)) {
        const idx = draftTemplates.findIndex((t) => String(t.id) === String(finalDefaultTemplateId));
        finalDefaultTemplateId = idx >= 0 && normalizedSaved[idx] ? normalizedSaved[idx].id : undefined;
      }
    } else {
      setTemplates([]);
    }

    await supabase.from("user_settings").upsert({
      user_id: session.user.id,
      name: rest.name || null,
      default_start: rest.defaultStart || null,
      default_end: rest.defaultEnd || null,
      default_template_id: finalDefaultTemplateId || null,
      hourly_rate: rate,
      deepseek_key: key,
      reminder_time: reminder,
      updated_at: new Date().toISOString(),
    });

    const newSettings = { ...rest, defaultTemplateId: finalDefaultTemplateId };
    setSettings(newSettings);
    setHourlyRate(rate);
    setDeepseekKey(key);
    setReminderTime(reminder || "");
    setShowSettings(false);
  }

  // --- Template draft helpers ---
  function startDraftNew() {
    setDraftNewTemplate({ name: "", start: "", end: "", breaks: [] });
    setDraftEditingId(null);
    setDraftEditingTemplate(null);
  }

  function commitDraftNew() {
    const tempId = Date.now(); // temporary client-side ID until saved to Supabase
    setDraftTemplates((ts) => [...ts, { ...draftNewTemplate, id: tempId }]);
    setDraftNewTemplate(null);
  }

  function startDraftEdit(tmpl) {
    setDraftEditingId(tmpl.id);
    setDraftEditingTemplate({ ...tmpl, breaks: [...(tmpl.breaks || [])] });
    setDraftNewTemplate(null);
  }

  function commitDraftEdit() {
    setDraftTemplates((ts) => ts.map((t) => t.id === draftEditingId ? draftEditingTemplate : t));
    setDraftEditingId(null);
    setDraftEditingTemplate(null);
  }

  function deleteDraftTemplate(id) {
    setDraftTemplates((ts) => ts.filter((t) => t.id !== id));
    if (draftSettings.defaultTemplateId === id) {
      setDraftSettings((d) => ({ ...d, defaultTemplateId: undefined }));
    }
  }

  // --- Form helpers ---
  function applyTemplate(tmpl) {
    setForm((f) => ({
      ...f,
      start: tmpl.start || "",
      end: tmpl.end || "",
      breaks: (tmpl.breaks || []).map((b) => ({ ...b, id: Date.now() + Math.random() })),
    }));
  }

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addBreak() {
    setForm((f) => ({ ...f, breaks: [...f.breaks, { id: Date.now(), start: "", end: "", unpaid: true }] }));
  }
  function updateBreak(id, patch) {
    setForm((f) => ({ ...f, breaks: f.breaks.map((b) => b.id === id ? { ...b, ...patch } : b) }));
  }
  function removeBreak(id) {
    setForm((f) => ({ ...f, breaks: f.breaks.filter((b) => b.id !== id) }));
  }

  // --- Inline edit helpers ---
  function startInlineEdit(entry) {
    setInlineEditId(entry.id);
    setInlineForm({ date: entry.date, start: entry.start, end: entry.end, description: entry.description, breaks: entry.breaks || [] });
  }
  function cancelInlineEdit() { setInlineEditId(null); setInlineForm(null); }
  async function saveInlineEdit() {
    if (!inlineForm || !inlineForm.date || !inlineForm.start || !inlineForm.end) return;
    const minutes = calcWorked(inlineForm.start, inlineForm.end, inlineForm.breaks);
    await supabase.from("entries").update({
      date: inlineForm.date,
      start: inlineForm.start || null,
      end_time: inlineForm.end || null,
      description: inlineForm.description || "",
      minutes,
      breaks: inlineForm.breaks,
    }).eq("id", inlineEditId);
    setEntries((prev) => prev.map((e) => e.id === inlineEditId ? { ...e, ...inlineForm, minutes } : e));
    setInlineEditId(null);
    setInlineForm(null);
  }
  function setInlineField(key, val) { setInlineForm((f) => ({ ...f, [key]: val })); }
  function addInlineBreak() { setInlineForm((f) => ({ ...f, breaks: [...f.breaks, { id: Date.now(), start: "", end: "", unpaid: true }] })); }
  function updateInlineBreak(id, patch) { setInlineForm((f) => ({ ...f, breaks: f.breaks.map((b) => b.id === id ? { ...b, ...patch } : b) })); }
  function removeInlineBreak(id) { setInlineForm((f) => ({ ...f, breaks: f.breaks.filter((b) => b.id !== id) })); }

  function toggleExpanded(date, dayEntries) {
    if (expandedDates.has(date) && inlineEditId && dayEntries.some((e) => e.id === inlineEditId)) {
      setInlineEditId(null); setInlineForm(null);
    }
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  async function handleSubmit() {
    if (!form.date || !form.start || !form.end) return;
    const minutes = calcWorked(form.start, form.end, form.breaks);
    const { data } = await supabase.from("entries").insert({
      user_id: session.user.id,
      date: form.date,
      start: form.start || null,
      end_time: form.end || null,
      description: form.description || "",
      minutes,
      breaks: form.breaks,
    }).select().single();
    if (data) setEntries((prev) => [normalizeEntry(data), ...prev]);
    setForm(makeEmptyForm(settings, templates));
  }

  async function handleDelete(id) {
    await supabase.from("entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const grouped = useMemo(() => {
    const byDate = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    for (const date of Object.keys(byDate)) {
      byDate[date].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    }
    const byMonthWeek = {};
    for (const [date, dayEntries] of Object.entries(byDate)) {
      const monthKey = date.slice(0, 7);
      const wk = weekStart(date);
      if (!byMonthWeek[monthKey]) byMonthWeek[monthKey] = {};
      if (!byMonthWeek[monthKey][wk]) byMonthWeek[monthKey][wk] = [];
      byMonthWeek[monthKey][wk].push({ date, entries: dayEntries });
    }
    const dir = sortAsc ? 1 : -1;
    return Object.keys(byMonthWeek)
      .sort((a, b) => dir * a.localeCompare(b))
      .map((monthKey) => ({
        monthKey,
        weeks: Object.keys(byMonthWeek[monthKey])
          .sort((a, b) => dir * a.localeCompare(b))
          .map((weekKey) => ({
            weekKey,
            days: [...byMonthWeek[monthKey][weekKey]].sort((a, b) => dir * a.date.localeCompare(b.date)),
          })),
      }));
  }, [entries, sortAsc]);

  const todayMins = useMemo(
    () => entries.filter((e) => e.date === todayStr()).reduce((a, e) => a + e.minutes, 0),
    [entries],
  );

  const previewMins = calcWorked(form.start, form.end, form.breaks);

  const earningsData = useMemo(() => {
    const today = todayStr();
    const thisWeekSun = weekStart(today);
    const thisMonth = today.slice(0, 7);
    const weekMins = entries.filter((e) => weekStart(e.date) === thisWeekSun).reduce((a, e) => a + e.minutes, 0);
    const monthMins = entries.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((a, e) => a + e.minutes, 0);
    const byWeek = {}, byMonth = {};
    for (const e of entries) {
      const wk = weekStart(e.date);
      byWeek[wk] = (byWeek[wk] || 0) + e.minutes;
      const mo = e.date.slice(0, 7);
      byMonth[mo] = (byMonth[mo] || 0) + e.minutes;
    }
    const weekKeys = Object.keys(byWeek);
    const monthKeys = Object.keys(byMonth);
    const avgWeekMins = weekKeys.length > 0 ? weekKeys.reduce((a, k) => a + byWeek[k], 0) / weekKeys.length : 0;
    const avgMonthMins = monthKeys.length > 0 ? monthKeys.reduce((a, k) => a + byMonth[k], 0) / monthKeys.length : 0;
    const periodMins = earningsPeriod === "week" ? weekMins : monthMins;
    return {
      periodMins, avgWeekMins, avgMonthMins,
      periodEarnings: (periodMins / 60) * hourlyRate,
      avgWeekEarnings: (avgWeekMins / 60) * hourlyRate,
      avgMonthEarnings: (avgMonthMins / 60) * hourlyRate,
    };
  }, [entries, hourlyRate, earningsPeriod]);

  function flash(msg) {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(""), 2500);
  }

  async function callDeepSeek(systemPrompt, userPrompt) {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content.trim();
  }

  async function rewriteDescription() {
    if (!form.description.trim() || !deepseekKey) return;
    setRewritingDesc(true);
    try {
      const result = await callDeepSeek(
        "You are a professional business writer. Rewrite work log descriptions into concise, professional client-facing language. Keep it to 1–2 sentences. Do not invent details not present in the original.",
        `Rewrite this work description professionally: "${form.description}"`,
      );
      setField("description", result);
    } catch (e) {
      flash("✗ AI rewrite failed");
    } finally {
      setRewritingDesc(false);
    }
  }

  async function generateMonthSummary(monthKey, weeks) {
    if (!deepseekKey) return;
    setMonthSummaries((s) => ({ ...s, [monthKey]: { loading: true, text: null } }));
    try {
      const allEntries = weeks
        .flatMap((w) => w.days)
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap(({ date, entries: dayEntries }) =>
          dayEntries
            .filter((e) => e.description)
            .map((e) => `${date} (${formatDecimal(e.minutes)}h): ${e.description}`)
        );
      const totalMins = weeks.flatMap((w) => w.days).flatMap((d) => d.entries).reduce((a, e) => a + e.minutes, 0);
      const result = await callDeepSeek(
        "You are a professional writer creating concise work summaries for client invoices and reports. Write in first person. Be specific about what was accomplished. 2–4 sentences maximum.",
        `Write a professional summary for ${formatMonthLabel(monthKey)} (${formatDecimal(totalMins)} hours total) from these work log entries:\n\n${allEntries.join("\n")}`,
      );
      setMonthSummaries((s) => ({ ...s, [monthKey]: { loading: false, text: result } }));
    } catch (e) {
      setMonthSummaries((s) => ({ ...s, [monthKey]: { loading: false, text: null } }));
      flash("✗ AI summary failed");
    }
  }

  function buildCSVRows(days, label) {
    const hasRate = hourlyRate > 0;
    const csv = (val) => {
      const s = String(val ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (...cells) => cells.map(csv).join(",");

    const rows = [];
    // Title row
    const title = settings.name ? `${settings.name}'s Timesheet` : "Timesheet";
    rows.push(csv(title));
    if (label) rows.push(row("Period:", label));
    if (settings.name) rows.push(row("Name:", settings.name));
    if (hasRate) rows.push(row("Hourly Rate:", `$${hourlyRate.toFixed(2)}`));
    rows.push("");

    // Column headers
    // Entry columns + two trailing "total" columns for day/week/grand totals
    if (hasRate) {
      rows.push(row("Date", "Start", "End", "Unpaid Break (mins)", "Income Earned", "Hours Worked", "Description", "Total Income", "Total Hours"));
    } else {
      rows.push(row("Date", "Start", "End", "Unpaid Break (mins)", "Hours Worked", "Description", "Total Hours"));
    }

    // Group days into weeks
    const weekMap = new Map();
    for (const d of days) {
      const wk = weekStart(d.date);
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk).push(d);
    }

    let grandMins = 0, grandEarned = 0;

    for (const [wkStr, wkDays] of weekMap) {
      const wkLabel = weekRangeLabel(wkStr);
      let weekMins = 0, weekEarned = 0;
      for (const { dayEntries } of wkDays) {
        for (const e of dayEntries) {
          weekMins += e.minutes;
          weekEarned += hasRate ? (e.minutes / 60) * hourlyRate : 0;
        }
      }

      // Week section header — totals in the trailing columns
      if (hasRate) {
        rows.push(row(wkLabel, "", "", "", "", "", "", formatMoney(weekEarned), formatDuration(weekMins)));
      } else {
        rows.push(row(wkLabel, "", "", "", "", "", formatDuration(weekMins)));
      }

      for (const { date, dayEntries } of wkDays) {
        const dayMins = dayEntries.reduce((a, e) => a + e.minutes, 0);
        const dayEarned = hasRate ? (dayMins / 60) * hourlyRate : 0;
        const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        });

        // Day sub-header — totals in the trailing columns
        if (hasRate) {
          rows.push(row(dayLabel, "", "", "", "", "", "", formatMoney(dayEarned), formatDuration(dayMins)));
        } else {
          rows.push(row(dayLabel, "", "", "", "", formatDuration(dayMins)));
        }

        // Entry rows — fill entry columns, leave trailing total columns blank
        for (const e of dayEntries) {
          const bm = unpaidBreakMins(e);
          const earned = hasRate ? (e.minutes / 60) * hourlyRate : null;
          if (hasRate) {
            rows.push(row("", toDisplayTime(e.start), toDisplayTime(e.end), bm > 0 ? bm : "", formatMoney(earned), formatDuration(e.minutes), e.description || "", "", ""));
          } else {
            rows.push(row("", toDisplayTime(e.start), toDisplayTime(e.end), bm > 0 ? bm : "", formatDuration(e.minutes), e.description || "", ""));
          }
        }

        grandMins += dayMins;
        grandEarned += dayEarned;
      }
      rows.push("");
    }

    // Grand total row — totals in the trailing columns
    if (hasRate) {
      rows.push(row("TOTAL", "", "", "", "", "", "", formatMoney(grandEarned), formatDuration(grandMins)));
    } else {
      rows.push(row("TOTAL", "", "", "", "", formatDuration(grandMins)));
    }

    return rows;
  }

  function downloadCSV(rows, filename) {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" })),
      download: filename,
    });
    a.click();
  }

  function exportAllCSV() {
    const byDate = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    const days = Object.keys(byDate).sort().map((date) => ({ date, dayEntries: byDate[date] }));
    const rows = buildCSVRows(days, null);
    const name = settings.name ? `${settings.name.toLowerCase().replace(/\s+/g, "_")}_` : "";
    downloadCSV(rows, `${name}work_hours_all.csv`);
    flash("✓ All data exported");
  }

  function exportMonthCSV(monthKey, weeks) {
    const days = [...weeks]
      .flatMap((w) => w.days)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, entries: dayEntries }) => ({ date, dayEntries }));
    const rows = buildCSVRows(days, formatMonthLabel(monthKey));
    const name = settings.name ? `${settings.name.toLowerCase().replace(/\s+/g, "_")}_` : "";
    downloadCSV(rows, `${name}${monthKey}.csv`);
    flash(`✓ ${formatMonthLabel(monthKey)} exported`);
  }

  async function buildXLSX(days, label) {
    const { default: ExcelJS } = await import("exceljs");
    const hasRate = hourlyRate > 0;

    // Colours
    const NAVY   = "FF1F3864";
    const BLUE   = "FF4472C4";
    const WHITE  = "FFFFFFFF";
    const LIGHT  = "FFF0F4FA";

    const navyFill  = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    const blueFill  = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    const lightFill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    const whiteFont = { color: { argb: WHITE }, bold: true, name: "Calibri", size: 11 };
    const boldFont  = { bold: true, name: "Calibri", size: 11 };
    const baseFont  = { name: "Calibri", size: 11 };
    const thinBorder = { style: "thin", color: { argb: "FFD0D7E3" } };
    const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    const styleAll = (row, style) =>
      row.eachCell({ includeEmpty: true }, (cell) => Object.assign(cell, { style }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Timesheet");

    // Column widths
    const cols = hasRate
      ? [20, 12, 12, 22, 16, 16, 16, 16, 38]
      : [20, 12, 12, 22, 16, 16, 38];
    ws.columns = cols.map((width) => ({ width }));
    const numCols = cols.length;

    const merge = (row) => ws.mergeCells(row.number, 1, row.number, numCols);

    // ── Title row ──────────────────────────────────────────────
    const titleText = settings.name
      ? `${settings.name}'s Timesheet${label ? ` – ${label}` : ""}`
      : `Timesheet${label ? ` – ${label}` : ""}`;
    const titleRow = ws.addRow([titleText]);
    merge(titleRow);
    titleRow.height = 24;
    titleRow.getCell(1).style = {
      font: { bold: true, size: 14, name: "Calibri" },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    // ── Info rows (blue bg) ────────────────────────────────────
    const addInfo = (lbl, val) => {
      const r = ws.addRow([lbl, val || ""]);
      r.height = 18;
      styleAll(r, { fill: blueFill, font: whiteFont, border: cellBorder });
    };
    if (settings.name) addInfo("Name:", settings.name);
    if (label)         addInfo("Period:", label);
    if (hasRate)       addInfo("Hourly Rate:", `$${hourlyRate.toFixed(2)}`);

    ws.addRow([]).height = 6;

    // ── Column headers (navy bg) ───────────────────────────────
    const headerLabels = hasRate
      ? ["Date", "Start", "End", "Unpaid Break (mins)", "Income Earned", "Hours Worked", "Total Income", "Total Hours", "Description"]
      : ["Date", "Start", "End", "Unpaid Break (mins)", "Hours Worked", "Total Hours", "Description"];
    const hdrRow = ws.addRow(headerLabels);
    hdrRow.height = 20;
    styleAll(hdrRow, { fill: navyFill, font: whiteFont, border: cellBorder, alignment: { vertical: "middle" } });

    // ── Group days into weeks ──────────────────────────────────
    const weekMap = new Map();
    for (const d of days) {
      const wk = weekStart(d.date);
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk).push(d);
    }

    let grandMins = 0, grandEarned = 0;

    for (const [wkStr, wkDays] of weekMap) {
      const wkLabel = weekRangeLabel(wkStr);
      let weekMins = 0, weekEarned = 0;
      for (const { dayEntries } of wkDays) {
        for (const e of dayEntries) {
          weekMins += e.minutes;
          weekEarned += hasRate ? (e.minutes / 60) * hourlyRate : 0;
        }
      }

      // Week header row (navy)
      const wkCells = hasRate
        ? [wkLabel, "", "", "", "", "", formatMoney(weekEarned), formatDuration(weekMins), ""]
        : [wkLabel, "", "", "", "", formatDuration(weekMins), ""];
      const wkRow = ws.addRow(wkCells);
      wkRow.height = 22;
      styleAll(wkRow, { fill: navyFill, font: whiteFont, border: cellBorder, alignment: { vertical: "middle" } });

      for (const { date, dayEntries } of wkDays) {
        const dayMins = dayEntries.reduce((a, e) => a + e.minutes, 0);
        const dayEarned = hasRate ? (dayMins / 60) * hourlyRate : 0;
        const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        });

        // Day sub-header row (light fill, bold)
        const dayCells = hasRate
          ? [dayLabel, "", "", "", "", "", formatMoney(dayEarned), formatDuration(dayMins), ""]
          : [dayLabel, "", "", "", "", formatDuration(dayMins), ""];
        const dayRow = ws.addRow(dayCells);
        dayRow.height = 18;
        styleAll(dayRow, { fill: lightFill, font: boldFont, border: cellBorder, alignment: { vertical: "middle" } });

        // Entry rows
        for (const e of dayEntries) {
          const bm = unpaidBreakMins(e);
          const earned = hasRate ? (e.minutes / 60) * hourlyRate : null;
          const entryCells = hasRate
            ? ["", toDisplayTime(e.start), toDisplayTime(e.end), bm > 0 ? bm : "", formatMoney(earned), formatDuration(e.minutes), "", "", e.description || ""]
            : ["", toDisplayTime(e.start), toDisplayTime(e.end), bm > 0 ? bm : "", formatDuration(e.minutes), "", e.description || ""];
          const entryRow = ws.addRow(entryCells);
          entryRow.height = 16;
          styleAll(entryRow, { font: baseFont, border: cellBorder, alignment: { vertical: "middle" } });
        }

        grandMins += dayMins;
        grandEarned += dayEarned;
      }
      ws.addRow([]).height = 8; // spacer between weeks
    }

    // ── Grand total row ────────────────────────────────────────
    const totalCells = hasRate
      ? ["TOTAL", "", "", "", "", "", formatMoney(grandEarned), formatDuration(grandMins), ""]
      : ["TOTAL", "", "", "", "", formatDuration(grandMins), ""];
    const totalRow = ws.addRow(totalCells);
    totalRow.height = 20;
    styleAll(totalRow, { font: boldFont, border: cellBorder, alignment: { vertical: "middle" } });

    return wb.xlsx.writeBuffer();
  }

  async function exportMonthXLSX(monthKey, weeks) {
    const days = [...weeks]
      .flatMap((w) => w.days)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, entries: dayEntries }) => ({ date, dayEntries }));
    const buffer = await buildXLSX(days, formatMonthLabel(monthKey));
    const name = settings.name ? `${settings.name.toLowerCase().replace(/\s+/g, "_")}_` : "";
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${name}${monthKey}.xlsx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    flash(`✓ ${formatMonthLabel(monthKey)} exported`);
  }

  async function exportAllXLSX() {
    const byDate = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    const days = Object.keys(byDate).sort().map((date) => ({ date, dayEntries: byDate[date] }));
    const buffer = await buildXLSX(days, null);
    const name = settings.name ? `${settings.name.toLowerCase().replace(/\s+/g, "_")}_` : "";
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${name}work_hours_all.xlsx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    flash("✓ All data exported");
  }

  // ── localStorage migration ───────────────────────────────────
  async function importFromLocalStorage() {
    try {
      const oldEntries = JSON.parse(localStorage.getItem("worklog_entries_v2") || "[]");
      const oldTemplates = JSON.parse(localStorage.getItem("worklog_templates_v1") || "[]");
      const oldSettings = JSON.parse(localStorage.getItem("worklog_settings_v1") || "{}");
      const oldRate = parseFloat(localStorage.getItem("worklog_hourly_rate") || "0") || 0;
      const oldKey = localStorage.getItem("worklog_deepseek_key") || "";

      if (oldEntries.length > 0) {
        const rows = oldEntries.map((e) => ({
          user_id: session.user.id,
          date: e.date,
          start: e.start || null,
          end_time: e.end || null,
          description: e.description || "",
          minutes: e.minutes || 0,
          breaks: e.breaks || [],
        }));
        const { data: inserted } = await supabase.from("entries").insert(rows).select();
        if (inserted) setEntries((prev) => [...(inserted.map(normalizeEntry)), ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      }

      if (oldTemplates.length > 0) {
        const rows = oldTemplates.map((t) => ({
          user_id: session.user.id,
          name: t.name,
          start: t.start || null,
          end_time: t.end || null,
          breaks: t.breaks || [],
        }));
        const { data: savedTmpl } = await supabase.from("templates").insert(rows).select();
        if (savedTmpl) setTemplates((prev) => [...prev, ...savedTmpl.map(normalizeTemplate)]);
      }

      await supabase.from("user_settings").upsert({
        user_id: session.user.id,
        name: oldSettings.name || null,
        default_start: oldSettings.defaultStart || null,
        default_end: oldSettings.defaultEnd || null,
        hourly_rate: oldRate,
        deepseek_key: oldKey,
        updated_at: new Date().toISOString(),
      });

      // Clear old keys
      ["worklog_entries_v2", "worklog_templates_v1", "worklog_settings_v1", "worklog_hourly_rate", "worklog_deepseek_key"].forEach((k) => localStorage.removeItem(k));
      setLocalImportBanner(null);
      flash(`✓ Imported ${oldEntries.length} ${oldEntries.length === 1 ? "entry" : "entries"} from local storage`);
    } catch (e) {
      flash("✗ Import failed");
    }
  }

  // ── Import entries from JSON file ────────────────────────────
  async function importEntriesFromFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(arr) || arr.length === 0) { flash("✗ No entries found in file"); return; }
      const rows = arr.map((e) => ({
        user_id: session.user.id,
        date: e.date,
        start: e.start || null,
        end_time: e.end || e.end_time || null,
        description: e.description || "",
        minutes: typeof e.minutes === "number" ? e.minutes : calcWorked(e.start, e.end || e.end_time, e.breaks),
        breaks: e.breaks || [],
      })).filter((e) => e.date && (e.start || e.minutes > 0));
      const { data: inserted, error } = await supabase.from("entries").insert(rows).select();
      if (error) { flash("✗ Import failed"); return; }
      setEntries((prev) => [...(inserted ?? []).map(normalizeEntry), ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      flash(`✓ Imported ${inserted?.length ?? 0} ${inserted?.length === 1 ? "entry" : "entries"}`);
    } catch {
      flash("✗ Invalid file format");
    }
  }

  // ── Export / import profile (templates + settings) ───────────
  function exportProfile() {
    const profile = {
      version: 1,
      type: "questlogger-profile",
      settings: {
        name: settings.name || "",
        defaultStart: settings.defaultStart || "",
        defaultEnd: settings.defaultEnd || "",
        hourlyRate,
      },
      templates: templates.map(({ name, start, end, breaks }) => ({ name, start, end, breaks })),
    };
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "questlogger-profile.json" });
    a.click();
    flash("✓ Profile exported");
  }

  function importProfileFromFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const profile = JSON.parse(ev.target.result);
        if (profile.type !== "questlogger-profile") { flash("✗ Not a QuestLogger profile file"); return; }
        if (profile.settings) {
          setDraftSettings((d) => ({
            ...d,
            name: profile.settings.name || d.name,
            defaultStart: profile.settings.defaultStart || d.defaultStart,
            defaultEnd: profile.settings.defaultEnd || d.defaultEnd,
            hourlyRate: profile.settings.hourlyRate ?? d.hourlyRate,
          }));
        }
        if (Array.isArray(profile.templates) && profile.templates.length > 0) {
          const imported = profile.templates.map((t) => ({
            id: Date.now() + Math.random(),
            name: t.name,
            start: t.start || "",
            end: t.end || "",
            breaks: t.breaks || [],
          }));
          setDraftTemplates((prev) => [...prev, ...imported]);
        }
        flash(`✓ Profile loaded — review and hit Save`);
      } catch {
        flash("✗ Invalid profile file");
      }
    };
    reader.readAsText(file);
  }

  if (authLoading) return (
    <div style={{ fontFamily: "'Figtree', sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&display=swap');`}</style>
      <span style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</span>
    </div>
  );
  if (!session) return <AuthPage />;

  return (
    <div style={{ fontFamily: "'Figtree', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Parkinsans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .entry-row:hover { background: #f0fdf9; }
        .entry-row:hover .delete-btn { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Top nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0d9488, #14b8a6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16 }}>🕐</span>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1, fontFamily: "'Parkinsans', sans-serif" }}>
                {settings.name ? `${settings.name}'s WorkLog` : "WorkLog"}
              </p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                {todayMins > 0 ? `Today · ${formatDuration(todayMins)}` : "No hours logged today"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {exportMsg && (
              <span style={{ fontSize: 12, color: "#0d9488", fontFamily: "'DM Mono', monospace" }}>{exportMsg}</span>
            )}
            <Button size="sm" onClick={openSettings} className="h-8 text-xs font-semibold" style={{ background: "#0d9488", color: "#fff" }}>
              Settings
            </Button>
            <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()} className="h-8 text-xs text-slate-400 hover:text-slate-600">
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* localStorage migration banner */}
        {localImportBanner && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: 0 }}>Local data found</p>
              <p style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>{localImportBanner.count} {localImportBanner.count === 1 ? "entry" : "entries"} saved in this browser before you created an account.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setLocalImportBanner(null)} style={{ fontSize: 12, color: "#92400e", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", opacity: 0.7 }}>Dismiss</button>
              <button onClick={importFromLocalStorage} style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#d97706", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px 14px" }}>Import to account</button>
            </div>
          </div>
        )}

        {/* Earnings */}
        <Card className="bg-white border-slate-200 shadow-sm mb-8">
          <CardHeader className="px-6 pt-6 pb-2">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <CardTitle style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", fontFamily: "'Parkinsans', sans-serif" }}>
                Earnings
              </CardTitle>
              <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
                {["week", "month"].map((p) => (
                  <button key={p} onClick={() => setEarningsPeriod(p)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Parkinsans', sans-serif", background: earningsPeriod === p ? "#fff" : "transparent", color: earningsPeriod === p ? "#0d9488" : "#94a3b8", boxShadow: earningsPeriod === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                    {p === "week" ? "This Week" : "This Month"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-3">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "linear-gradient(135deg, #f0fdfa, #e6fffa)", border: "1px solid #99f6e4", borderRadius: 12, padding: "16px 18px", gridColumn: "span 2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    {earningsPeriod === "week" ? "This Week" : "This Month"}
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#0d9488", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                    {hourlyRate > 0 ? formatMoney(earningsData.periodEarnings) : "—"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Hours worked</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#334155", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                    {formatDecimal(earningsData.periodMins)}<span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>hrs</span>
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{formatDuration(earningsData.periodMins)}</p>
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg / Week</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{hourlyRate > 0 ? formatMoney(earningsData.avgWeekEarnings) : "—"}</p>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{formatDecimal(earningsData.avgWeekMins)} hrs avg</p>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg / Month</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{hourlyRate > 0 ? formatMoney(earningsData.avgMonthEarnings) : "—"}</p>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{formatDecimal(earningsData.avgMonthMins)} hrs avg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Hours form */}
        <Card className="bg-white border-slate-200 shadow-sm mb-8">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", fontFamily: "'Parkinsans', sans-serif" }}>
              Log Hours
            </CardTitle>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Record your work session for the day.</p>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">

            {/* Template picker */}
            {templates.length > 0 && (
              <FieldRow label="Template" hint="Apply saved defaults">
                <div className="flex items-center gap-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{
                        background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20,
                        padding: "4px 14px", fontSize: 12, fontWeight: 500, color: "#0d9488",
                        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#ccfbf1"; e.currentTarget.style.borderColor = "#2dd4bf"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdfa"; e.currentTarget.style.borderColor = "#99f6e4"; }}
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
                  position: "relative", background: form.date ? "#f0fdfa" : "#f8fafc",
                  border: `1px solid ${form.date ? "#99f6e4" : "#e2e8f0"}`, borderRadius: 10,
                  padding: "10px 16px", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2dd4bf")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = form.date ? "#99f6e4" : "#e2e8f0")}
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", pointerEvents: "none" }}
                />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={form.date ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: "relative", zIndex: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {form.date ? (
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.2, margin: 0 }}>
                      {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                      {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, position: "relative", zIndex: 0 }}>Select a date</p>
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
                  className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 resize-none text-sm shadow-sm"
                />
                {deepseekKey && form.description.trim() && (
                  <button
                    onClick={rewriteDescription}
                    disabled={rewritingDesc}
                    style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: rewritingDesc ? "#f0fdfa" : "#fff",
                      border: "1px solid #99f6e4", borderRadius: 6,
                      padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      color: "#0d9488", cursor: rewritingDesc ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!rewritingDesc) e.currentTarget.style.background = "#f0fdfa"; }}
                    onMouseLeave={(e) => { if (!rewritingDesc) e.currentTarget.style.background = "#fff"; }}
                  >
                    {rewritingDesc ? (
                      <>
                        <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #99f6e4", borderTopColor: "#0d9488", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        Rewriting…
                      </>
                    ) : "✦ Rewrite"}
                  </button>
                )}
              </div>
            </FieldRow>

            <FieldRow label="Breaks" hint="Unpaid breaks are deducted">
              <div className="space-y-2">
                {form.breaks.length === 0 && (
                  <p style={{ fontSize: 13, color: "#cbd5e1", fontStyle: "italic" }}>No breaks added.</p>
                )}
                {form.breaks.map((b) => (
                  <div key={b.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>From</p>
                        <TimeSelect value={b.start} onChange={(v) => updateBreak(b.id, { start: v })} />
                      </div>
                      <div style={{ paddingTop: 18, color: "#cbd5e1" }}>→</div>
                      <div>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>To</p>
                        <TimeSelect value={b.end} onChange={(v) => updateBreak(b.id, { end: v })} />
                      </div>
                      <button onClick={() => removeBreak(b.id)} style={{ marginLeft: "auto", paddingTop: 18, background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, lineHeight: 1 }} className="hover:text-red-400">✕</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Checkbox id={`u-${b.id}`} checked={b.unpaid} onCheckedChange={(v) => updateBreak(b.id, { unpaid: !!v })} className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 h-4 w-4" />
                      <Label htmlFor={`u-${b.id}`} className="text-sm text-slate-500 cursor-pointer select-none">
                        Unpaid break <span style={{ color: "#94a3b8", fontSize: 12 }}>(deducted from hours)</span>
                      </Label>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addBreak} className="h-8 text-xs border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 mt-1">
                  + Add break
                </Button>
              </div>
            </FieldRow>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                {form.start && form.end ? (
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>
                    <span style={{ fontSize: 20, fontWeight: 600, color: "#0d9488" }}>{formatDuration(previewMins)}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>{formatDecimal(previewMins)} hrs</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#cbd5e1" }}>Select times to see hours</p>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={!form.date || !form.start || !form.end} className="h-9 px-5 text-sm font-semibold disabled:opacity-40" style={{ background: "#0d9488", color: "#fff" }}>
                Log Hours
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log */}
        {grouped.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
            <button onClick={() => setSortAsc((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 500, color: "#64748b", cursor: "pointer" }}>
              {sortAsc ? "↑ Oldest first" : "↓ Newest first"}
            </button>
          </div>
        )}
        {grouped.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 64, paddingBottom: 64 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗓</div>
            <p style={{ fontSize: 14, color: "#cbd5e1" }}>No entries yet. Start logging your hours above.</p>
          </div>
        ) : (
          grouped.map(({ monthKey, weeks }) => {
            const monthMins = weeks.flatMap((w) => w.days).flatMap((d) => d.entries).reduce((a, e) => a + e.minutes, 0);
            return (
              <div key={monthKey} style={{ marginBottom: 28 }}>
                {/* Month header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: monthSummaries[monthKey]?.text ? 8 : 14, padding: "0 2px" }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>
                    {formatMonthLabel(monthKey)}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {hourlyRate > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
                        {formatMoney((monthMins / 60) * hourlyRate)}
                      </span>
                    )}
                    <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20, padding: "3px 12px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#0d9488", fontWeight: 600 }}>
                      {formatDuration(monthMins)}
                    </div>
                    {deepseekKey && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMonthSummary(monthKey, weeks)}
                        disabled={monthSummaries[monthKey]?.loading}
                        className="h-7 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      >
                        {monthSummaries[monthKey]?.loading ? "Summarising…" : "✦ Summarise"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportMonthXLSX(monthKey, weeks)}
                      className="h-7 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    >
                      Export XLSX
                    </Button>
                  </div>
                </div>

                {/* AI month summary */}
                {monthSummaries[monthKey]?.text && (
                  <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <p style={{ fontSize: 13, color: "#134e4a", lineHeight: 1.6, margin: 0, flex: 1 }}>
                      {monthSummaries[monthKey].text}
                    </p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(monthSummaries[monthKey].text); flash("✓ Copied"); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#5eead4", fontSize: 12, flexShrink: 0, padding: "2px 4px" }}
                      className="hover:text-teal-700"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setMonthSummaries((s) => { const n = { ...s }; delete n[monthKey]; return n; })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#99f6e4", fontSize: 14, flexShrink: 0, lineHeight: 1 }}
                      className="hover:text-teal-600"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Weeks */}
                {weeks.map(({ weekKey, days }) => {
                  const weekMins = days.flatMap((d) => d.entries).reduce((a, e) => a + e.minutes, 0);
                  return (
                    <div key={weekKey} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "0 2px" }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                          {weekRangeLabel(weekKey)}
                        </p>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{formatDuration(weekMins)}</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {days.map(({ date, entries: dayEntries }) => {
                          const dayTotal = dayEntries.reduce((a, e) => a + e.minutes, 0);
                          return (
                            <Card key={date} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                              <div onClick={() => toggleExpanded(date, dayEntries)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#f8fafc", borderBottom: expandedDates.has(date) ? "1px solid #f1f5f9" : "none", cursor: "pointer", userSelect: "none" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "'Parkinsans', sans-serif" }}>{formatDateLabel(date)}</p>
                                </div>
                                <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}</span>
                                {hourlyRate > 0 && (
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                                    {formatMoney((dayTotal / 60) * hourlyRate)}
                                  </span>
                                )}
                                <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20, padding: "2px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#0d9488", fontWeight: 600, whiteSpace: "nowrap" }}>
                                  {formatDuration(dayTotal)}
                                </div>
                                {expandedDates.has(date) ? <ChevronUp size={14} color="#94a3b8" style={{ flexShrink: 0 }} /> : <ChevronDown size={14} color="#94a3b8" style={{ flexShrink: 0 }} />}
                              </div>

                              {expandedDates.has(date) && dayEntries.map((entry, i) => {
                                const isEditing = inlineEditId === entry.id;

                                if (isEditing && inlineForm) {
                                  const inlinePreviewMins = calcWorked(inlineForm.start, inlineForm.end, inlineForm.breaks);
                                  return (
                                    <div key={entry.id} style={{ padding: "16px 18px", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", background: "#fafffe" }}>
                                      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                                        <div>
                                          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>Date</p>
                                          <input type="date" value={inlineForm.date} onChange={(e) => setInlineField("date", e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" }} onFocus={(e) => (e.target.style.borderColor = "#2dd4bf")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
                                        </div>
                                        <div>
                                          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>Start</p>
                                          <TimeSelect value={inlineForm.start} onChange={(v) => setInlineField("start", v)} />
                                        </div>
                                        <div>
                                          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>End</p>
                                          <TimeSelect value={inlineForm.end} onChange={(v) => setInlineField("end", v)} />
                                        </div>
                                      </div>
                                      <div style={{ marginBottom: 10 }}>
                                        <Textarea value={inlineForm.description} onChange={(e) => setInlineField("description", e.target.value)} placeholder="Description…" rows={2} className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 resize-none text-sm shadow-sm" />
                                      </div>
                                      <div style={{ marginBottom: 12 }}>
                                        {inlineForm.breaks.map((b) => (
                                          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 11, color: "#94a3b8" }}>From</span>
                                            <TimeSelect value={b.start} onChange={(v) => updateInlineBreak(b.id, { start: v })} />
                                            <span style={{ fontSize: 11, color: "#cbd5e1" }}>→</span>
                                            <TimeSelect value={b.end} onChange={(v) => updateInlineBreak(b.id, { end: v })} />
                                            <Checkbox id={`ib-${b.id}`} checked={b.unpaid} onCheckedChange={(v) => updateInlineBreak(b.id, { unpaid: !!v })} className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 h-4 w-4" />
                                            <Label htmlFor={`ib-${b.id}`} className="text-xs text-slate-500 cursor-pointer select-none">Unpaid</Label>
                                            <button onClick={() => removeInlineBreak(b.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 14, lineHeight: 1 }} className="hover:text-red-400">✕</button>
                                          </div>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={addInlineBreak} className="h-7 text-xs border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50">+ Add break</Button>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ fontFamily: "'DM Mono', monospace" }}>
                                          {inlineForm.start && inlineForm.end && (
                                            <>
                                              <span style={{ fontSize: 16, fontWeight: 600, color: "#0d9488" }}>{formatDuration(inlinePreviewMins)}</span>
                                              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{formatDecimal(inlinePreviewMins)} hrs</span>
                                            </>
                                          )}
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <Button variant="ghost" size="sm" onClick={cancelInlineEdit} className="h-8 px-3 text-sm text-slate-500 hover:text-slate-700">Cancel</Button>
                                          <Button size="sm" onClick={saveInlineEdit} disabled={!inlineForm.date || !inlineForm.start || !inlineForm.end} className="h-8 px-4 text-sm font-semibold disabled:opacity-40" style={{ background: "#0d9488", color: "#fff" }}>Save</Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                const bm = unpaidBreakMins(entry);
                                return (
                                  <div key={entry.id} className="entry-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}>
                                    <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", width: 140, flexShrink: 0 }}>
                                      {toDisplayTime(entry.start)} – {toDisplayTime(entry.end)}
                                    </span>
                                    <span style={{ flex: 1, fontSize: 13, color: entry.description ? "#334155" : "#cbd5e1", fontStyle: entry.description ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {entry.description || "No description"}
                                    </span>
                                    {bm > 0 && (
                                      <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                                        −{formatDuration(bm)}
                                      </span>
                                    )}
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", width: 52, textAlign: "right", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                                      {formatDuration(entry.minutes)}
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => startInlineEdit(entry)} className="h-7 px-2 text-xs text-slate-400 hover:text-teal-700 hover:bg-teal-50 shrink-0">Edit</Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} className="delete-btn h-7 w-7 p-0 text-slate-300 hover:text-red-400 hover:bg-red-50 shrink-0" style={{ opacity: 0, transition: "opacity 0.15s" }}>✕</Button>
                                  </div>
                                );
                              })}
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
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Parkinsans', sans-serif", margin: 0 }}>Settings</p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Saved to your account.</p>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, lineHeight: 1, padding: "4px 6px", borderRadius: 6 }} className="hover:text-slate-600">✕</button>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ overflowY: "auto", padding: "8px 24px 4px", flex: 1 }}>

              {/* Profile */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 12, marginBottom: 0 }}>Profile</p>
              <FieldRow label="Your name" hint="Shown in title & exports">
                <Input
                  value={draftSettings.name || ""}
                  onChange={(e) => setDraftSettings((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Alex Smith"
                  className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-10 max-w-xs"
                />
              </FieldRow>
              <FieldRow label="Hourly rate" hint="Used to calculate earnings">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, color: "#64748b" }}>$</span>
                  <Input type="number" min="0" step="0.01" value={draftSettings.hourlyRate ?? ""} onChange={(e) => setDraftSettings((d) => ({ ...d, hourlyRate: e.target.value }))} placeholder="0.00" className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-10 w-28" />
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>/hr</span>
                </div>
              </FieldRow>

              {/* Notifications */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 20, marginBottom: 0 }}>Notifications</p>
              <FieldRow label="Daily reminder" hint="Notifies you if no hours logged by this time">
                <div className="flex items-center gap-3">
                  <TimeSelect
                    value={draftSettings._reminderTime || ""}
                    onChange={(v) => setDraftSettings((d) => ({ ...d, _reminderTime: v }))}
                  />
                  {draftSettings._reminderTime && (
                    <button onClick={() => setDraftSettings((d) => ({ ...d, _reminderTime: "" }))} style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }} className="hover:text-red-400">Clear</button>
                  )}
                  {"Notification" in window && Notification.permission !== "granted" && (
                    <button
                      onClick={() => Notification.requestPermission()}
                      style={{ fontSize: 12, color: "#0d9488", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 6, cursor: "pointer", padding: "4px 10px", fontWeight: 500 }}
                    >
                      Allow notifications
                    </button>
                  )}
                  {"Notification" in window && Notification.permission === "granted" && (
                    <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Allowed</span>
                  )}
                </div>
              </FieldRow>

              {/* AI */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 20, marginBottom: 0 }}>AI</p>
              <FieldRow label="DeepSeek API key" hint="Enables description rewriter & month summaries">
                <Input
                  type="password"
                  value={draftSettings._deepseekKey ?? ""}
                  onChange={(e) => setDraftSettings((d) => ({ ...d, _deepseekKey: e.target.value }))}
                  placeholder="sk-…"
                  className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-10 max-w-xs font-mono"
                />
              </FieldRow>

              {/* Defaults */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 20, marginBottom: 0 }}>Defaults for new entries</p>
              <FieldRow label="Default template" hint={draftSettings.defaultTemplateId ? "Overrides start & end times" : "Optional — takes priority over times"}>
                <Select
                  value={draftSettings.defaultTemplateId ? String(draftSettings.defaultTemplateId) : "__none__"}
                  onValueChange={(v) => setDraftSettings((d) => ({ ...d, defaultTemplateId: v === "__none__" ? undefined : v }))}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-700 hover:border-slate-300 h-10 text-sm shadow-sm w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-700">
                    <SelectItem value="__none__" className="focus:bg-teal-50 focus:text-teal-800">None</SelectItem>
                    {draftTemplates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="focus:bg-teal-50 focus:text-teal-800">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              {!draftSettings.defaultTemplateId && (
                <>
                  <FieldRow label="Default start" hint="Pre-fills start time">
                    <TimeSelect value={draftSettings.defaultStart || ""} onChange={(v) => setDraftSettings((d) => ({ ...d, defaultStart: v }))} />
                  </FieldRow>
                  <FieldRow label="Default end" hint="Pre-fills end time">
                    <TimeSelect value={draftSettings.defaultEnd || ""} onChange={(v) => setDraftSettings((d) => ({ ...d, defaultEnd: v }))} />
                  </FieldRow>
                </>
              )}

              {/* Templates */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Templates</p>
                {!draftNewTemplate && draftEditingId === null && (
                  <button onClick={startDraftNew} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#0d9488", fontWeight: 600, padding: "2px 0" }}>+ New template</button>
                )}
              </div>

              {draftTemplates.length === 0 && !draftNewTemplate && (
                <p style={{ fontSize: 13, color: "#cbd5e1", fontStyle: "italic", marginTop: 8, paddingBottom: 8 }}>No templates yet.</p>
              )}

              {draftTemplates.map((t) => {
                if (draftEditingId === t.id && draftEditingTemplate) {
                  return (
                    <TemplateEditor
                      key={t.id}
                      value={draftEditingTemplate}
                      onChange={(patch) => setDraftEditingTemplate((d) => ({ ...d, ...patch }))}
                      onAddBreak={() => setDraftEditingTemplate((d) => ({ ...d, breaks: [...(d.breaks || []), { id: Date.now(), start: "", end: "", unpaid: true }] }))}
                      onChangeBreak={(bid, patch) => setDraftEditingTemplate((d) => ({ ...d, breaks: d.breaks.map((b) => b.id === bid ? { ...b, ...patch } : b) }))}
                      onRemoveBreak={(bid) => setDraftEditingTemplate((d) => ({ ...d, breaks: d.breaks.filter((b) => b.id !== bid) }))}
                      onSave={commitDraftEdit}
                      onCancel={() => { setDraftEditingId(null); setDraftEditingTemplate(null); }}
                      saveLabel="Update template"
                    />
                  );
                }
                const breakCount = (t.breaks || []).length;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{t.name}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0", fontFamily: "'DM Mono', monospace" }}>
                        {toDisplayTime(t.start)} – {toDisplayTime(t.end)}
                        {breakCount > 0 && ` · ${breakCount} break${breakCount > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {draftSettings.defaultTemplateId === t.id && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#0d9488", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 20, padding: "2px 8px" }}>default</span>
                    )}
                    <button onClick={() => startDraftEdit(t)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#64748b", padding: "2px 4px" }} className="hover:text-slate-900">Edit</button>
                    <button onClick={() => deleteDraftTemplate(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#cbd5e1", padding: "2px 4px" }} className="hover:text-red-400">Delete</button>
                  </div>
                );
              })}

              {draftNewTemplate && (
                <TemplateEditor
                  value={draftNewTemplate}
                  onChange={(patch) => setDraftNewTemplate((d) => ({ ...d, ...patch }))}
                  onAddBreak={() => setDraftNewTemplate((d) => ({ ...d, breaks: [...(d.breaks || []), { id: Date.now(), start: "", end: "", unpaid: true }] }))}
                  onChangeBreak={(bid, patch) => setDraftNewTemplate((d) => ({ ...d, breaks: d.breaks.map((b) => b.id === bid ? { ...b, ...patch } : b) }))}
                  onRemoveBreak={(bid) => setDraftNewTemplate((d) => ({ ...d, breaks: d.breaks.filter((b) => b.id !== bid) }))}
                  onSave={commitDraftNew}
                  onCancel={() => setDraftNewTemplate(null)}
                  saveLabel="Add template"
                />
              )}

              {/* Data — export/import profile */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 20, marginBottom: 0 }}>Profile sharing</p>
              <FieldRow label="Export profile" hint="Templates + settings as JSON">
                <Button variant="outline" size="sm" onClick={exportProfile} className="h-8 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50">
                  Download profile.json
                </Button>
              </FieldRow>
              <FieldRow label="Import profile" hint="Merges templates into your current list">
                <Button variant="outline" size="sm" onClick={() => importProfileRef.current?.click()} className="h-8 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50">
                  Load profile.json…
                </Button>
              </FieldRow>

              <div style={{ height: 16 }} />
            </div>

            {/* Modal footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 18px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="outline" size="sm" onClick={exportAllXLSX} className="h-8 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50">
                  Export all as XLSX
                </Button>
                <Button variant="outline" size="sm" onClick={() => importEntriesRef.current?.click()} className="h-8 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50">
                  Import entries…
                </Button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="h-9 px-4 text-sm text-slate-500 hover:text-slate-700">Cancel</Button>
                <Button size="sm" onClick={saveSettings} className="h-9 px-5 text-sm font-semibold" style={{ background: "#0d9488", color: "#fff" }}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={importEntriesRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importEntriesFromFile(f); e.target.value = ""; }}
      />
      <input
        ref={importProfileRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importProfileFromFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
