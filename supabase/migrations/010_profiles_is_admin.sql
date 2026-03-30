alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is 'Platform staff; may access admin APIs and disputes dashboard when true';

create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;
