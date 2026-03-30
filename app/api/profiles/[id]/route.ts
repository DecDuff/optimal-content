import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

/** Public optimizer profile for Creators (minimal fields). Requires auth. */
export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: row, error } = await admin
    .from("profiles")
    .select("id, role, display_name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row || row.role !== "optimizer") {
    return NextResponse.json({ error: "Optimizer not found" }, { status: 404 });
  }

  const p = row as Pick<ProfileRow, "id" | "role" | "display_name" | "created_at">;
  return NextResponse.json({
    profile: {
      id: p.id,
      role: p.role,
      display_name: p.display_name,
      created_at: p.created_at,
    },
  });
}
