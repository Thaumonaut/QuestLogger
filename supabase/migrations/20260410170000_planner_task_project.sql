-- Optional link to a workspace project for grouping tasks in the planner
alter table public.planner_tasks
  add column if not exists project_id uuid null references public.projects (id) on delete set null;

create index if not exists planner_tasks_user_date_project on public.planner_tasks (user_id, planner_date, project_id);
