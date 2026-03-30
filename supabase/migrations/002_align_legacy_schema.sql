-- Run AFTER 001 if you already had the older schema (budget_cents / old statuses).
-- Safe to run once; adjust if your table differs.

-- Rename budget_cents → budget when needed
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'budget_cents'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'budget'
  ) then
    alter table public.tasks rename column budget_cents to budget;
  end if;
end $$;

-- Migrate legacy status values
update public.tasks set status = 'submitted' where status = 'completed';
update public.tasks set status = 'open' where status = 'pending_payment';

-- Replace status check constraint (Postgres names may vary — drop known names)
alter table public.tasks drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'claimed', 'submitted', 'approved', 'disputed'));
