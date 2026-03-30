-- End state when creator refunds after appeal/dispute
alter table public.tasks drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in (
    'open',
    'claimed',
    'submitted',
    'approved',
    'disputed',
    'appealed',
    'awaiting_checkout',
    'refunded'
  ));

comment on column public.tasks.status is 'Task lifecycle; refunded = charge refunded to creator (appeal/dispute resolution).';
