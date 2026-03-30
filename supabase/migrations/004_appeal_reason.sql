-- Creator appeal / dispute feedback when rejecting submitted work
alter table public.tasks add column if not exists appeal_reason text;

comment on column public.tasks.appeal_reason is 'Creator notes when filing an appeal (status appealed).';
