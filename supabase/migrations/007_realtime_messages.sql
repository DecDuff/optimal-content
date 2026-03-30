-- Enable Realtime for task messages (Supabase Dashboard → Database → Replication may also show this)
alter publication supabase_realtime add table public.messages;
