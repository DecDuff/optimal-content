import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Development-only: mark a task as funded without Stripe webhook (localhost testing).
 */
export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, error: "Payment simulation is only available in development mode." },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { task_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json({ success: false, error: "task_id is required" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: task, error: fetchErr } = await admin
      .from("tasks")
      .select("id, creator_id, status, stripe_charge_id")
      .eq("id", taskId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }
    if (task.creator_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only the task creator can simulate payment" }, { status: 403 });
    }
    if (task.status !== "open") {
      return NextResponse.json({ success: false, error: "Task must be open to simulate payment" }, { status: 400 });
    }
    if (task.stripe_charge_id) {
      return NextResponse.json({ success: false, error: "Task already has a charge recorded" }, { status: 400 });
    }

    const suffix = crypto.randomUUID().slice(0, 8);
    const chargeId = `ch_dev_${suffix}`;
    const piId = `pi_dev_${suffix}`;

    const { error: updateErr } = await admin
      .from("tasks")
      .update({
        stripe_payment_intent_id: piId,
        stripe_charge_id: chargeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stripe_charge_id: chargeId,
      stripe_payment_intent_id: piId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
