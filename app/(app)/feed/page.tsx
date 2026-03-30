import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOpenFeedTasks } from "@/lib/feed-data";
import FeedClient from "@/components/feed-client";

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tasks, error } = await fetchOpenFeedTasks(user.id);

  return <FeedClient initialTasks={tasks} fetchError={error} />;
}
