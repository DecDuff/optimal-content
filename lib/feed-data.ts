import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/types/database";

/** Open jobs from other creators. Unfunded rows still appear so new posts are visible before checkout clears. */
export async function fetchOpenFeedTasks(userId: string): Promise<{ tasks: TaskRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .eq("is_private", false)
    .neq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { tasks: [], error: error.message };
  }
  return { tasks: (data ?? []) as TaskRow[], error: null };
}
