import type { ProfileRow } from "@/types/database";

export function adminEmailAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminEmailAllowlist();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

export function profileIsAdmin(profile: Pick<ProfileRow, "is_admin"> | null | undefined): boolean {
  return profile?.is_admin === true;
}

export function userIsAdmin(
  profile: Pick<ProfileRow, "is_admin"> | null | undefined,
  email: string | null | undefined
): boolean {
  return profileIsAdmin(profile) || isAllowlistedAdminEmail(email);
}
