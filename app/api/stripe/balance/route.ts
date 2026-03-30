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

  const { data: approvedRows } = await admin
    .from("tasks")
    .select("budget")
    .eq("optimizer_id", user.id)
    .eq("status", "approved")
    .not("stripe_transfer_id", "is", null);

  const approvedEarningsCents =
    approvedRows?.reduce(
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

    const res = NextResponse.json({
      available_cents: availableUsd,
      pending_stripe_cents: pendingStripeUsd,
      pending_payout_cents: pendingPayoutCents,
      approved_earnings_cents: approvedEarningsCents,
      currency: "usd",
      stripe_account_id: accountId,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Balance error";
    const res = NextResponse.json(
      {
        error: msg,
        available_cents: 0,
        pending_stripe_cents: 0,
        pending_payout_cents: pendingPayoutCents,
        approved_earnings_cents: approvedEarningsCents,
        stripe_account_id: accountId,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
