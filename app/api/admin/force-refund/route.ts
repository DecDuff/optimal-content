import { NextResponse } from "next/server";
import { userIsAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { ProfileRow, TaskRow } from "@/types/database";

function isMockOrTestCharge(chargeId: string) {
  return (
    chargeId.startsWith("ch_fake") ||
    chargeId.startsWith("ch_dev_") ||
    chargeId.startsWith("ch_test_")
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  const p = profile as Pick<ProfileRow, "is_admin"> | null;
  if (!userIsAdmin(p, user.email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let body: { task_id?: string };
  try {
    body = (await request.json()) as { task_id?: string };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = typeof body.task_id === "string" ? body.task_id.trim() : "";
  if (!taskId) {
    return NextResponse.json({ success: false, error: "task_id required" }, { status: 400 });
  }

  const { data: task, error: fetchErr } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const row = task as TaskRow;
  if (row.status !== "appealed" && row.status !== "disputed") {
    return NextResponse.json(
      { success: false, error: "Task must be appealed or disputed for admin force-refund." },
      { status: 400 }
    );
  }
  if (!row.stripe_charge_id) {
    return NextResponse.json({ success: false, error: "No charge to refund" }, { status: 400 });
  }
  if (row.stripe_transfer_id) {
    return NextResponse.json(
      {
        success: false,
        error: "A payout was already recorded — refund cannot be completed automatically.",
      },
      { status: 409 }
    );
  }

  const chargeId = row.stripe_charge_id as string;
  if (!isMockOrTestCharge(chargeId)) {
    const stripe = getStripe();
    try {
      await stripe.refunds.create({ charge: chargeId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe refund failed";
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("tasks")
    .update({ status: "refunded", updated_at: now })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  const res = NextResponse.json({ success: true, task: updated as TaskRow });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
