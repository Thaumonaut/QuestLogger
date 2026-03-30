import { useState, useMemo } from "react";
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

const STORAGE_KEY = "worklog_entries_v2";
const SETTINGS_KEY = "worklog_settings_v1";

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
  let hour = "",
    minute = "",
    period = "AM";
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
      <Select
        value={hour}
        onValueChange={(v) => emit(v, minute || "00", period)}
      >
        <SelectTrigger className={`${triggerCls} w-16`}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {HOUR_OPTIONS.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="focus:bg-teal-50 focus:text-teal-800"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-slate-400 font-semibold text-base select-none">
        :
      </span>
      <Select
        value={minute}
        onValueChange={(v) => emit(hour || "12", v, period)}
      >
        <SelectTrigger className={`${triggerCls} w-16`}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {MINUTE_OPTIONS.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="focus:bg-teal-50 focus:text-teal-800"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(v) => emit(hour || "12", minute || "00", v)}
      >
        <SelectTrigger className={`${triggerCls} w-20`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-700">
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="focus:bg-teal-50 focus:text-teal-800"
            >
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
  const s = parseTime(start),
    e = parseTime(end);
  if (s === null || e === null || e <= s) return 0;
  const unpaidMins = (breaks || [])
    .filter((b) => b.unpaid)
    .reduce((acc, b) => {
      const bs = parseTime(b.start),
        be = parseTime(b.end);
      return bs !== null && be !== null && be > bs ? acc + (be - bs) : acc;
    }, 0);
  return Math.max(0, e - s - unpaidMins);
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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toDisplayTime(val) {
  if (!val) return "—";
  const [h, m] = val.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// Returns Monday of the week containing dateStr as "YYYY-MM-DD"
function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function makeEmptyForm(s = {}) {
  return {
    date: todayStr(),
    start: s.defaultStart || "",
    end: s.defaultEnd || "",
    description: "",
    breaks: [],
  };
}

// Reusable field row: label on left, children on right
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

export default function App() {
  const [entries, setEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [form, setForm] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return makeEmptyForm(s);
    } catch {
      return makeEmptyForm();
    }
  });
  const [editId, setEditId] = useState(null);
  const [exportMsg, setExportMsg] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  function persist(updated) {
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function persistSettings(updated) {
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  function setSetting(key, val) {
    persistSettings({ ...settings, [key]: val });
  }

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addBreak() {
    setForm((f) => ({
      ...f,
      breaks: [
        ...f.breaks,
        { id: Date.now(), start: "", end: "", unpaid: true },
      ],
    }));
  }
  function updateBreak(id, patch) {
    setForm((f) => ({
      ...f,
      breaks: f.breaks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }
  function removeBreak(id) {
    setForm((f) => ({ ...f, breaks: f.breaks.filter((b) => b.id !== id) }));
  }

  function handleSubmit() {
    if (!form.date || !form.start || !form.end) return;
    const minutes = calcWorked(form.start, form.end, form.breaks);
    if (editId) {
      persist(
        entries.map((e) =>
          e.id === editId ? { ...form, id: editId, minutes } : e,
        ),
      );
      setEditId(null);
    } else {
      persist([...entries, { ...form, id: Date.now(), minutes }]);
    }
    setForm(makeEmptyForm(settings));
  }

  function handleEdit(entry) {
    setEditId(entry.id);
    setForm({
      date: entry.date,
      start: entry.start,
      end: entry.end,
      description: entry.description,
      breaks: entry.breaks || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    persist(entries.filter((e) => e.id !== id));
  }

  const grouped = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const todayMins = useMemo(
    () =>
      entries
        .filter((e) => e.date === todayStr())
        .reduce((a, e) => a + e.minutes, 0),
    [entries],
  );

  const previewMins = calcWorked(form.start, form.end, form.breaks);

  function flash(msg) {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(""), 2500);
  }

  function exportCSV() {
    const hasRate = settings.hourlyRate > 0;
    const chronological = [...grouped].reverse();

    const headerCols = [
      "Date",
      "Start",
      "End",
      "Unpaid Break (mins)",
      "Hours Worked",
      "Description",
    ];
    if (hasRate) headerCols.push("Earnings");

    const rows = [];
    if (settings.name) rows.push(`Name:,${settings.name}`);
    if (hasRate)
      rows.push(`Hourly Rate:,$${parseFloat(settings.hourlyRate).toFixed(2)}`);
    if (rows.length) rows.push("");
    rows.push(headerCols.join(","));

    let currentWeek = null;
    let weekMins = 0;

    for (let gi = 0; gi < chronological.length; gi++) {
      const [date, dayEntries] = chronological[gi];
      const weekStart = getWeekStart(date);

      // Week break: emit previous week total when week changes
      if (currentWeek !== null && weekStart !== currentWeek) {
        const weekTotalCols = [
          `Week of ${currentWeek} — Total`,
          "",
          "",
          "",
          formatDecimal(weekMins),
        ];
        if (hasRate)
          weekTotalCols.push(
            `$${((weekMins / 60) * settings.hourlyRate).toFixed(2)}`,
          );
        rows.push(weekTotalCols.join(","));
        rows.push("");
        weekMins = 0;
      }
      currentWeek = weekStart;

      for (const e of dayEntries) {
        const bm = (e.breaks || [])
          .filter((b) => b.unpaid)
          .reduce((acc, b) => {
            const bs = parseTime(b.start),
              be = parseTime(b.end);
            return bs !== null && be !== null && be > bs
              ? acc + (be - bs)
              : acc;
          }, 0);
        const cols = [
          date,
          e.start,
          e.end,
          bm,
          formatDecimal(e.minutes),
          `"${(e.description || "").replace(/"/g, '""')}"`,
        ];
        if (hasRate)
          cols.push(`$${((e.minutes / 60) * settings.hourlyRate).toFixed(2)}`);
        rows.push(cols.join(","));
        weekMins += e.minutes;
      }

      const dayTotal = dayEntries.reduce((a, e) => a + e.minutes, 0);
      const dayTotalCols = [
        `${date} TOTAL`,
        "",
        "",
        "",
        formatDecimal(dayTotal),
      ];
      if (hasRate)
        dayTotalCols.push(
          `$${((dayTotal / 60) * settings.hourlyRate).toFixed(2)}`,
        );
      rows.push(dayTotalCols.join(","));
      rows.push("");
    }

    // Final week total
    if (currentWeek !== null) {
      const weekTotalCols = [
        `Week of ${currentWeek} — Total`,
        "",
        "",
        "",
        formatDecimal(weekMins),
      ];
      if (hasRate)
        weekTotalCols.push(
          `$${((weekMins / 60) * settings.hourlyRate).toFixed(2)}`,
        );
      rows.push(weekTotalCols.join(","));
    }

    const filename = settings.name
      ? `${settings.name.toLowerCase().replace(/\s+/g, "_")}_work_hours.csv`
      : "work_hours.csv";

    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(
        new Blob([rows.join("\n")], { type: "text/csv" }),
      ),
      download: filename,
    });
    a.click();
    flash("✓ CSV exported");
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Parkinsans:wght@300;400;500;600;700&family=Figtree:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .entry-row:hover { background: #f0fdf9; }
        .entry-row:hover .delete-btn { opacity: 1 !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
      `}</style>

      {/* Top nav */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 16 }}>🕐</span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  lineHeight: 1,
                }}
              >
                {settings.name ? `${settings.name}'s WorkLog` : "WorkLog"}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  marginTop: 2,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {todayMins > 0
                  ? `Today · ${formatDuration(todayMins)}`
                  : "No hours logged today"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {exportMsg && (
              <span
                style={{
                  fontSize: 12,
                  color: "#0d9488",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {exportMsg}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              className="h-8 text-xs border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSettings((v) => !v)}
              className="h-8 text-xs font-semibold"
              style={{
                background: showSettings ? "#0d9488" : "#0d9488",
                color: "#fff",
                opacity: showSettings ? 0.8 : 1,
              }}
            >
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 64px" }}
      >
        {/* Settings card */}
        {showSettings && (
          <Card className="bg-white border-slate-200 shadow-sm mb-6">
            <CardHeader className="px-6 pt-5 pb-2">
              <CardTitle
                style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}
              >
                Settings
              </CardTitle>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                Defaults and preferences saved in your browser.
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
              <FieldRow label="Your name" hint="Shown in exports">
                <Input
                  value={settings.name || ""}
                  onChange={(e) => setSetting("name", e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-10 max-w-xs"
                />
              </FieldRow>
              <FieldRow
                label="Hourly rate"
                hint="Used to calculate earnings in exports"
              >
                <div className="flex items-center gap-2 max-w-xs">
                  <span
                    style={{ fontSize: 14, color: "#64748b", flexShrink: 0 }}
                  >
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.hourlyRate || ""}
                    onChange={(e) =>
                      setSetting(
                        "hourlyRate",
                        e.target.value ? parseFloat(e.target.value) : "",
                      )
                    }
                    placeholder="0.00"
                    className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 text-sm shadow-sm h-10"
                  />
                  <span
                    style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}
                  >
                    /hr
                  </span>
                </div>
              </FieldRow>
              <FieldRow
                label="Default start"
                hint="Pre-fills when logging new hours"
              >
                <TimeSelect
                  value={settings.defaultStart || ""}
                  onChange={(v) => setSetting("defaultStart", v)}
                />
              </FieldRow>
              <FieldRow
                label="Default end"
                hint="Pre-fills when logging new hours"
              >
                <TimeSelect
                  value={settings.defaultEnd || ""}
                  onChange={(v) => setSetting("defaultEnd", v)}
                />
              </FieldRow>
            </CardContent>
          </Card>
        )}

        {/* Form card */}
        <Card className="bg-white border-slate-200 shadow-sm mb-8">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle
              style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}
            >
              {editId ? "Edit Entry" : "Log Hours"}
            </CardTitle>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              {editId
                ? "Update the details below."
                : "Record your work session for the day."}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <FieldRow label="Date">
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  position: "relative",
                  background: form.date ? "#f0fdfa" : "#f8fafc",
                  border: `1px solid ${form.date ? "#99f6e4" : "#e2e8f0"}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#2dd4bf")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = form.date
                    ? "#99f6e4"
                    : "#e2e8f0")
                }
              >
                {/* Invisible native date input stretched over the whole label */}
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    zIndex: 1,
                  }}
                />
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={form.date ? "#0d9488" : "#94a3b8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, position: "relative", zIndex: 0 }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {form.date ? (
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#0f172a",
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {new Date(form.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "long" },
                      )}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        margin: "2px 0 0",
                      }}
                    >
                      {new Date(form.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#94a3b8",
                      margin: 0,
                      position: "relative",
                      zIndex: 0,
                    }}
                  >
                    Select a date
                  </p>
                )}
              </label>
            </FieldRow>

            <FieldRow label="Start time">
              <TimeSelect
                value={form.start}
                onChange={(v) => setField("start", v)}
              />
            </FieldRow>

            <FieldRow label="End time">
              <TimeSelect
                value={form.end}
                onChange={(v) => setField("end", v)}
              />
            </FieldRow>

            <FieldRow label="Description" hint="What did you work on?">
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="e.g. Reviewed pull requests, team standup, client call…"
                rows={3}
                className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-300 focus-visible:ring-teal-400/40 focus-visible:ring-2 resize-none text-sm shadow-sm"
              />
            </FieldRow>

            {/* Breaks */}
            <FieldRow label="Breaks" hint="Unpaid breaks are deducted">
              <div className="space-y-2">
                {form.breaks.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#cbd5e1",
                      fontStyle: "italic",
                    }}
                  >
                    No breaks added.
                  </p>
                )}
                {form.breaks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            marginBottom: 4,
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          From
                        </p>
                        <TimeSelect
                          value={b.start}
                          onChange={(v) => updateBreak(b.id, { start: v })}
                        />
                      </div>
                      <div style={{ paddingTop: 18, color: "#cbd5e1" }}>→</div>
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            marginBottom: 4,
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          To
                        </p>
                        <TimeSelect
                          value={b.end}
                          onChange={(v) => updateBreak(b.id, { end: v })}
                        />
                      </div>
                      <button
                        onClick={() => removeBreak(b.id)}
                        style={{
                          marginLeft: "auto",
                          paddingTop: 18,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#cbd5e1",
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                        className="hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Checkbox
                        id={`u-${b.id}`}
                        checked={b.unpaid}
                        onCheckedChange={(v) =>
                          updateBreak(b.id, { unpaid: !!v })
                        }
                        className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 h-4 w-4"
                      />
                      <Label
                        htmlFor={`u-${b.id}`}
                        className="text-sm text-slate-500 cursor-pointer select-none"
                      >
                        Unpaid break{" "}
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          (deducted from hours)
                        </span>
                      </Label>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBreak}
                  className="h-8 text-xs border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 mt-1"
                >
                  + Add break
                </Button>
              </div>
            </FieldRow>

            {/* Footer */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                {form.start && form.end ? (
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#0d9488",
                      }}
                    >
                      {formatDuration(previewMins)}
                    </span>
                    <span
                      style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}
                    >
                      {formatDecimal(previewMins)} hrs
                    </span>
                    {settings.hourlyRate > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          marginLeft: 8,
                        }}
                      >
                        · $
                        {((previewMins / 60) * settings.hourlyRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#cbd5e1" }}>
                    Select times to see hours
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {editId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditId(null);
                      setForm(makeEmptyForm(settings));
                    }}
                    className="h-9 px-4 text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!form.date || !form.start || !form.end}
                  className="h-9 px-5 text-sm font-semibold disabled:opacity-40"
                  style={{ background: "#0d9488", color: "#fff" }}
                >
                  {editId ? "Save Changes" : "Log Hours"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log */}
        {grouped.length === 0 ? (
          <div
            style={{ textAlign: "center", paddingTop: 64, paddingBottom: 64 }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗓</div>
            <p style={{ fontSize: 14, color: "#cbd5e1" }}>
              No entries yet. Start logging your hours above.
            </p>
          </div>
        ) : (
          (() => {
            const elements = [];
            let currentWeek = null;

            for (let gi = 0; gi < grouped.length; gi++) {
              const [date, dayEntries] = grouped[gi];
              const weekStart = getWeekStart(date);

              // Insert week header when week changes (newest first)
              if (weekStart !== currentWeek) {
                const weekEnd = new Date(weekStart + "T12:00:00");
                weekEnd.setDate(weekEnd.getDate() + 6);
                const weekLabel = `Week of ${new Date(weekStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

                // Calculate week total for this week
                const weekMinsTotal = grouped
                  .filter(([d]) => getWeekStart(d) === weekStart)
                  .reduce(
                    (sum, [, es]) =>
                      sum + es.reduce((a, e) => a + e.minutes, 0),
                    0,
                  );

                if (gi > 0) {
                  elements.push(
                    <div
                      key={`week-divider-${weekStart}`}
                      style={{ height: 8 }}
                    />,
                  );
                }

                elements.push(
                  <div
                    key={`week-header-${weekStart}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      padding: "8px 12px",
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      borderRadius: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0d9488",
                        margin: 0,
                      }}
                    >
                      {weekLabel}
                    </p>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          color: "#0d9488",
                          fontWeight: 600,
                        }}
                      >
                        {formatDuration(weekMinsTotal)}
                      </span>
                      {settings.hourlyRate > 0 && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 12,
                            color: "#64748b",
                          }}
                        >
                          $
                          {((weekMinsTotal / 60) * settings.hourlyRate).toFixed(
                            2,
                          )}
                        </span>
                      )}
                    </div>
                  </div>,
                );

                currentWeek = weekStart;
              }

              const dayTotal = dayEntries.reduce((a, e) => a + e.minutes, 0);
              elements.push(
                <div key={date} style={{ marginBottom: 20 }}>
                  {/* Day header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      padding: "0 2px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      {formatDateLabel(date)}
                    </p>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {settings.hourlyRate > 0 && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 11,
                            color: "#94a3b8",
                          }}
                        >
                          ${((dayTotal / 60) * settings.hourlyRate).toFixed(2)}
                        </span>
                      )}
                      <div
                        style={{
                          background: "#f0fdfa",
                          border: "1px solid #99f6e4",
                          borderRadius: 20,
                          padding: "3px 12px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          color: "#0d9488",
                          fontWeight: 600,
                        }}
                      >
                        {formatDuration(dayTotal)}
                      </div>
                    </div>
                  </div>

                  <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    {dayEntries.map((entry, i) => {
                      const bm = (entry.breaks || [])
                        .filter((b) => b.unpaid)
                        .reduce((acc, b) => {
                          const bs = parseTime(b.start),
                            be = parseTime(b.end);
                          return bs !== null && be !== null && be > bs
                            ? acc + (be - bs)
                            : acc;
                        }, 0);
                      return (
                        <div
                          key={entry.id}
                          className="entry-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 20px",
                            borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                            transition: "background 0.15s",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              whiteSpace: "nowrap",
                              fontFamily: "'DM Mono', monospace",
                              width: 140,
                              flexShrink: 0,
                            }}
                          >
                            {toDisplayTime(entry.start)} –{" "}
                            {toDisplayTime(entry.end)}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: entry.description ? "#334155" : "#cbd5e1",
                              fontStyle: entry.description
                                ? "normal"
                                : "italic",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.description || "No description"}
                          </span>
                          {bm > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 4,
                                padding: "2px 8px",
                                whiteSpace: "nowrap",
                                fontFamily: "'DM Mono', monospace",
                                flexShrink: 0,
                              }}
                            >
                              −{formatDuration(bm)}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                              width: 52,
                              textAlign: "right",
                              fontFamily: "'DM Mono', monospace",
                              flexShrink: 0,
                            }}
                          >
                            {formatDuration(entry.minutes)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="delete-btn h-7 w-7 p-0 text-slate-300 hover:text-red-400 hover:bg-red-50 shrink-0"
                            style={{ opacity: 0, transition: "opacity 0.15s" }}
                          >
                            ✕
                          </Button>
                        </div>
                      );
                    })}
                  </Card>
                </div>,
              );
            }

            return elements;
          })()
        )}
      </div>
    </div>
  );
}
