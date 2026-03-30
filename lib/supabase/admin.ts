import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env/server";

/** Service role — server-only. Bypasses RLS. */
export function createSupabaseAdmin() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
