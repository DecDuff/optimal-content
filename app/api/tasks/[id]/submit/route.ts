import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidHttpsUrl } from "@/lib/validation";
import type { ChecklistState, TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const KEYS: (keyof ChecklistState)[] = ["1", "2", "3", "4", "5"];

const MAX_URL = 2048;

/** Optimizer submits checklist + deliverable URL → status `submitted`. */
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

    let body: { submission_url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const submissionUrl = typeof body.submission_url === "string" ? body.submission_url.trim() : "";
    if (!submissionUrl) {
      return NextResponse.json({ success: false, error: "submission_url is required" }, { status: 400 });
    }
    if (submissionUrl.length > MAX_URL) {
      return NextResponse.json({ success: false, error: "submission_url is too long" }, { status: 400 });
    }
    if (!isValidHttpsUrl(submissionUrl)) {
      return NextResponse.json(
        { success: false, error: "submission_url must be a valid http(s) URL" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();
    const { data: task, error: fetchErr } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (task.optimizer_id !== user.id) {
      return NextResponse.json({ success: false, error: "Not your task" }, { status: 403 });
    }
    if (task.status !== "claimed") {
      return NextResponse.json({ success: false, error: "Invalid state" }, { status: 400 });
    }

    const c = (task.checklist ?? {}) as ChecklistState;
    const allDone = KEYS.every((k) => c[k] === true);
    if (!allDone) {
      return NextResponse.json(
        { success: false, error: "Complete all 5 checklist items before submitting" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("tasks")
      .update({
        status: "submitted",
        submission_url: submissionUrl,
        updated_at: now,
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: updated as TaskRow });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
