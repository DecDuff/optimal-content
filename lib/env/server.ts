import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/env/public";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const supabaseUrl = publicSupabaseUrl;
export const supabaseAnonKey = publicSupabaseAnonKey;
export const stripeSecretKey = () => requireEnv("STRIPE_SECRET_KEY");

/** Stripe webhook signing secret — required in production; set in `.env` for local `stripe listen`. */
export function stripeWebhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (v) return v;
  if (process.env.NODE_ENV === "production") {
    throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
  }
  return "";
}
export const supabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");
export const optimizerStripeAccountId = () =>
  requireEnv("NEXT_PUBLIC_TEST_OPTIMIZER_ID");

export const platformFeePercent = () =>
  Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 20);
