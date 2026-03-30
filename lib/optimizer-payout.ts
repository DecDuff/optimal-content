/**
 * Client- and server-safe payout math (mirrors {@link optimizerShareCents} in `lib/stripe`).
 * Uses `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` — optimizer receives (100 - fee)% of gross budget.
 */
export function readPlatformFeePercent(): number {
  const n = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 20);
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(0, n));
}

export function optimizerPayoutCents(budgetCents: number, platformFeePercent = readPlatformFeePercent()): number {
  const pct = Math.min(100, Math.max(0, platformFeePercent));
  return Math.floor((budgetCents * (100 - pct)) / 100);
}
