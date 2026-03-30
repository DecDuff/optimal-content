"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/env/public";

export function createSupabaseBrowserClient() {
  return createBrowserClient(publicSupabaseUrl(), publicSupabaseAnonKey());
}
