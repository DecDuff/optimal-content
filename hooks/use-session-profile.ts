"use client";

import { useEffect, useState } from "react";
import type { ProfileRow } from "@/types/database";

export function useSessionProfile() {
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          if (!cancelled) {
            setProfile(null);
            setCanAccessAdmin(false);
          }
          return;
        }
        const data = (await res.json()) as { profile: ProfileRow | null; can_access_admin?: boolean };
        if (!cancelled) {
          setProfile(data.profile);
          setCanAccessAdmin(Boolean(data.can_access_admin));
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setCanAccessAdmin(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, role: profile?.role, canAccessAdmin };
}
