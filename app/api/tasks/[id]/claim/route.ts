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
    return NextResponse.json({ error: "Only optimizers can claim" }, { status: 403 });
  }

  const { data: existing } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = existing as TaskRow;
  if (t.creator_id === user.id) {
    return NextResponse.json({ error: "You cannot claim your own task" }, { status: 403 });
  }
  if (!t.stripe_charge_id) {
    return NextResponse.json({ error: "Task is not funded yet" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("tasks")
    .update({
      status: "claimed",
      optimizer_id: user.id,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("status", "open")
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: "Task unavailable or already claimed" }, { status: 409 });
  }

  return NextResponse.json({ task: updated as TaskRow });
}
