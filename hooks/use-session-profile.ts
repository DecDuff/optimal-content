"use client";

import { useEffect, useState } from "react";
import type { ProfileRow } from "@/types/database";

export function useSessionProfile() {
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          if (!cancelled) setProfile(null);
          return;
        }
        const data = (await res.json()) as { profile: ProfileRow | null };
        if (!cancelled) setProfile(data.profile);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, role: profile?.role };
}
