"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useProfilePrefs } from "@/app/context/profile-prefs-context";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ClaimCountdown } from "@/components/claim-countdown";
import { TagCapsulePicker } from "@/components/tag-capsule-picker";
import { AppRouteSkeleton } from "@/components/app-route-skeleton";
import { optimizerPayoutCents } from "@/lib/optimizer-payout";
import type { ProfileRow, TaskRow } from "@/types/database";

type MeResponse = {
  user: { id: string; email: string | undefined } | null;
  profile: ProfileRow | null;
};

const block = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 34 },
  },
};

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function ProfilePage() {
  const { displayName, setDisplayName, bio, bioMax, setBio, tags, toggleTag } = useProfilePrefs();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [optimizerTasks, setOptimizerTasks] = useState<TaskRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = (await res.json()) as MeResponse & { error?: string };
        if (res.ok) setMe(data);

        const tRes = await fetch("/api/tasks?scope=optimizer");
        const tData = await tRes.json();
        if (tRes.ok) setOptimizerTasks(tData.tasks ?? []);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const profile = me?.profile;

  if (!ready) {
    return <AppRouteSkeleton />;
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <motion.div variants={block} initial="hidden" animate="show">
        <AppBreadcrumb
          items={[
            { label: "Optimal Content", href: "/dashboard" },
            { label: "My Profile" },
          ]}
        />
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Account</p>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.03em]">My Profile</h1>
      </motion.div>

      <motion.div
        className="mt-6 space-y-6"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
        }}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={block}
          className="rounded-lg border border-zinc-800/50 bg-white/[0.05] p-4 backdrop-blur-xl"
        >
          <p className="text-[11px] font-medium text-zinc-500">Supabase account</p>
          <p className="mt-2 text-sm text-white">{me?.user?.email ?? "—"}</p>
          {profile ? (
            <p className="mt-1 text-xs capitalize text-zinc-500">
              Role: <span className="text-zinc-300">{profile.role}</span>
              {profile.display_name ? (
                <>
                  {" "}
                  · <span className="text-zinc-300">{profile.display_name}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-400/90">Profile record missing — check Supabase trigger.</p>
          )}
        </motion.div>

        <motion.div
          variants={block}
          className="rounded-lg border border-zinc-800/50 bg-white/[0.05] p-4 backdrop-blur-xl"
        >
          <label htmlFor="display-name" className="text-[11px] font-medium text-zinc-500">
            Local display name (browser)
          </label>
          <p className="mt-0.5 text-[10px] text-zinc-600">Not synced to Supabase yet — for UI drafts only.</p>
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you appear in mock flows"
            className="mt-1.5 w-full rounded-md border border-zinc-800/50 bg-black/30 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm focus:border-[#2E5BFF]/50"
          />
        </motion.div>

        <motion.div
          variants={block}
          className="rounded-lg border border-zinc-800/50 bg-white/[0.05] p-4 backdrop-blur-xl"
        >
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="bio" className="text-[11px] font-medium text-zinc-500">
              Bio
            </label>
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
              {bio.length}/{bioMax}
            </span>
          </div>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            maxLength={bioMax}
            placeholder="Optimizer focus: hooks, pacing, multi-platform…"
            className="mt-2 w-full resize-y rounded-md border border-zinc-800/50 bg-black/30 px-3 py-2.5 text-xs leading-relaxed text-white outline-none backdrop-blur-sm placeholder:text-zinc-600 focus:border-[#2E5BFF]/50"
          />
        </motion.div>

        <motion.div
          variants={block}
          className="rounded-lg border border-zinc-800/50 bg-white/[0.05] p-4 backdrop-blur-xl"
        >
          <p className="text-[11px] font-medium text-zinc-500">Skill tags</p>
          <p className="mt-1 text-[10px] text-zinc-600">Saved locally for future matching features.</p>
          <div className="mt-3">
            <TagCapsulePicker selected={tags} onToggle={toggleTag} />
          </div>
        </motion.div>

        <motion.div variants={block}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">My assigned tasks</h2>
          {optimizerTasks.length === 0 ? (
            <p className="mt-3 max-w-md text-xs text-zinc-500">
              No assignments yet.{" "}
              <Link href="/feed" className="text-[#2E5BFF] underline-offset-2 hover:underline">
                Browse the open feed
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {optimizerTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-zinc-800/50 bg-white/[0.03] p-4 backdrop-blur-xl transition-all hover:border-zinc-800/70 hover:shadow-[0_0_28px_-12px_rgba(46,91,255,0.2)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-zinc-200 hover:text-[#2e5bff]">
                      {task.title}
                    </Link>
                    <span className="font-mono text-sm tabular-nums text-white">
                      {fmtMoney(optimizerPayoutCents(task.budget))}
                    </span>
                  </div>
                  {(task.status === "claimed" || task.status === "submitted") && task.claimed_at ? (
                    <div className="mt-3">
                      <ClaimCountdown claimedAtIso={task.claimed_at} active />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
