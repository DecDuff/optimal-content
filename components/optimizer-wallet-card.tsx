"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import { Wallet } from "lucide-react";

type Bal = {
  available_cents: number;
  pending_stripe_cents?: number;
  pending_payout_cents: number;
  /** Sum of optimizer share for approved tasks with a transfer recorded (Supabase). */
  approved_earnings_cents?: number;
  currency: string;
  error?: string;
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

const SPRING: SpringOptions = { stiffness: 280, damping: 22, mass: 0.4 };

async function fetchBalance(): Promise<Bal> {
  const res = await fetch("/api/stripe/balance", { cache: "no-store" });
  const data = (await res.json()) as Bal & { error?: string };
  if (!res.ok) {
    return {
      available_cents: 0,
      pending_stripe_cents: 0,
      pending_payout_cents: 0,
      approved_earnings_cents: 0,
      currency: "usd",
      error: data.error ?? "Wallet unavailable",
    };
  }
  return data;
}

export function OptimizerWalletCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [bal, setBal] = useState<Bal | null>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(0, SPRING);
  const ry = useSpring(0, SPRING);

  const gradient = useMotionTemplate`radial-gradient(120px 120px at ${mx}px ${my}px, rgba(167,139,250,0.22), transparent 55%)`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchBalance();
      if (!cancelled) setBal(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void fetchBalance().then(setBal);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    mx.set(px);
    my.set(py);
    const cx = r.width / 2;
    const cy = r.height / 2;
    ry.set(((px - cx) / cx) * -8);
    rx.set(((py - cy) / cy) * 8);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  const available = bal?.available_cents ?? 0;
  const pendingTotal =
    (bal?.pending_payout_cents ?? 0) + (bal?.pending_stripe_cents ?? 0);
  const approvedDb = bal?.approved_earnings_cents ?? 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/90 via-violet-950/80 to-slate-950/95 p-8 shadow-[0_0_70px_-12px_rgba(99,102,241,0.45)] backdrop-blur-xl"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: gradient }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 via-transparent to-white/[0.07]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/80">
              <Wallet className="h-4 w-4 text-violet-300" strokeWidth={1.25} />
              Optimizer wallet
            </p>
            <p className="mt-1 text-xs text-slate-400">Stripe Connect · test balance</p>
          </div>
        </div>
        {!bal ? (
          <p className="mt-8 text-sm text-slate-500">Syncing wallet…</p>
        ) : (
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Available
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.12)]">
                {fmt(available)}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Stripe Connect · refetches when you return to this tab.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Pending
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-transparent bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text">
                {fmt(pendingTotal)}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Submitted tasks (your share) plus Stripe pending balances.
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Approved earnings (database)
              </p>
              <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-emerald-200/90">
                {fmt(approvedDb)}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Sum of your share on approved tasks with a recorded payout transfer.
              </p>
            </div>
          </div>
        )}
        {bal?.error ? (
          <p className="relative mt-4 text-[11px] text-amber-400/95">{bal.error}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
