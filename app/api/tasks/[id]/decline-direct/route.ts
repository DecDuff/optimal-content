import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
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
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "optimizer") {
    return NextResponse.json({ error: "Only optimizers can decline a direct request" }, { status: 403 });
  }

  const { data: existing } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const t = existing as TaskRow;
  if (t.status !== "open") {
    return NextResponse.json({ error: "Task is not open" }, { status: 409 });
  }
  if (!t.is_private || t.requested_optimizer_id !== user.id) {
    return NextResponse.json({ error: "Not your direct request" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("tasks")
    .update({
      is_private: false,
      requested_optimizer_id: null,
      expires_at: null,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("status", "open")
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: "Task unavailable" }, { status: 409 });
  }

  return NextResponse.json({ task: updated as TaskRow });
}
