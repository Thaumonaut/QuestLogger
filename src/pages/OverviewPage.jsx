import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import {
  TrendingUp, DollarSign, Clock, Briefcase,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { formatMoney, formatDuration, formatDecimal, weekStart } from "../lib/utils";
import EarningsCard from "../components/EarningsCard";

export default function OverviewPage() {
  const { entries, loading, hourlyRate, projects, dailyTarget, weeklyTarget } = useApp();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthStr)),
    [entries, monthStr]
  );

  const totalMins = useMemo(() => monthEntries.reduce((a, e) => a + e.minutes, 0), [monthEntries]);
  const billableMins = useMemo(() => monthEntries.filter((e) => e.billable !== false).reduce((a, e) => a + e.minutes, 0), [monthEntries]);
  const totalEarnings = (billableMins / 60) * hourlyRate;

  const activeProjectIds = useMemo(() => {
    const ids = new Set(monthEntries.map((e) => e.project_id).filter(Boolean));
    return ids.size;
  }, [monthEntries]);

  // Daily data for the bar chart — one bar per day
  const dailyData = useMemo(() => {
    const map = {};
    for (const e of monthEntries) {
      const day = parseInt(e.date.slice(8), 10);
      if (!map[day]) map[day] = { day, billable: 0, nonBillable: 0 };
      if (e.billable !== false) map[day].billable += e.minutes / 60;
      else map[day].nonBillable += e.minutes / 60;
    }
    return Object.values(map)
      .sort((a, b) => a.day - b.day)
      .map((d) => ({
        day: `${d.day}`,
        billable: Math.round(d.billable * 10) / 10,
        nonBillable: Math.round(d.nonBillable * 10) / 10,
      }));
  }, [monthEntries]);

  // Calendar day data
  const dayMap = useMemo(() => {
    const map = {};
    for (const e of monthEntries) {
      const day = parseInt(e.date.slice(8), 10);
      if (!map[day]) map[day] = { mins: 0, earnings: 0 };
      map[day].mins += e.minutes;
      if (e.billable !== false && hourlyRate > 0) {
        map[day].earnings += (e.minutes / 60) * hourlyRate;
      }
    }
    return map;
  }, [monthEntries, hourlyRate]);

  const { daysInMonth, startingDayOfWeek } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = new Date(year, month, 1).getDay();
    return { daysInMonth, startingDayOfWeek };
  }, [currentMonth]);

  const formatMonth = (d) =>
    d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const chartStyle = {
    backgroundColor: dark ? "#1e293b" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: "8px",
    color: dark ? "#ffffff" : "#1e293b",
    fontSize: "12px",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="space-y-4 sm:space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Earnings */}
          <div className={`rounded-xl border p-3 sm:p-4 overflow-hidden ${
            dark ? "bg-slate-900/50 backdrop-blur-2xl border-cyan-500/20" : "bg-white/60 backdrop-blur-xl border-blue-200/50"
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-1.5 rounded-lg ${dark ? "bg-cyan-500/15" : "bg-teal-50"}`}>
                <DollarSign className={`w-4 h-4 ${dark ? "text-cyan-400" : "text-teal-600"}`} />
              </div>
              {hourlyRate > 0 && <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />}
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {hourlyRate > 0 ? formatMoney(totalEarnings) : "—"}
            </div>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>Revenue</p>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>{formatMonth(currentMonth)}</p>
          </div>

          {/* Total Hours */}
          <div className={`rounded-xl border p-3 sm:p-4 overflow-hidden ${
            dark ? "bg-slate-900/50 backdrop-blur-2xl border-purple-500/20" : "bg-white/60 backdrop-blur-xl border-purple-200/50"
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-1.5 rounded-lg ${dark ? "bg-purple-500/15" : "bg-purple-50"}`}>
                <Clock className={`w-4 h-4 ${dark ? "text-purple-400" : "text-purple-600"}`} />
              </div>
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {formatDecimal(totalMins)}h
            </div>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>Total Hours</p>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>{formatDecimal(billableMins)}h billable</p>
          </div>

          {/* Hourly Rate */}
          <div className={`rounded-xl border p-3 sm:p-4 overflow-hidden ${
            dark ? "bg-slate-900/50 backdrop-blur-2xl border-teal-500/20" : "bg-white/60 backdrop-blur-xl border-teal-200/50"
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-1.5 rounded-lg ${dark ? "bg-teal-500/15" : "bg-teal-50"}`}>
                <DollarSign className={`w-4 h-4 ${dark ? "text-teal-400" : "text-teal-600"}`} />
              </div>
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {hourlyRate > 0 ? `$${hourlyRate}` : "—"}
            </div>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>Hourly Rate</p>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>Set in Settings</p>
          </div>

          {/* Projects */}
          <div className={`rounded-xl border p-3 sm:p-4 overflow-hidden ${
            dark ? "bg-slate-900/50 backdrop-blur-2xl border-pink-500/20" : "bg-white/60 backdrop-blur-xl border-pink-200/50"
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-1.5 rounded-lg ${dark ? "bg-pink-500/15" : "bg-pink-50"}`}>
                <Briefcase className={`w-4 h-4 ${dark ? "text-pink-400" : "text-pink-600"}`} />
              </div>
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {activeProjectIds}
            </div>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>Active Projects</p>
            <p className={`text-xs mt-0.5 truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>This month</p>
          </div>
        </div>

        {/* ── Earnings Detail + Goals ── */}
        <EarningsCard />

        {/* ── Monthly Hours Chart ── */}
        {dailyData.length > 0 && (
          <div className={`rounded-xl border p-4 sm:p-6 ${
            dark ? "bg-slate-900/50 backdrop-blur-2xl border-cyan-500/20" : "bg-white/60 backdrop-blur-xl border-blue-200/50"
          }`}>
            <h3 className={`text-sm sm:text-base font-semibold mb-4 ${dark ? "text-white" : "text-slate-800"}`}>
              {formatMonth(currentMonth)} — Hours by Day
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#e2e8f0"} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: dark ? "#334155" : "#e2e8f0" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartStyle}
                  formatter={(v, name) => [`${v}h`, name === "billable" ? "Billable" : "Non-billable"]}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: dark ? "#94a3b8" : "#64748b", paddingTop: 8 }}
                  formatter={(value) => value === "billable" ? "Billable" : "Non-billable"}
                />
                <Bar dataKey="billable" stackId="a" fill={dark ? "#06b6d4" : "#14b8a6"} radius={[0, 0, 0, 0]} />
                <Bar dataKey="nonBillable" stackId="a" fill={dark ? "#8b5cf6" : "#a855f7"} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Calendar Month View ── */}
        <div className={`rounded-xl border ${
          dark ? "bg-slate-900/50 backdrop-blur-2xl border-cyan-500/20" : "bg-white/60 backdrop-blur-xl border-blue-200/50"
        }`}>
          <div className="p-4 sm:p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${dark ? "text-cyan-400" : "text-blue-600"}`} />
                <h3 className={`text-sm sm:text-base font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>
                  {formatMonth(currentMonth)}
                </h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className={`p-1.5 rounded-lg transition-all ${dark ? "text-slate-400 hover:text-white hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className={`p-1.5 rounded-lg transition-all ${dark ? "text-slate-400 hover:text-white hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className={`text-center text-xs font-semibold py-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const data = dayMap[day];
                const hasData = !!data;
                const isWeekend = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() % 6 === 0;

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg p-1 transition-all flex flex-col ${
                      hasData
                        ? dark
                          ? "bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-2 border-cyan-500/40"
                          : "bg-gradient-to-br from-teal-100 to-emerald-100 border-2 border-teal-300"
                        : dark
                        ? "bg-slate-800/30 border border-slate-700/50"
                        : "bg-slate-50/50 border border-slate-200/50"
                    } ${isWeekend && !hasData ? "opacity-40" : ""}`}
                  >
                    <div className={`text-xs font-semibold leading-none ${
                      hasData ? dark ? "text-cyan-300" : "text-teal-700" : dark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {day}
                    </div>
                    {hasData && (
                      <div className="mt-auto">
                        <div className={`text-xs font-bold leading-tight ${dark ? "text-white" : "text-slate-800"}`} style={{ fontSize: 9 }}>
                          {formatDuration(data.mins)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className={`mt-4 pt-3 border-t flex items-center justify-center gap-4 ${dark ? "border-slate-800/50" : "border-slate-200/50"}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded border-2 ${dark ? "bg-cyan-500/20 border-cyan-500/40" : "bg-teal-100 border-teal-300"}`} />
                <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Worked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded border ${dark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50/50 border-slate-200/50"}`} />
                <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>No work</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
