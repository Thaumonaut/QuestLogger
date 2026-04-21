-- Optional notes per task (e.g. what is left to do for partial work)
alter table public.planner_tasks
  add column if not exists notes text not null default '';
