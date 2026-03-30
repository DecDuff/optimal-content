"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#020617] text-slate-200">
      <div className="pointer-events-none absolute inset-0 gate-grid opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-[min(72vh,640px)] w-[min(140vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E5BFF]/18 blur-[100px] gate-radial-glow" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(46,91,255,0.09),transparent)]" />

      <motion.div
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Optimal Content</p>
        <h1 className="mt-6 max-w-4xl text-center text-5xl font-semibold tracking-tighter sm:text-6xl md:text-7xl lg:text-[5.25rem] lg:leading-[0.98]">
          Maximum Retention. Minimum Effort.
        </h1>
        <p className="mt-5 max-w-lg text-center text-sm leading-relaxed text-zinc-500">
          Creators escrow budgets with Stripe. Optimizers deliver hook, pacing, and CTR fixes — paid on approval.
        </p>

        <div className="mt-12 w-full max-w-sm rounded-lg border border-zinc-800/50 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Enter</p>
          <div className="mt-4 flex flex-col gap-2.5">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-md border border-zinc-800/50 bg-black/30 px-4 py-3 text-xs font-medium text-white backdrop-blur-sm transition hover:border-zinc-700/50 hover:bg-zinc-900/40"
              >
                Sign in
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-md border border-[#2E5BFF]/40 bg-[#2E5BFF]/15 px-4 py-3 text-xs font-medium text-white backdrop-blur-sm transition hover:border-[#2E5BFF]/60 hover:bg-[#2E5BFF]/25"
              >
                Create account
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
