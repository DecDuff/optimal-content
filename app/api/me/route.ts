import { NextResponse } from "next/server";
import { userIsAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const p = profile as ProfileRow | null;
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: p,
    can_access_admin: userIsAdmin(p, user.email),
  });
}
