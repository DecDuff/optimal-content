-- Task-scoped direct messages between creator and assigned optimizer
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 8000),
  created_at timestamptz not null default now()
);

create index if not exists messages_task_created_idx
  on public.messages (task_id, created_at asc);

alter table public.messages enable row level security;

create policy "messages_select_participants"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = messages.task_id
        and (t.creator_id = auth.uid() or t.optimizer_id = auth.uid())
    )
  );

create policy "messages_insert_participants"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.creator_id = auth.uid() or t.optimizer_id = auth.uid())
    )
  );

comment on table public.messages is 'DM thread per task; visible to creator and optimizer only';
