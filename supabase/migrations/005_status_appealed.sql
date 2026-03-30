-- Allow creator appeal outcome as distinct status
alter table public.tasks drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'claimed', 'submitted', 'approved', 'disputed', 'appealed'));

comment on column public.tasks.appeal_reason is 'Creator feedback when status is appealed (or legacy disputed).';
