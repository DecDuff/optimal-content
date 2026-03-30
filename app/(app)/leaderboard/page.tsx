"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { usePostJobModal } from "@/contexts/post-job-modal-context";
import { useSessionProfile } from "@/hooks/use-session-profile";
import type { LeaderboardRow, LeaderboardTier } from "@/types/leaderboard";

function TierBadge({ tier }: { tier: LeaderboardTier }) {
  const styles: Record<LeaderboardTier, string> = {
    new: "border-zinc-600/50 bg-zinc-500/10 text-zinc-400",
    bronze: "border-amber-700/45 bg-amber-900/25 text-amber-200/95",
    silver: "border-slate-400/45 bg-slate-400/10 text-slate-200",
    gold: "border-amber-400/55 bg-gradient-to-r from-amber-500/20 to-yellow-600/15 text-amber-100",
  };
  const labels: Record<LeaderboardTier, string> = {
    new: "New",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
  };
  return (
    <span
      className={`ml-2 inline-flex rounded-md border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] ${styles[tier]}`}
    >
      {labels[tier]}
    </span>
  );
}

export default function LeaderboardPage() {
  const { profile } = useSessionProfile();
  const { openDirectRequest } = usePostJobModal();
  const isCreator = profile?.role === "creator";
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myCompleted, setMyCompleted] = useState(0);
  const [isTopOptimizer, setIsTopOptimizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows ?? []);
        setMyRank(data.my_rank ?? null);
        setMyCompleted(data.my_completed_count ?? 0);
        setIsTopOptimizer(Boolean(data.is_top_optimizer));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: "Optimal Content", href: "/dashboard" },
          { label: "Leaderboard" },
        ]}
      />
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Optimizers</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <h1 className="text-lg font-semibold tracking-[-0.03em]">Leaderboard</h1>
        {isTopOptimizer ? (
          <span className="rounded-md border border-[#2E5BFF]/50 bg-[#2E5BFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E5BFF]">
            Top optimizer
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-lg text-xs text-zinc-500">
        Public rank by successfully completed jobs (approved deliveries). Tiers: Bronze 1–10 · Silver 11–50 · Gold
        51+.
        {profile ? (
          <>
            {" "}
            Your row:{" "}
            <span className="font-mono text-zinc-300 tabular-nums">{myCompleted}</span> completed
            {myRank !== null ? (
              <>
                {" "}
                · Rank <span className="font-mono text-zinc-300 tabular-nums">#{myRank}</span>
              </>
            ) : null}
            .
          </>
        ) : (
          <> Sign in to see your rank.</>
        )}
      </p>

      {loading ? (
        <div
          className="mt-4 animate-pulse overflow-hidden rounded-lg border border-zinc-800/50"
          aria-busy="true"
          aria-label="Loading leaderboard"
        >
          <div className="h-9 bg-white/5" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-11 border-t border-white/[0.04] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800/50">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 backdrop-blur-sm">
                <th className="px-3 py-2 font-medium">Rank</th>
                <th className="px-3 py-2 font-medium">Optimizer</th>
                <th className="px-3 py-2 font-medium text-center">Tier</th>
                <th className="px-3 py-2 font-medium text-right">Done</th>
                {isCreator ? (
                  <th className="px-3 py-2 font-medium text-right">Request</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="font-mono text-[11px] text-zinc-300">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isCreator ? 5 : 4}
                    className="px-3 py-8 text-center font-sans text-zinc-500"
                  >
                    No optimizers yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.optimizer_id}
                    className={`border-b border-zinc-800/50 transition-colors last:border-b-0 ${
                      row.is_current_user
                        ? "bg-[#2E5BFF]/10 hover:bg-[#2E5BFF]/15"
                        : "bg-black/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-3 py-2.5 align-middle tabular-nums text-zinc-400">{row.rank}</td>
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/optimizers/${row.optimizer_id}`}
                        className="font-sans text-xs text-zinc-200 underline-offset-2 hover:text-violet-300 hover:underline"
                      >
                        {row.display_name}
                      </Link>
                      {row.is_current_user && row.rank === 1 ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2E5BFF]">
                          Top
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-center">
                      <TierBadge tier={row.tier} />
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right tabular-nums text-white">
                      {row.completed_tasks}
                    </td>
                    {isCreator ? (
                      <td className="px-3 py-2.5 align-middle text-right">
                        {profile?.id === row.optimizer_id ? (
                          <span className="font-sans text-[10px] text-zinc-600">—</span>
                        ) : (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              openDirectRequest({
                                optimizerId: row.optimizer_id,
                                displayName: row.display_name || "Optimizer",
                              })
                            }
                            className="rounded-lg border border-indigo-500/45 bg-indigo-500/10 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-indigo-200 transition hover:bg-indigo-500/20"
                          >
                            Request
                          </motion.button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
