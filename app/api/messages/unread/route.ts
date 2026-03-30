import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Body = { lastReadByTask?: Record<string, string> };

const EPOCH = "1970-01-01T00:00:00.000Z";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  const lastReadByTask = body.lastReadByTask && typeof body.lastReadByTask === "object" ? body.lastReadByTask : {};

  const admin = createSupabaseAdmin();
  const { data: tasks, error: taskErr } = await admin
    .from("tasks")
    .select("id")
    .or(`creator_id.eq.${user.id},optimizer_id.eq.${user.id}`)
    .neq("status", "open");

  if (taskErr) {
    if (taskErr.code === "42P01" || taskErr.message?.toLowerCase().includes("does not exist")) {
      return NextResponse.json({ unreadTaskIds: [] });
    }
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }

  const taskIds = (tasks ?? []).map((t) => t.id as string).filter(Boolean);
  if (taskIds.length === 0) {
    const res = NextResponse.json({ unreadTaskIds: [] });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const { data: msgs, error: msgErr } = await admin
    .from("messages")
    .select("task_id, created_at")
    .in("task_id", taskIds)
    .neq("sender_id", user.id);

  if (msgErr) {
    if (msgErr.code === "42P01" || msgErr.message?.toLowerCase().includes("does not exist")) {
      return NextResponse.json({ unreadTaskIds: [] });
    }
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  const latestIncoming = new Map<string, string>();
  for (const m of msgs ?? []) {
    const tid = m.task_id as string;
    const at = m.created_at as string;
    const prev = latestIncoming.get(tid);
    if (!prev || at > prev) latestIncoming.set(tid, at);
  }

  const unreadTaskIds: string[] = [];
  for (const [taskId, createdAt] of latestIncoming) {
    const lastRead = lastReadByTask[taskId] ?? EPOCH;
    if (createdAt > lastRead) unreadTaskIds.push(taskId);
  }

  const res = NextResponse.json({ unreadTaskIds });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
