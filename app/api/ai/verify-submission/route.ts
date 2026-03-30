import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidHttpsUrl } from "@/lib/validation";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { verifySubmissionWithAI } from "@/lib/ai/verify-submission";
import type { TaskRow } from "@/types/database";
import { AI_SUBMISSION_REJECT_MESSAGE } from "@/lib/ai/constants";

export const runtime = "nodejs";

type Body = { task_id?: string; submission_url?: string };

/**
 * Standalone check for a deliverable URL against a task (optimizer must be assigned).
 * When OPENAI_API_KEY is unset, returns pass: true (dev fallback).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const taskId = typeof body.task_id === "string" ? body.task_id.trim() : "";
    const submissionUrl = typeof body.submission_url === "string" ? body.submission_url.trim() : "";
    if (!taskId || !submissionUrl) {
      return NextResponse.json(
        { success: false, error: "task_id and submission_url are required" },
        { status: 400 }
      );
    }
    if (!isValidHttpsUrl(submissionUrl)) {
      return NextResponse.json(
        { success: false, error: "submission_url must be a valid https URL" },
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

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json({ success: true, pass: true, skipped: true });
    }

    const row = task as TaskRow;
    let pass: boolean;
    try {
      pass = await verifySubmissionWithAI(client, row, submissionUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: "AI verification is temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    if (!pass) {
      return NextResponse.json(
        { success: false, pass: false, error: AI_SUBMISSION_REJECT_MESSAGE },
        { status: 422 }
      );
    }

    const res = NextResponse.json({ success: true, pass: true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
