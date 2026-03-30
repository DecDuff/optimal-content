import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/types/database";

/** Funded, open jobs from other creators (RLS: authenticated read). */
export async function fetchOpenFeedTasks(userId: string): Promise<{ tasks: TaskRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .neq("creator_id", userId)
    .not("stripe_charge_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { tasks: [], error: error.message };
  }
  return { tasks: (data ?? []) as TaskRow[], error: null };
}
