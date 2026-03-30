import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidHttpsUrl } from "@/lib/validation";
import { AI_SUBMISSION_REJECT_MESSAGE } from "@/lib/ai/constants";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { verifySubmissionWithAI } from "@/lib/ai/verify-submission";
import type { TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const MAX_URL = 2048;

/** Optimizer resubmits after appeal/dispute → status `submitted` for creator review. */
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
      body = (await request.json()) as { submission_url?: string };
    } catch {
      body = {};
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
      return NextResponse.json({ success: false, error: "Only the assigned optimizer can resubmit" }, { status: 403 });
    }
    if (task.status !== "appealed" && task.status !== "disputed") {
      return NextResponse.json(
        { success: false, error: "Resubmit is only available when the task is appealed or disputed." },
        { status: 400 }
      );
    }

    const trimmed = typeof body.submission_url === "string" ? body.submission_url.trim() : "";
    const submissionUrl = trimmed || (task.submission_url as string | null)?.trim() || "";
    if (!submissionUrl) {
      return NextResponse.json(
        { success: false, error: "Provide a submission_url or ensure the task already has one." },
        { status: 400 }
      );
    }
    if (submissionUrl.length > MAX_URL || !isValidHttpsUrl(submissionUrl)) {
      return NextResponse.json(
        { success: false, error: "submission_url must be a valid http(s) URL." },
        { status: 400 }
      );
    }

    const row = task as TaskRow;
    const aiClient = getOpenAIClient();
    if (aiClient) {
      try {
        const pass = await verifySubmissionWithAI(aiClient, row, submissionUrl);
        if (!pass) {
          return NextResponse.json({ success: false, error: AI_SUBMISSION_REJECT_MESSAGE }, { status: 422 });
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "AI verification is temporarily unavailable. Try again shortly.",
          },
          { status: 503 }
        );
      }
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("tasks")
      .update({
        status: "submitted",
        submission_url: submissionUrl,
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
