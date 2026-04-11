-- Daily planner tasks (run in Supabase SQL editor if migrations are not applied automatically)
create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  planner_date date not null,
  title text not null,
  done boolean not null default false,
  in_progress boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists planner_tasks_user_date on public.planner_tasks (user_id, planner_date);

alter table public.planner_tasks enable row level security;

create policy "Users read own planner tasks"
  on public.planner_tasks for select
  using (auth.uid() = user_id);

create policy "Users insert own planner tasks"
  on public.planner_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users update own planner tasks"
  on public.planner_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own planner tasks"
  on public.planner_tasks for delete
  using (auth.uid() = user_id);
