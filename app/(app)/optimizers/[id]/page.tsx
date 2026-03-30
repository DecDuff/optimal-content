"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { UserRound, Loader2 } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { usePostJobModal } from "@/contexts/post-job-modal-context";
import { useSessionProfile } from "@/hooks/use-session-profile";

type PublicProfile = {
  id: string;
  role: string;
  display_name: string | null;
  created_at: string;
};

export default function OptimizerPublicPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { profile: sessionProfile, loading: sessionLoading } = useSessionProfile();
  const { openDirectRequest } = usePostJobModal();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid profile");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/profiles/${id}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setProfile(null);
            setError(data.error ?? "Not found");
          }
          return;
        }
        if (!cancelled) setProfile(data.profile as PublicProfile);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setError("Network error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayName = profile?.display_name?.trim() || "Optimizer";
  const isCreator = sessionProfile?.role === "creator";
  const isSelf = sessionProfile?.id === id;

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: "Optimal Content", href: "/dashboard" },
          { label: "Leaderboard", href: "/leaderboard" },
          { label: displayName },
        ]}
      />

      {loading || sessionLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading profile…
        </div>
      ) : error ? (
        <p className="mt-10 text-sm text-rose-400">{error}</p>
      ) : profile ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 max-w-lg"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <UserRound className="h-7 w-7 text-violet-300/90" strokeWidth={1.25} />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Optimizer
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{displayName}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Hire this optimizer with a funded direct request. They have 24 hours to accept after you pay.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isCreator && !isSelf ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  openDirectRequest({ optimizerId: profile.id, displayName })
                }
                className="rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_36px_-10px_rgba(99,102,241,0.5)]"
              >
                Request this optimizer
              </motion.button>
            ) : null}
            {isSelf ? (
              <p className="text-sm text-slate-500">This is your public optimizer profile.</p>
            ) : null}
            {!isCreator && sessionProfile ? (
              <p className="text-sm text-slate-500">Switch to a creator account to send a direct request.</p>
            ) : null}
            <Link
              href="/leaderboard"
              className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/15"
            >
              Back to leaderboard
            </Link>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
