import { useMemo } from "react";

const WEEK_COUNT = 53;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensity(mins) {
  if (!mins || mins === 0) return 0;
  if (mins < 120) return 1;
  if (mins < 240) return 2;
  return 3;
}

function getCellColor(intensity) {
  if (intensity === 0) return "var(--color-surface-raised)";
  if (intensity === 1) return "var(--color-accent-border)";
  if (intensity === 2) return "var(--color-accent-bright)";
  return "var(--color-accent)";
}

export default function Heatmap({ entries }) {
  const { grid, monthLabels } = useMemo(() => {
    // Build date → minutes map
    const dateMap = {};
    for (const e of entries) {
      dateMap[e.date] = (dateMap[e.date] || 0) + e.minutes;
    }

    // End date = today, start = 52 weeks back from the Sunday before today
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayDow = today.getDay(); // 0 = Sun
    // Go back to last Sunday (inclusive of today's week)
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() - todayDow + 6); // end on the Saturday of this week
    const startSunday = new Date(endSunday);
    startSunday.setDate(endSunday.getDate() - (WEEK_COUNT * 7) + 1);
    // Adjust startSunday to a Sunday
    const startDow = startSunday.getDay();
    startSunday.setDate(startSunday.getDate() - startDow);

    // Build grid[col][row] = { date, mins }
    const grid = [];
    const monthLabels = []; // { col, month }
    let lastMonth = -1;

    for (let col = 0; col < WEEK_COUNT; col++) {
      const week = [];
      for (let row = 0; row < 7; row++) {
        const d = new Date(startSunday);
        d.setDate(startSunday.getDate() + col * 7 + row);
        if (d > today) {
          week.push(null);
          continue;
        }
        const dateStr = d.toISOString().split("T")[0];
        const mins = dateMap[dateStr] || 0;
        week.push({ date: dateStr, mins, day: d.getDate(), month: d.getMonth(), year: d.getFullYear() });
        if (row === 0 && d.getMonth() !== lastMonth) {
          monthLabels.push({ col, label: MONTHS[d.getMonth()] });
          lastMonth = d.getMonth();
        }
      }
      grid.push(week);
    }

    return { grid, monthLabels };
  }, [entries]);

  const CELL = 12;
  const GAP = 3;
  const step = CELL + GAP;
  const totalW = WEEK_COUNT * step - GAP;
  const totalH = 7 * step - GAP;
  const LABEL_H = 18;
  const DAY_LABEL_W = 28;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "inline-block", minWidth: totalW + DAY_LABEL_W + 8 }}>
        {/* Month labels row */}
        <div style={{ display: "flex", marginLeft: DAY_LABEL_W + 8, marginBottom: 4, height: LABEL_H, position: "relative", width: totalW }}>
          {monthLabels.map(({ col, label }) => (
            <span key={`${col}-${label}`} style={{ position: "absolute", left: col * step, fontSize: 10, color: "var(--color-muted)", fontWeight: 500, lineHeight: `${LABEL_H}px`, whiteSpace: "nowrap" }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {/* Day labels */}
          <div style={{ display: "flex", flexDirection: "column", gap: GAP, width: DAY_LABEL_W, flexShrink: 0 }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ height: CELL, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4 }}>
                {(i % 2 === 1) && <span style={{ fontSize: 9, color: "var(--color-muted)", lineHeight: 1 }}>{d}</span>}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "flex", gap: GAP }}>
            {grid.map((week, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {week.map((cell, row) => {
                  if (!cell) return <div key={row} style={{ width: CELL, height: CELL }} />;
                  const intensity = getIntensity(cell.mins);
                  const color = getCellColor(intensity);
                  const isToday = cell.date === new Date().toISOString().split("T")[0];
                  return (
                    <div
                      key={row}
                      title={`${cell.date}: ${cell.mins ? Math.round(cell.mins / 60 * 10) / 10 + "h" : "no hours"}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 3,
                        background: color,
                        border: isToday ? "2px solid var(--color-accent)" : "none",
                        boxSizing: "border-box",
                        cursor: cell.mins > 0 ? "pointer" : "default",
                        transition: "opacity 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, marginLeft: DAY_LABEL_W + 8 }}>
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>Less</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: CELL, height: CELL, borderRadius: 3, background: getCellColor(i) }} />
          ))}
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>More</span>
        </div>
      </div>
    </div>
  );
}
