import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ChecklistState, TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const KEYS = ["1", "2", "3", "4", "5"] as const;

export async function PATCH(request: Request, context: Params) {
  const { id: taskId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { checklist?: Partial<ChecklistState> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.checklist) {
    return NextResponse.json({ error: "checklist required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.optimizer_id !== user.id) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }
  if (task.status !== "claimed") {
    return NextResponse.json({ error: "Task must be in claimed state" }, { status: 400 });
  }

  const prev = (task.checklist ?? {}) as Record<string, boolean>;
  const next: ChecklistState = { ...prev } as ChecklistState;
  for (const k of KEYS) {
    if (k in body.checklist!) {
      next[k] = Boolean(body.checklist![k]);
    }
  }

  const { data: updated, error } = await admin
    .from("tasks")
    .update({ checklist: next, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: updated as TaskRow });
}
