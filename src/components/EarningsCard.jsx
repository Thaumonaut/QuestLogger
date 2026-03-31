import { useApp } from "../context/AppContext";
import { formatDuration, formatDecimal, formatMoney, todayStr, weekStart } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EarningsCard() {
  const { entries, hourlyRate, earningsPeriod, setEarningsPeriod, earningsData, dailyTarget, weeklyTarget } = useApp();

  const { periodMins, periodBillableMins, periodNonBillableMins, periodEarnings, avgWeekMins, avgMonthMins, avgWeekEarnings, avgMonthEarnings } = earningsData;

  return (
    <Card style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }} className="shadow-sm mb-8">
      <CardHeader className="px-6 pt-6 pb-2">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <CardTitle style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", fontFamily: "'Parkinsans', sans-serif" }}>
            Earnings
          </CardTitle>
          <div style={{ display: "flex", background: "var(--color-tag-bg)", borderRadius: 8, padding: 3, gap: 2 }}>
            {["week", "month"].map((p) => (
              <button key={p} onClick={() => setEarningsPeriod(p)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                fontFamily: "'Parkinsans', sans-serif",
                background: earningsPeriod === p ? "var(--color-surface)" : "transparent",
                color: earningsPeriod === p ? "var(--color-accent)" : "var(--color-muted)",
                boxShadow: earningsPeriod === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}>
                {p === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-3">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Hero card */}
          <div style={{ background: "linear-gradient(135deg, var(--color-accent-light), var(--color-accent-light))", border: "1px solid var(--color-accent-border)", borderRadius: 12, padding: "16px 18px", gridColumn: "span 2", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                {earningsPeriod === "week" ? "This Week" : "This Month"}
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--color-accent)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                {hourlyRate > 0 ? formatMoney(periodEarnings) : "—"}
              </p>
              {hourlyRate > 0 && periodNonBillableMins > 0 && (
                <p style={{ fontSize: 11, color: "var(--color-accent-text)", marginTop: 4 }}>
                  {formatDecimal(periodBillableMins)} billable · {formatDecimal(periodNonBillableMins)} non-billable hrs
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, color: "var(--color-secondary)", marginBottom: 4 }}>Hours worked</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                {formatDecimal(periodMins)}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--color-muted)", marginLeft: 4 }}>hrs</span>
              </p>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 3 }}>{formatDuration(periodMins)}</p>
            </div>
          </div>

          {/* Avg week */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg / Week</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{hourlyRate > 0 ? formatMoney(avgWeekEarnings) : "—"}</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{formatDecimal(avgWeekMins)} hrs avg</p>
          </div>

          {/* Avg month */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg / Month</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{hourlyRate > 0 ? formatMoney(avgMonthEarnings) : "—"}</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{formatDecimal(avgMonthMins)} hrs avg</p>
          </div>
        </div>

        {/* Target progress bars */}
        {(dailyTarget > 0 || weeklyTarget > 0) && (() => {
          const todayMinsVal = entries.filter((e) => e.date === todayStr()).reduce((a, e) => a + e.minutes, 0);
          const weekMinsVal = entries.filter((e) => weekStart(e.date) === weekStart(todayStr())).reduce((a, e) => a + e.minutes, 0);
          return (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {dailyTarget > 0 && (() => {
                const pct = Math.min(100, (todayMinsVal / (dailyTarget * 60)) * 100);
                const done = todayMinsVal >= dailyTarget * 60;
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: done ? "var(--color-accent)" : "var(--color-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily goal</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: done ? "var(--color-accent)" : "var(--color-secondary)" }}>
                        {formatDuration(todayMinsVal)} / {dailyTarget}h {done ? "✓" : `· ${formatDuration(dailyTarget * 60 - todayMinsVal)} left`}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--color-tag-bg)", borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: done ? "var(--color-accent)" : "var(--color-accent-bright)", borderRadius: 9999, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })()}
              {weeklyTarget > 0 && (() => {
                const pct = Math.min(100, (weekMinsVal / (weeklyTarget * 60)) * 100);
                const done = weekMinsVal >= weeklyTarget * 60;
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: done ? "var(--color-accent)" : "var(--color-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weekly goal</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: done ? "var(--color-accent)" : "var(--color-secondary)" }}>
                        {formatDuration(weekMinsVal)} / {weeklyTarget}h {done ? "✓" : `· ${formatDuration(weeklyTarget * 60 - weekMinsVal)} left`}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--color-tag-bg)", borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: done ? "var(--color-accent)" : "var(--color-accent-bright)", borderRadius: 9999, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
