-- Optimal Content — run in Supabase SQL Editor (or supabase db push)
-- Requires: Auth enabled

create extension if not exists "pgcrypto";

-- Profiles linked to auth.users (creator | optimizer)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('creator', 'optimizer')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Tasks marketplace — budget is USD cents (integer); column name: budget
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete restrict,
  optimizer_id uuid references public.profiles (id) on delete set null,
  title text not null,
  description text not null,
  video_url text not null,
  budget integer not null check (budget > 0),
  status text not null default 'open'
    check (status in ('open', 'claimed', 'submitted', 'approved', 'disputed', 'appealed')),
  claimed_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  submission_url text,
  checklist jsonb not null default '{"1":false,"2":false,"3":false,"4":false,"5":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_creator_idx on public.tasks (creator_id);
create index if not exists tasks_optimizer_idx on public.tasks (optimizer_id);

-- New user → profile (role from raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'creator');
  if r not in ('creator', 'optimizer') then
    r := 'creator';
  end if;
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    r,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated
  using (true);

create policy "tasks_insert_creator_self"
  on public.tasks for insert
  to authenticated
  with check (creator_id = auth.uid());

-- Service role used in API routes for controlled updates (bypasses RLS when using service key)

comment on table public.tasks is 'Stripe checkout funds task; optimizer share transferred on approve';
