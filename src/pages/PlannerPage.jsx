import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { todayStr, tomorrowStr, formatDateLabel, offsetDateStr } from "../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Focus, Trash2, Sparkles, Trophy } from "lucide-react";

/** How many calendar days of unfinished tasks to show under "Earlier"; older unchecked tasks are removed. */
const PLANNER_HISTORY_DAYS = 5;
/** Load future tasks up to this many days ahead. */
const PLANNER_FUTURE_DAYS = 90;

const PRIORITY_OPTIONS = [
  { value: "0", label: "—" },
  { value: "1", label: "Low" },
  { value: "2", label: "Med" },
  { value: "3", label: "High" },
];

function normalizePlannerTask(row) {
  return {
    id: row.id,
    plannerDate: row.planner_date,
    title: (row.title || "").trim(),
    done: row.done === true,
    inProgress: row.in_progress === true,
    sortOrder: row.sort_order ?? 0,
    priority: Math.min(3, Math.max(0, Number(row.priority) || 0)),
    progress: Math.min(100, Math.max(0, Number(row.progress) || 0)),
    pointsAwardedForTask: Math.max(0, Number(row.points_awarded_for_task) || 0),
  };
}

function sortTasksForDisplay(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

/** Max points when a task is fully complete (depends on priority). */
function pointsForComplete(priority) {
  const p = Math.min(3, Math.max(0, priority | 0));
  return 10 + p * 5;
}

function clampProgress(n) {
  const v = Math.round(Number(n));
  return Math.min(100, Math.max(0, v));
}

/**
 * Target points credited for this task. Incomplete tasks cap at 99% of max so the last slice
 * only applies when the task is checked complete.
 */
function targetCreditedForTask(done, progress, priority) {
  const max = pointsForComplete(priority);
  if (done) return max;
  const p = Math.min(99, clampProgress(progress));
  return Math.floor((max * p) / 100);
}

/** When AI is off, split on semicolons or newlines. */
function heuristicBreakdown(title) {
  const raw = title.split(/[;\n]|(?:\s*\/\s*)/).map((s) => s.trim()).filter(Boolean);
  return raw.length > 1 ? raw.slice(0, 10) : null;
}

function PlannerTaskRow({
  t,
  dark,
  disabled,
  showDateBadge,
  dateBadgeStr,
  onToggleDone,
  onDelete,
  onSetFocus,
  onMove,
  moveTitle,
  onPriorityChange,
  onProgressChange,
  maxPoints,
}) {
  const inputCls = dark
    ? "bg-slate-900/50 border-slate-600 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <li
      className={`flex items-start gap-3 sm:gap-4 rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4 transition-colors ${
        t.inProgress
          ? dark
            ? "border-cyan-500/40 bg-cyan-500/10"
            : "border-teal-300 bg-teal-50/80"
          : dark
            ? "border-slate-700/80 bg-slate-950/30"
            : "border-slate-100 bg-slate-50/50"
      }`}
    >
      <Checkbox
        checked={t.done}
        onCheckedChange={() => onToggleDone(t)}
        className="mt-0.5"
        disabled={disabled}
        aria-label={t.done ? "Mark not done" : "Mark done"}
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {showDateBadge && dateBadgeStr && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                dark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"
              }`}
            >
              {dateBadgeStr}
            </span>
          )}
          <p
            className={`text-sm leading-snug flex-1 min-w-0 ${
              t.done ? "line-through opacity-60" : ""
            } ${dark ? "text-slate-200" : "text-slate-800"}`}
          >
            {t.title || "(empty)"}
          </p>
        </div>
        {t.inProgress && !t.done && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
              dark ? "text-cyan-300" : "text-teal-700"
            }`}
          >
            <Focus className="w-3 h-3" />
            Working on
          </span>
        )}
        {!t.done && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className={dark ? "text-slate-500" : "text-slate-500"}>Progress · {Math.min(99, t.progress)}%</span>
              <span className={`font-medium tabular-nums ${dark ? "text-amber-200/90" : "text-amber-800"}`}>
                {t.pointsAwardedForTask}/{maxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={99}
              step={1}
              value={Math.min(99, t.progress)}
              disabled={disabled}
              onChange={(e) => onProgressChange(t, Number(e.target.value))}
              className={`w-full h-2 rounded-full cursor-pointer disabled:opacity-50 ${
                dark ? "accent-cyan-500" : "accent-teal-600"
              }`}
              aria-label="Task progress percent"
            />
            <p className={`text-[10px] leading-snug ${dark ? "text-slate-500" : "text-slate-500"}`}>
              Slide up to 99% for partial points — check the box when finished to earn the last bit.
            </p>
          </div>
        )}
        {t.done && (
          <p className={`text-[11px] font-medium tabular-nums ${dark ? "text-emerald-400/90" : "text-emerald-700"}`}>
            {t.pointsAwardedForTask}/{maxPoints} pts · complete
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-end sm:items-center">
        <Select
          value={String(t.priority)}
          onValueChange={(v) => onPriorityChange(t, Number(v))}
          disabled={disabled || t.done}
        >
          <SelectTrigger
            className={`h-8 w-[72px] text-xs px-2 ${inputCls}`}
            aria-label="Priority"
          >
            <SelectValue placeholder="Pri" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!t.done && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            title="Mark as what you are working on now"
            onClick={() => onSetFocus(t)}
            disabled={disabled}
          >
            <Focus className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Focus</span>
          </Button>
        )}
        {onMove && !t.done && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            title={moveTitle}
            onClick={() => onMove(t)}
            disabled={disabled}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 px-2 text-xs ${dark ? "text-slate-400 hover:text-red-400" : "text-slate-500 hover:text-red-600"}`}
          title="Remove"
          onClick={() => onDelete(t.id)}
          disabled={disabled}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </li>
  );
}

export default function PlannerPage() {
  const { session, flash, breakdownPlannerTask } = useApp();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const userId = session?.user?.id;

  const [items, setItems] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newCurrent, setNewCurrent] = useState("");
  const [newFuture, setNewFuture] = useState("");
  const [saving, setSaving] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const historyStart = offsetDateStr(today, -PLANNER_HISTORY_DAYS);
  const futureEnd = offsetDateStr(today, PLANNER_FUTURE_DAYS);

  const todayTasks = useMemo(() => items.filter((t) => t.plannerDate === today), [items, today]);
  const previousTasks = useMemo(() => {
    return items.filter(
      (t) => t.plannerDate < today && t.plannerDate >= historyStart && !t.done,
    );
  }, [items, today, historyStart]);

  const futureTasks = useMemo(() => items.filter((t) => t.plannerDate > today), [items, today]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { error: delErr } = await supabase
      .from("planner_tasks")
      .delete()
      .eq("user_id", userId)
      .eq("done", false)
      .lt("planner_date", historyStart);
    if (delErr) console.error(delErr);

    const { data, error } = await supabase
      .from("planner_tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("planner_date", historyStart)
      .lte("planner_date", futureEnd)
      .order("planner_date")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      flash("✗ Could not load planner. Run the planner SQL migrations in Supabase if tables are missing.");
      setItems([]);
    } else {
      setItems((data || []).map(normalizePlannerTask));
    }

    const { data: pts } = await supabase.from("planner_points").select("total_points").eq("user_id", userId).maybeSingle();
    setTotalPoints(pts?.total_points ?? 0);

    setLoading(false);
  }, [userId, historyStart, futureEnd, flash]);

  useEffect(() => {
    load();
  }, [load]);

  function nextSortOrder(forDate) {
    const same = items.filter((t) => t.plannerDate === forDate);
    if (same.length === 0) return 0;
    return Math.max(...same.map((t) => t.sortOrder)) + 1;
  }

  async function addPoints(delta) {
    if (!userId || delta === 0) return;
    const { data: row } = await supabase.from("planner_points").select("total_points").eq("user_id", userId).maybeSingle();
    const next = Math.max(0, (row?.total_points ?? 0) + delta);
    const { error } = await supabase.from("planner_points").upsert(
      { user_id: userId, total_points: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (!error) setTotalPoints(next);
  }

  /**
   * Keeps `points_awarded_for_task` and planner total in sync with done / progress / priority.
   * Partial credit = floor(max × progress%); full check = max.
   */
  async function syncTaskGamification(task, partial) {
    if (!userId || saving) return;
    let done = partial.done !== undefined ? partial.done : task.done;
    let priority = partial.priority !== undefined ? Math.min(3, Math.max(0, partial.priority | 0)) : task.priority;
    let progress = task.progress;

    if (partial.done === true) {
      done = true;
      progress = 100;
    } else if (partial.done === false) {
      done = false;
      progress = partial.progress !== undefined ? clampProgress(partial.progress) : 99;
    } else if (partial.progress !== undefined) {
      progress = clampProgress(partial.progress);
      if (!done) progress = Math.min(99, progress);
    }

    if (done) progress = 100;
    else progress = Math.min(99, progress);

    const newTarget = targetCreditedForTask(done, progress, priority);
    const delta = newTarget - task.pointsAwardedForTask;

    const patch = {
      done,
      progress,
      priority,
      points_awarded_for_task: newTarget,
    };
    if (done) patch.in_progress = false;

    setSaving(true);
    if (delta !== 0) await addPoints(delta);
    const { error } = await supabase.from("planner_tasks").update(patch).eq("id", task.id).eq("user_id", userId);
    setSaving(false);
    if (error) {
      if (delta !== 0) await addPoints(-delta);
      flash("✗ Could not update task");
      return;
    }
    setItems((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              done,
              progress,
              priority,
              pointsAwardedForTask: newTarget,
              inProgress: done ? false : t.inProgress,
            }
          : t,
      ),
    );
  }

  async function addTask(forDate, titleRaw, setInput, priority = 0) {
    const title = titleRaw.trim();
    if (!title || !userId || saving) return;
    setSaving(true);
    const sort_order = nextSortOrder(forDate);
    const { data, error } = await supabase
      .from("planner_tasks")
      .insert({
        user_id: userId,
        planner_date: forDate,
        title,
        done: false,
        in_progress: false,
        sort_order,
        priority,
        progress: 0,
        points_awarded_for_task: 0,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      flash("✗ Could not add task");
      return;
    }
    setInput("");
    setItems((prev) => [...prev, normalizePlannerTask(data)]);
  }

  async function addTasksBulk(forDate, titles, priority = 0) {
    if (!userId || saving || !titles.length) return;
    setSaving(true);
    let order = nextSortOrder(forDate);
    const rows = titles.map((title, i) => ({
      user_id: userId,
      planner_date: forDate,
      title: title.trim(),
      done: false,
      in_progress: false,
      sort_order: order + i,
      priority,
      progress: 0,
      points_awarded_for_task: 0,
    }));
    const { data, error } = await supabase.from("planner_tasks").insert(rows).select();
    setSaving(false);
    if (error) {
      flash("✗ Could not add tasks");
      return;
    }
    setItems((prev) => [...prev, ...(data || []).map(normalizePlannerTask)]);
  }

  async function toggleDone(task) {
    if (!userId || saving) return;
    await syncTaskGamification(task, { done: !task.done });
  }

  async function setProgress(task, value) {
    if (!userId || saving || task.done) return;
    await syncTaskGamification(task, { progress: value });
  }

  async function setPriority(task, priority) {
    if (!userId || saving || task.done) return;
    await syncTaskGamification(task, { priority });
  }

  async function setFocus(task) {
    if (!userId || saving || task.done) return;
    setSaving(true);
    const sameDay = items.filter((t) => t.plannerDate === task.plannerDate);
    const updates = sameDay.map((t) =>
      supabase
        .from("planner_tasks")
        .update({ in_progress: t.id === task.id })
        .eq("id", t.id)
        .eq("user_id", userId),
    );
    const results = await Promise.all(updates);
    setSaving(false);
    if (results.some((r) => r.error)) {
      flash("✗ Could not set focus");
      return;
    }
    setItems((prev) =>
      prev.map((t) =>
        t.plannerDate === task.plannerDate ? { ...t, inProgress: t.id === task.id && !t.done } : t,
      ),
    );
  }

  async function deleteTask(id) {
    if (!userId || saving) return;
    setSaving(true);
    const { error } = await supabase.from("planner_tasks").delete().eq("id", id).eq("user_id", userId);
    setSaving(false);
    if (error) {
      flash("✗ Could not delete");
      return;
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  async function moveTaskToDate(task, targetDate) {
    if (!userId || saving) return;
    setSaving(true);
    const dest = items.filter((t) => t.plannerDate === targetDate);
    const sort_order = dest.length ? Math.max(...dest.map((t) => t.sortOrder)) + 1 : 0;
    const { error } = await supabase
      .from("planner_tasks")
      .update({
        planner_date: targetDate,
        sort_order,
        in_progress: false,
      })
      .eq("id", task.id)
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      flash("✗ Could not move task");
      return;
    }
    setItems((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, plannerDate: targetDate, sortOrder: sort_order, inProgress: false } : t,
      ),
    );
    flash("✓ Moved");
  }

  async function carryTodayToFuture() {
    const undone = todayTasks.filter((t) => !t.done);
    if (!undone.length || !userId || saving) return;
    setSaving(true);
    const targetDate = tomorrow;
    const dest = items.filter((t) => t.plannerDate === targetDate);
    let order = dest.length ? Math.max(...dest.map((t) => t.sortOrder)) + 1 : 0;
    const ops = undone.map((t) => {
      const thisOrder = order;
      order += 1;
      return supabase
        .from("planner_tasks")
        .update({ planner_date: targetDate, sort_order: thisOrder, in_progress: false })
        .eq("id", t.id)
        .eq("user_id", userId);
    });
    const results = await Promise.all(ops);
    setSaving(false);
    if (results.some((r) => r.error)) {
      flash("✗ Could not move tasks");
      return;
    }
    await load();
    flash(`✓ Moved ${undone.length} to future (${formatDateLabel(targetDate)})`);
  }

  async function handleBreakDown() {
    const raw = newCurrent.trim();
    if (!raw || saving) return;
    setBreakingDown(true);
    try {
      let steps = await breakdownPlannerTask(raw);
      if (!steps?.length) steps = heuristicBreakdown(raw);
      if (!steps?.length) {
        flash("✗ Add a DeepSeek API key in Settings for AI breakdown, or use several items separated by ; ");
        return;
      }
      await addTasksBulk(today, steps, 0);
      setNewCurrent("");
      flash(`✓ Added ${steps.length} steps`);
    } finally {
      setBreakingDown(false);
    }
  }

  const previousByDate = useMemo(() => {
    const m = new Map();
    for (const t of sortTasksForDisplay(previousTasks)) {
      if (!m.has(t.plannerDate)) m.set(t.plannerDate, []);
      m.get(t.plannerDate).push(t);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [previousTasks]);

  const sortedToday = useMemo(() => sortTasksForDisplay(todayTasks), [todayTasks]);
  const sortedFuture = useMemo(() => sortTasksForDisplay(futureTasks), [futureTasks]);

  const doneToday = sortedToday.filter((t) => t.done).length;
  const doneFuture = sortedFuture.filter((t) => t.done).length;

  const inputCls = dark
    ? "bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-slate-200 text-slate-900";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 flex justify-center min-h-[240px] items-center">
        <span className={dark ? "text-slate-400" : "text-slate-500"}>Loading planner…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 pb-28">
      <div className="mb-10 sm:mb-12 flex flex-col gap-8">
        <div>
          <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>Daily planner</h2>
          <p className={`mt-4 text-sm sm:text-[15px] leading-relaxed max-w-2xl ${dark ? "text-slate-400" : "text-slate-600"}`}>
            Current work and what is coming up. Open tasks from recent days stay visible under{" "}
            <strong className="font-semibold">Earlier</strong> until you finish them or they age out (
            {PLANNER_HISTORY_DAYS} days). Use the <strong className="font-semibold">progress</strong> slider for partial
            credit (up to 99%), then check the task to earn the rest — higher priority raises the point cap.{" "}
            <strong className="font-semibold">Break down</strong> needs a DeepSeek key in Settings.
          </p>
        </div>
        <div
          className={`flex items-center gap-4 rounded-2xl border px-6 py-5 sm:px-8 sm:py-6 w-full sm:w-auto sm:max-w-sm ${
            dark ? "border-amber-500/25 bg-amber-500/5" : "border-amber-200 bg-amber-50/80"
          }`}
        >
          <Trophy className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 ${dark ? "text-amber-400" : "text-amber-600"}`} aria-hidden />
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${dark ? "text-amber-200/80" : "text-amber-800"}`}>
              Planner points
            </p>
            <p className={`text-3xl font-bold tabular-nums ${dark ? "text-amber-100" : "text-amber-900"}`}>{totalPoints}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 sm:gap-12">
        <Card
          className={
            dark
              ? "border-cyan-500/15 bg-slate-900/40 shadow-[0_0_30px_rgba(6,182,212,0.06)] rounded-2xl"
              : "border-slate-200/80 bg-white/80 shadow-sm rounded-2xl"
          }
        >
          <CardHeader className="space-y-2 p-8 sm:p-10 pb-4 sm:pb-5">
            <CardTitle className={`text-xl sm:text-2xl ${dark ? "text-white" : "text-slate-800"}`}>Current</CardTitle>
            <CardDescription className={`text-[15px] leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
              Today and anything still open from the last few days
            </CardDescription>
            <p className={`text-xs font-medium pt-2 ${dark ? "text-cyan-400/90" : "text-teal-700"}`}>
              Today: {doneToday} of {sortedToday.length} done
              {previousTasks.length > 0 && ` · ${previousTasks.length} earlier`}
            </p>
          </CardHeader>
          <CardContent className="space-y-8 px-8 sm:px-10 pb-8 sm:pb-10 pt-0">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-slate-500" : "text-slate-500"}`}>
                Today · {formatDateLabel(today)}
              </p>
              {sortedToday.length === 0 && (
                <p className={`text-sm mb-3 ${dark ? "text-slate-500" : "text-slate-500"}`}>No tasks for today yet.</p>
              )}
              <ul className="space-y-3 sm:space-y-4">
                {sortedToday.map((t) => (
                  <PlannerTaskRow
                    key={t.id}
                    t={t}
                    dark={dark}
                    disabled={saving}
                    showDateBadge={false}
                    maxPoints={pointsForComplete(t.priority)}
                    onToggleDone={toggleDone}
                    onDelete={deleteTask}
                    onSetFocus={setFocus}
                    onMove={(task) => moveTaskToDate(task, tomorrow)}
                    moveTitle="Move to future (tomorrow)"
                    onPriorityChange={setPriority}
                    onProgressChange={setProgress}
                  />
                ))}
              </ul>
            </div>

            {previousByDate.length > 0 && (
              <div className="pt-6 border-t border-dashed border-slate-600/30">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${dark ? "text-slate-500" : "text-slate-500"}`}>
                  Earlier (rolling {PLANNER_HISTORY_DAYS} days)
                </p>
                {previousByDate.map(([dateStr, dayTasks]) => (
                  <div key={dateStr} className="mb-6 last:mb-0">
                    <p className={`text-[11px] font-medium mb-2.5 ${dark ? "text-slate-500" : "text-slate-500"}`}>
                      {formatDateLabel(dateStr)}
                    </p>
                    <ul className="space-y-3 sm:space-y-4">
                      {dayTasks.map((t) => (
                        <PlannerTaskRow
                          key={t.id}
                          t={t}
                          dark={dark}
                          disabled={saving}
                          showDateBadge={false}
                          maxPoints={pointsForComplete(t.priority)}
                          onToggleDone={toggleDone}
                          onDelete={deleteTask}
                          onSetFocus={setFocus}
                          onMove={(task) => moveTaskToDate(task, tomorrow)}
                          moveTitle="Move to tomorrow"
                          onPriorityChange={setPriority}
                          onProgressChange={setProgress}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Add a task for today…"
                  value={newCurrent}
                  onChange={(e) => setNewCurrent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask(today, newCurrent, setNewCurrent);
                    }
                  }}
                  className={`text-sm min-h-11 ${inputCls}`}
                  disabled={saving}
                />
                <Button type="button" size="sm" className="shrink-0 sm:min-w-[88px]" onClick={() => addTask(today, newCurrent, setNewCurrent)} disabled={saving}>
                  Add
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 py-5 sm:py-2"
                onClick={handleBreakDown}
                disabled={saving || breakingDown || !newCurrent.trim()}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {breakingDown ? "Breaking down…" : "Break down with AI"}
              </Button>
            </div>

            {sortedToday.some((t) => !t.done) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs py-5 sm:py-2"
                onClick={carryTodayToFuture}
                disabled={saving}
              >
                Move all unchecked from today to tomorrow
              </Button>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            dark
              ? "border-cyan-500/15 bg-slate-900/40 shadow-[0_0_30px_rgba(6,182,212,0.06)] rounded-2xl"
              : "border-slate-200/80 bg-white/80 shadow-sm rounded-2xl"
          }
        >
          <CardHeader className="space-y-2 p-8 sm:p-10 pb-4 sm:pb-5">
            <CardTitle className={`text-xl sm:text-2xl ${dark ? "text-white" : "text-slate-800"}`}>Future plans</CardTitle>
            <CardDescription className={`text-[15px] leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
              Anything scheduled after today (next {PLANNER_FUTURE_DAYS} days)
            </CardDescription>
            <p className={`text-xs font-medium pt-2 ${dark ? "text-cyan-400/90" : "text-teal-700"}`}>
              {doneFuture} of {sortedFuture.length} done
            </p>
          </CardHeader>
          <CardContent className="space-y-6 px-8 sm:px-10 pb-8 sm:pb-10 pt-0">
            {sortedFuture.length === 0 && (
              <p className={`text-sm leading-relaxed ${dark ? "text-slate-500" : "text-slate-500"}`}>
                Nothing scheduled ahead. Add something for tomorrow or beyond.
              </p>
            )}
            <ul className="space-y-3 sm:space-y-4">
              {sortedFuture.map((t) => (
                <PlannerTaskRow
                  key={t.id}
                  t={t}
                  dark={dark}
                  disabled={saving}
                  showDateBadge
                  dateBadgeStr={new Date(t.plannerDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  maxPoints={pointsForComplete(t.priority)}
                  onToggleDone={toggleDone}
                  onDelete={deleteTask}
                  onSetFocus={setFocus}
                  onMove={(task) => moveTaskToDate(task, today)}
                  moveTitle="Move to today"
                  onPriorityChange={setPriority}
                  onProgressChange={setProgress}
                />
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Input
                placeholder={`Add for ${formatDateLabel(tomorrow)}…`}
                value={newFuture}
                onChange={(e) => setNewFuture(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTask(tomorrow, newFuture, setNewFuture);
                  }
                }}
                className={`text-sm min-h-11 ${inputCls}`}
                disabled={saving}
              />
              <Button type="button" size="sm" className="shrink-0 sm:min-w-[88px]" onClick={() => addTask(tomorrow, newFuture, setNewFuture)} disabled={saving}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className={`mt-10 sm:mt-12 text-xs leading-relaxed max-w-2xl ${dark ? "text-slate-500" : "text-slate-500"}`}>
        Unchecked tasks older than {PLANNER_HISTORY_DAYS} days are removed automatically. Partial progress adjusts your
        score up or down; unchecking a finished task steps back to 99% progress and refunds the last slice of points.
        Priority raises the cap for that task.
      </p>
    </div>
  );
}
