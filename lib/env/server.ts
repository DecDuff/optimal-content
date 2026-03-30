import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/env/public";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const supabaseUrl = publicSupabaseUrl;
export const supabaseAnonKey = publicSupabaseAnonKey;
export const stripeSecretKey = () => requireEnv("STRIPE_SECRET_KEY");
/** Default supports local Stripe CLI / dummy config; override in production. */
export const stripeWebhookSecret = () =>
  process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_12345";
export const supabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");
export const optimizerStripeAccountId = () =>
  requireEnv("NEXT_PUBLIC_TEST_OPTIMIZER_ID");

export const platformFeePercent = () =>
  Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 20);
