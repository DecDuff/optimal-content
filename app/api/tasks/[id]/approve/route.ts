import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { payoutOptimizerForTask } from "@/lib/task-optimizer-payout";
import type { TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const { id: taskId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the creator can approve" }, { status: 403 });
  }
  if (task.status !== "submitted") {
    return NextResponse.json({ error: "Task must be submitted first" }, { status: 400 });
  }

  const row = task as TaskRow;
  const result = await payoutOptimizerForTask(admin, taskId, row);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    task: result.data.task,
    transfer: result.data.transfer,
  });
}
