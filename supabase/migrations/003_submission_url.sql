-- Deliverable link after optimizer submits work
alter table public.tasks add column if not exists submission_url text;

comment on column public.tasks.submission_url is 'Report, doc, or asset URL set when status becomes submitted';
