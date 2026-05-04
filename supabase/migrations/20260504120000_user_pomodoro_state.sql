-- Pomodoro state synced per user (Realtime + RLS)
create table if not exists public.user_pomodoro_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mode text not null default 'work'
    check (mode in ('work', 'shortBreak', 'longBreak')),
  sessions int not null default 0,
  is_running boolean not null default false,
  remaining_seconds int not null default 1500,
  ends_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists user_pomodoro_state_updated_at on public.user_pomodoro_state (updated_at desc);

alter table public.user_pomodoro_state enable row level security;

create policy "Users read own pomodoro state"
  on public.user_pomodoro_state for select
  using (auth.uid() = user_id);

create policy "Users insert own pomodoro state"
  on public.user_pomodoro_state for insert
  with check (auth.uid() = user_id);

create policy "Users update own pomodoro state"
  on public.user_pomodoro_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own pomodoro state"
  on public.user_pomodoro_state for delete
  using (auth.uid() = user_id);

create or replace function public.user_pomodoro_state_set_ends_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_running and new.remaining_seconds is not null then
    new.ends_at := pg_catalog.now() + (new.remaining_seconds * interval '1 second');
  else
    new.ends_at := null;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists tr_user_pomodoro_state_ends_at on public.user_pomodoro_state;
create trigger tr_user_pomodoro_state_ends_at
  before insert or update on public.user_pomodoro_state
  for each row
  execute function public.user_pomodoro_state_set_ends_at();

alter table public.user_pomodoro_state replica identity full;

alter publication supabase_realtime add table public.user_pomodoro_state;
