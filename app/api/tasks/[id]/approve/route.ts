import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { optimizerStripeAccountId, platformFeePercent } from "@/lib/env/server";
import { getStripe, optimizerShareCents } from "@/lib/stripe";
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
  const { data: task } = await admin.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the creator can approve" }, { status: 403 });
  }
  if (task.status !== "submitted") {
    return NextResponse.json({ error: "Task must be submitted first" }, { status: 400 });
  }
  if (!task.stripe_charge_id) {
    return NextResponse.json({ error: "Missing payment charge on task" }, { status: 400 });
  }
  if (task.stripe_transfer_id) {
    return NextResponse.json({ error: "Already paid out" }, { status: 400 });
  }

  const feePct = platformFeePercent();
  const row = task as TaskRow;
  const transferAmount = optimizerShareCents(row.budget, feePct);
  if (transferAmount < 1) {
    return NextResponse.json({ error: "Transfer amount too small" }, { status: 400 });
  }

  const stripe = getStripe();
  const destination = optimizerStripeAccountId();

  try {
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: "usd",
      destination,
      source_transaction: task.stripe_charge_id,
      metadata: {
        task_id: taskId,
        platform_fee_percent: String(feePct),
      },
    });

    const now = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("tasks")
      .update({
        status: "approved",
        stripe_transfer_id: transfer.id,
        updated_at: now,
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      task: updated as TaskRow,
      transfer: {
        id: transfer.id,
        amount_cents: transferAmount,
        destination,
        platform_kept_cents: row.budget - transferAmount,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe transfer failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
