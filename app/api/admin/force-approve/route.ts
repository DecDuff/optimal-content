import { NextResponse } from "next/server";
import { userIsAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { payoutOptimizerForTask } from "@/lib/task-optimizer-payout";
import type { ProfileRow, TaskRow } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .maybeSingle();

  const p = profile as Pick<ProfileRow, "is_admin" | "role"> | null;
  if (!userIsAdmin(p, user.email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let body: { task_id?: string };
  try {
    body = (await request.json()) as { task_id?: string };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = typeof body.task_id === "string" ? body.task_id.trim() : "";
  if (!taskId) {
    return NextResponse.json({ success: false, error: "task_id required" }, { status: 400 });
  }

  const { data: task, error: fetchErr } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const t = task as TaskRow;
  if (t.status !== "appealed" && t.status !== "disputed") {
    return NextResponse.json(
      { success: false, error: "Task must be appealed or disputed for admin force-approve." },
      { status: 400 }
    );
  }
  if (!t.optimizer_id) {
    return NextResponse.json({ success: false, error: "Task has no assigned optimizer" }, { status: 400 });
  }

  const result = await payoutOptimizerForTask(admin, taskId, t);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    task: result.data.task,
    transfer: result.data.transfer,
  });
}
