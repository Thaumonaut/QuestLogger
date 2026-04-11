-- Planner: priority levels + gamification points (run in Supabase SQL if migrations are not auto-applied)

alter table public.planner_tasks
  add column if not exists priority smallint not null default 0;

alter table public.planner_tasks drop constraint if exists planner_tasks_priority_check;
alter table public.planner_tasks
  add constraint planner_tasks_priority_check check (priority >= 0 and priority <= 3);

alter table public.planner_tasks
  add column if not exists completion_points_awarded boolean not null default false;

create table if not exists public.planner_points (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_points integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists planner_points_user on public.planner_points (user_id);

alter table public.planner_points enable row level security;

create policy "Users read own planner points"
  on public.planner_points for select
  using (auth.uid() = user_id);

create policy "Users insert own planner points"
  on public.planner_points for insert
  with check (auth.uid() = user_id);

create policy "Users update own planner points"
  on public.planner_points for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
