import { NextResponse } from "next/server";
import { userIsAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { MessageRow, ProfileRow, TaskRow } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  const p = profile as Pick<ProfileRow, "is_admin"> | null;
  if (!userIsAdmin(p, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: tasks, error: tasksErr } = await admin
    .from("tasks")
    .select("*")
    .in("status", ["appealed", "disputed"])
    .order("updated_at", { ascending: false });

  if (tasksErr) {
    return NextResponse.json({ error: tasksErr.message }, { status: 500 });
  }

  const taskList = (tasks ?? []) as TaskRow[];
  const taskIds = taskList.map((t) => t.id);
  const userIds = new Set<string>();
  for (const t of taskList) {
    userIds.add(t.creator_id);
    if (t.optimizer_id) userIds.add(t.optimizer_id);
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, role")
    .in("id", [...userIds]);

  const nameById = new Map<string, string>();
  for (const row of profiles ?? []) {
    const r = row as { id: string; display_name: string | null; role: string };
    nameById.set(r.id, r.display_name?.trim() || r.role || "User");
  }

  let messagesByTask: Record<string, MessageRow[]> = {};
  if (taskIds.length > 0) {
    const { data: messages, error: msgErr } = await admin
      .from("messages")
      .select("id, task_id, sender_id, content, created_at")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true });

    if (msgErr) {
      if (!msgErr.message?.toLowerCase().includes("does not exist")) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }
    } else {
      messagesByTask = {};
      for (const m of (messages ?? []) as MessageRow[]) {
        const list = messagesByTask[m.task_id] ?? [];
        list.push(m);
        messagesByTask[m.task_id] = list;
      }
    }
  }

  const res = NextResponse.json({
    tasks: taskList,
    display_names: Object.fromEntries(nameById),
    messages_by_task: messagesByTask,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
