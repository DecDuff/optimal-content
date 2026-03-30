import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { optimizerStripeAccountId, platformFeePercent } from "@/lib/env/server";
import { getStripe, optimizerShareCents } from "@/lib/stripe";

/** Connected-account balance for optimizer wallet UI (test Connect account). */
export async function GET() {
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
    return NextResponse.json({ error: "Optimizers only" }, { status: 403 });
  }

  const stripe = getStripe();
  const accountId = optimizerStripeAccountId();

  const feePct = platformFeePercent();
  const { data: awaiting } = await admin
    .from("tasks")
    .select("budget")
    .eq("optimizer_id", user.id)
    .eq("status", "submitted");

  const pendingPayoutCents =
    awaiting?.reduce(
      (sum, row) => sum + optimizerShareCents(row.budget as number, feePct),
      0
    ) ?? 0;

  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    const sum = (arr: { amount: number; currency: string }[], cur: string) =>
      arr.filter((b) => b.currency === cur).reduce((s, b) => s + b.amount, 0);

    const availableUsd = sum(balance.available, "usd");
    const pendingStripeUsd = sum(balance.pending, "usd");

    return NextResponse.json({
      available_cents: availableUsd,
      pending_stripe_cents: pendingStripeUsd,
      pending_payout_cents: pendingPayoutCents,
      currency: "usd",
      stripe_account_id: accountId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Balance error";
    return NextResponse.json(
      {
        error: msg,
        available_cents: 0,
        pending_stripe_cents: 0,
        pending_payout_cents: pendingPayoutCents,
        stripe_account_id: accountId,
      },
      { status: 200 }
    );
  }
}
