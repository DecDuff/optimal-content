-- Direct / private optimizer requests
alter table public.tasks
  add column if not exists is_private boolean not null default false,
  add column if not exists requested_optimizer_id uuid references public.profiles (id) on delete set null,
  add column if not exists expires_at timestamptz;

create index if not exists tasks_requested_optimizer_idx
  on public.tasks (requested_optimizer_id)
  where requested_optimizer_id is not null;

create index if not exists tasks_open_private_expires_idx
  on public.tasks (status, is_private, expires_at)
  where status = 'open' and is_private = true;

comment on column public.tasks.is_private is 'When true, task is hidden from public open feed until declined or accepted flow changes it';
comment on column public.tasks.requested_optimizer_id is 'Creator-only direct invite; only this optimizer may claim while open+private+funded';
comment on column public.tasks.expires_at is 'Direct request expiry (e.g. 24h from creation); optional for non-direct tasks';
