import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const REASON_MIN = 8;
const REASON_MAX = 4_000;

export async function POST(request: Request, context: Params) {
  try {
    const { id: taskId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { reason?: string };
    try {
      body = (await request.json()) as { reason?: string };
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < REASON_MIN) {
      return NextResponse.json(
        { success: false, error: `Appeal reason must be at least ${REASON_MIN} characters.` },
        { status: 400 }
      );
    }
    if (reason.length > REASON_MAX) {
      return NextResponse.json({ success: false, error: "Appeal reason is too long." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: task, error: fetchErr } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (task.creator_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only the creator can file an appeal" }, { status: 403 });
    }
    if (task.status !== "submitted") {
      return NextResponse.json(
        { success: false, error: "You can only appeal while the task is awaiting your review." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("tasks")
      .update({
        status: "appealed",
        appeal_reason: reason,
        updated_at: now,
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: updated as TaskRow });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
