import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/env/server";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(stripeSecretKey(), {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/** Optimizer payout = budget * (100 - platformFee) / 100 */
export function optimizerShareCents(budgetCents: number, platformFeePercent: number): number {
  const pct = Math.min(100, Math.max(0, platformFeePercent));
  return Math.floor((budgetCents * (100 - pct)) / 100);
}
