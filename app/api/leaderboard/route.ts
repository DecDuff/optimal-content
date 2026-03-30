import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeaderboardRow, LeaderboardTier } from "@/types/leaderboard";

/**
 * Successful completions for ranking. DB uses `approved` after payout; there is no separate `paid` status yet.
 * Extend this array if you add e.g. `paid`.
 */
const COMPLETE_STATUSES = ["approved"] as const;

function tierFromCompletedCount(n: number): LeaderboardTier {
  if (n <= 0) return "new";
  if (n <= 10) return "bronze";
  if (n <= 50) return "silver";
  return "gold";
}

/**
 * Public leaderboard: all optimizers ranked by approved task count.
 * Optional auth enriches `my_*` fields for the current user.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createSupabaseAdmin();

  const { data: optimizers, error: optErr } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("role", "optimizer")
    .order("display_name", { ascending: true });

  if (optErr) return NextResponse.json({ error: optErr.message }, { status: 500 });

  const { data: completedRows, error: taskErr } = await admin
    .from("tasks")
    .select("optimizer_id")
    .in("status", [...COMPLETE_STATUSES])
    .not("optimizer_id", "is", null);

  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });

  const completedByOptimizer = new Map<string, number>();
  for (const r of completedRows ?? []) {
    const oid = r.optimizer_id as string;
    completedByOptimizer.set(oid, (completedByOptimizer.get(oid) ?? 0) + 1);
  }

  type Row = LeaderboardRow;
  const enriched: Row[] = (optimizers ?? []).map((p) => {
    const id = p.id as string;
    const completed_tasks = completedByOptimizer.get(id) ?? 0;
    return {
      rank: 0,
      optimizer_id: id,
      display_name: (p.display_name as string | null)?.trim() || "Optimizer",
      completed_tasks,
      tier: tierFromCompletedCount(completed_tasks),
      is_current_user: user?.id === id,
    };
  });

  enriched.sort((a, b) => {
    if (b.completed_tasks !== a.completed_tasks) return b.completed_tasks - a.completed_tasks;
    return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });
  });

  const rows: Row[] = enriched.map((r, i) => ({ ...r, rank: i + 1 }));

  const myEntry = user ? rows.find((r) => r.is_current_user) : undefined;
  const my_completed_count = myEntry?.completed_tasks ?? 0;
  const my_rank = myEntry?.rank ?? null;
  const is_top_optimizer = Boolean(user && rows.length > 0 && rows[0].is_current_user);

  return NextResponse.json({
    rows,
    my_rank,
    my_completed_count,
    is_top_optimizer,
  });
}
