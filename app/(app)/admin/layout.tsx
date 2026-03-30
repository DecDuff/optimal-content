import { redirect } from "next/navigation";
import { userIsAdmin } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

export default async function AdminSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  const p = profile as Pick<ProfileRow, "is_admin"> | null;
  if (!userIsAdmin(p, user.email)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
