import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { TaskRow } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { id: taskId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: task, error } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = task as TaskRow;
  const isCreator = row.creator_id === user.id;
  const isOptimizer = row.optimizer_id === user.id;
  const isOpenListing = row.status === "open";

  if (!isCreator && !isOptimizer && !isOpenListing) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = NextResponse.json({ task: row });
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return res;
}
