import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { TaskRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

function isMockOrTestCharge(chargeId: string) {
  return (
    chargeId.startsWith("ch_fake") ||
    chargeId.startsWith("ch_dev_") ||
    chargeId.startsWith("ch_test_")
  );
}

/** Creator refunds escrow after appeal/dispute when parties cannot agree. */
export async function POST(_request: Request, context: Params) {
  try {
    const { id: taskId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: task, error: fetchErr } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (task.creator_id !== user.id) {
      return NextResponse.json({ success: false, error: "Only the creator can refund" }, { status: 403 });
    }
    if (task.status !== "appealed" && task.status !== "disputed") {
      return NextResponse.json(
        {
          success: false,
          error: "Refund is only available while the task is appealed or disputed.",
        },
        { status: 400 }
      );
    }
    if (!task.stripe_charge_id) {
      return NextResponse.json({ success: false, error: "No charge to refund" }, { status: 400 });
    }
    if (task.stripe_transfer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "A payout was already recorded — refund cannot be completed automatically.",
        },
        { status: 409 }
      );
    }

    const chargeId = task.stripe_charge_id as string;

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
