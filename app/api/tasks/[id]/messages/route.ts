import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { MessageRow } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

const CONTENT_MAX = 8000;

async function assertTaskParticipant(
  taskId: string,
  userId: string
): Promise<{ task: { creator_id: string; optimizer_id: string | null } } | { error: string; status: number }> {
  const admin = createSupabaseAdmin();
  const { data: task, error } = await admin.from("tasks").select("creator_id, optimizer_id").eq("id", taskId).maybeSingle();
  if (error) return { error: error.message, status: 500 };
  if (!task) return { error: "Not found", status: 404 };
  const isCreator = task.creator_id === userId;
  const isOptimizer = task.optimizer_id === userId;
  if (!isCreator && !isOptimizer) return { error: "Forbidden", status: 403 };
  return { task };
}

export async function GET(_request: Request, context: Params) {
  const { id: taskId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await assertTaskParticipant(taskId, user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admin = createSupabaseAdmin();
  const { data: rows, error } = await admin
    .from("messages")
    .select("id, task_id, sender_id, content, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")) {
      return NextResponse.json(
        { error: "Messages table not found. Run migration 006_messages.sql in Supabase." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ messages: (rows ?? []) as MessageRow[] });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: Request, context: Params) {
  const { id: taskId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await assertTaskParticipant(taskId, user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length < 1) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }
  if (content.length > CONTENT_MAX) {
    return NextResponse.json({ error: `Message too long (max ${CONTENT_MAX} characters).` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: inserted, error } = await admin
    .from("messages")
    .insert({
      task_id: taskId,
      sender_id: user.id,
      content,
    })
    .select("id, task_id, sender_id, content, created_at")
    .single();

  if (error) {
    if (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")) {
      return NextResponse.json(
        { error: "Messages table not found. Run migration 006_messages.sql in Supabase." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ message: inserted as MessageRow });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
