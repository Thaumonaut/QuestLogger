-- Partial progress + points credited per task (replaces completion_points_awarded boolean)

alter table public.planner_tasks
  add column if not exists progress smallint not null default 0;

alter table public.planner_tasks
  add column if not exists points_awarded_for_task integer not null default 0;

alter table public.planner_tasks drop constraint if exists planner_tasks_progress_check;
alter table public.planner_tasks
  add constraint planner_tasks_progress_check check (progress >= 0 and progress <= 100);

-- Backfill completed tasks: full progress and full point credit for their priority tier
update public.planner_tasks
set
  progress = 100,
  points_awarded_for_task = 10 + coalesce(priority, 0) * 5
where done = true;

alter table public.planner_tasks drop column if exists completion_points_awarded;
