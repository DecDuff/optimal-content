import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeaderboardRow } from "@/types/leaderboard";

/** Rank optimizers by number of tasks they have claimed (any post-claim status). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: tasks, error: tasksErr } = await admin
    .from("tasks")
    .select("optimizer_id")
    .not("optimizer_id", "is", null);

  if (tasksErr) return NextResponse.json({ error: tasksErr.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const row of tasks ?? []) {
    const oid = row.optimizer_id as string;
    counts.set(oid, (counts.get(oid) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const ids = sorted.map(([id]) => id);
  if (ids.length === 0) {
    return NextResponse.json({
      rows: [] as LeaderboardRow[],
      my_rank: null,
      my_claim_count: 0,
      is_top_optimizer: false,
    });
  }

  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("id, display_name, role")
    .in("id", ids);

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.id, p.display_name?.trim() || "Optimizer");
  }

  const rows: LeaderboardRow[] = sorted.map(([optimizer_id, claims], i) => ({
    rank: i + 1,
    optimizer_id,
    display_name: nameById.get(optimizer_id) ?? "Optimizer",
    claims,
    is_current_user: optimizer_id === user.id,
  }));

  const myEntry = rows.find((r) => r.is_current_user);
  const my_claim_count = myEntry?.claims ?? 0;
  const my_rank = myEntry?.rank ?? null;
  const is_top_optimizer = rows.length > 0 && rows[0].is_current_user;

  return NextResponse.json({
    rows,
    my_rank,
    my_claim_count,
    is_top_optimizer,
  });
}
