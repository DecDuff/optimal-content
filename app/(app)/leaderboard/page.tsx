"use client";

import { useEffect, useState } from "react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import type { LeaderboardRow } from "@/types/leaderboard";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myClaimCount, setMyClaimCount] = useState(0);
  const [isTopOptimizer, setIsTopOptimizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows ?? []);
        setMyRank(data.my_rank ?? null);
        setMyClaimCount(data.my_claim_count ?? 0);
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
        Ranked by claimed tasks (all statuses after claim). Your session:{" "}
        <span className="font-mono text-zinc-300 tabular-nums">{myClaimCount}</span> claimed
        {myRank !== null ? (
          <>
            {" "}
            · Rank <span className="font-mono text-zinc-300 tabular-nums">#{myRank}</span>
          </>
        ) : null}
        .
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800/50">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 backdrop-blur-sm">
                <th className="px-3 py-2 font-medium">Rank</th>
                <th className="px-3 py-2 font-medium">Optimizer</th>
                <th className="px-3 py-2 font-medium text-right">Claims</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px] text-zinc-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center font-sans text-zinc-500">
                    No claims yet.
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
                      <span className="font-sans text-xs text-zinc-200">{row.display_name}</span>
                      {row.is_current_user && row.rank === 1 ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2E5BFF]">
                          Top
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right tabular-nums text-white">{row.claims}</td>
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
