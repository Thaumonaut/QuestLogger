-- Backlog: unscheduled tasks use null planner_date (dated tasks roll back here when the day passes)
alter table public.planner_tasks
  alter column planner_date drop not null;
