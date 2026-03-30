import { optimizerStripeAccountId, platformFeePercent } from "@/lib/env/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, optimizerShareCents } from "@/lib/stripe";
import type { TaskRow } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

export type PayoutSuccess = {
  task: TaskRow;
  transfer: {
    id: string;
    amount_cents: number;
    destination: string;
    platform_kept_cents: number;
    mock?: boolean;
  };
};

/**
 * Moves task to approved and records an optimizer transfer (mock or Stripe Connect).
 * Caller must enforce authorization and task state.
 */
export async function payoutOptimizerForTask(
  admin: AdminClient,
  taskId: string,
  task: TaskRow
): Promise<{ ok: true; data: PayoutSuccess } | { ok: false; error: string; status: number }> {
  if (!task.stripe_charge_id) {
    return { ok: false, error: "Missing payment charge on task", status: 400 };
  }
  if (task.stripe_transfer_id) {
    return { ok: false, error: "Already paid out", status: 400 };
  }

  const feePct = platformFeePercent();
  const transferAmount = optimizerShareCents(task.budget, feePct);
  if (transferAmount < 1) {
    return { ok: false, error: "Transfer amount too small", status: 400 };
  }

  const chargeId = task.stripe_charge_id as string;
  const skipRealTransfer =
    chargeId.startsWith("ch_fake") ||
    chargeId.startsWith("ch_dev_") ||
    chargeId.startsWith("ch_test_");

  const now = new Date().toISOString();
  const row = task;

  if (skipRealTransfer) {
    const mockTransferId = `tr_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const { data: updated, error } = await admin
      .from("tasks")
      .update({
        status: "approved",
        stripe_transfer_id: mockTransferId,
        updated_at: now,
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message, status: 500 };

    return {
      ok: true,
      data: {
        task: updated as TaskRow,
        transfer: {
          id: mockTransferId,
          amount_cents: transferAmount,
          destination: optimizerStripeAccountId(),
          platform_kept_cents: row.budget - transferAmount,
          mock: true,
        },
      },
    };
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

    if (error) return { ok: false, error: error.message, status: 500 };

    return {
      ok: true,
      data: {
        task: updated as TaskRow,
        transfer: {
          id: transfer.id,
          amount_cents: transferAmount,
          destination,
          platform_kept_cents: row.budget - transferAmount,
        },
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe transfer failed";
    return { ok: false, error: msg, status: 502 };
  }
}
