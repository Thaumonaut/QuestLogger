import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MINUTE_OPTIONS = ["00", "15", "30", "45"].map((m) => ({ value: m, label: m }));
const PERIOD_OPTIONS = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

export const triggerCls =
  "bg-[var(--color-input-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-muted)] focus:ring-[var(--color-accent)]/40 focus:ring-2 h-10 text-sm shadow-sm";
const contentCls = "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]";
const itemCls = "focus:bg-[var(--color-accent-light)] focus:text-[var(--color-accent-text)]";

export default function TimeSelect({ value, onChange }) {
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

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(v) => emit(v, minute || "00", period)}>
        <SelectTrigger className={`${triggerCls} w-16`}><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent className={contentCls}>
          {HOUR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className={itemCls}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <span style={{ color: "var(--color-muted)", fontWeight: 600, fontSize: "1rem", userSelect: "none" }}>:</span>
      <Select value={minute} onValueChange={(v) => emit(hour || "12", v, period)}>
        <SelectTrigger className={`${triggerCls} w-16`}><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent className={contentCls}>
          {MINUTE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className={itemCls}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => emit(hour || "12", minute || "00", v)}>
        <SelectTrigger className={`${triggerCls} w-20`}><SelectValue /></SelectTrigger>
        <SelectContent className={contentCls}>
          {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className={itemCls}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
