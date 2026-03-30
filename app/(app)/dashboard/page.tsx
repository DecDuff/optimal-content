"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { DashboardPostOpener } from "@/components/dashboard-post-opener";
import { OptimizerWalletCard } from "@/components/optimizer-wallet-card";
import { usePostJobModal } from "@/contexts/post-job-modal-context";
import { useSessionProfile } from "@/hooks/use-session-profile";
import { useUnreadTaskMessages } from "@/hooks/use-unread-task-messages";
import { optimizerPayoutCents } from "@/lib/optimizer-payout";
import type { TaskRow, TaskStatus } from "@/types/database";

export const dynamic = 'force-dynamic';

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function statusStyle(s: TaskStatus): string {
  switch (s) {
    case "open":
      return "border-emerald-500/35 text-emerald-300/90";
    case "claimed":
      return "border-violet-500/40 text-violet-300";
    case "submitted":
      return "border-amber-500/40 text-amber-300/90";
    case "approved":
      return "border-slate-600 text-slate-400";
    case "disputed":
      return "border-red-500/40 text-red-400/90";
    case "appealed":
      return "border-orange-500/40 text-orange-300/90";
    default:
      return "border-slate-700 text-slate-500";
  }
}

function DashboardContent() {
  const { openPostJob } = usePostJobModal();
  const { profile, loading: profileLoading } = useSessionProfile();
  const { unreadTaskIds } = useUnreadTaskMessages();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!profile) {
      setLoadingTasks(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const scope = profile.role === "creator" ? "mine" : "optimizer";
      // 👇 ADDED CACHE: 'NO-STORE' HERE
      const res = await fetch(`/api/tasks?scope=${scope}`, { cache: 'no-store' });
      const data = await res.json();
      if (!cancelled && res.ok) setTasks(data.tasks ?? []);
      if (!cancelled) setLoadingTasks(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  async function resumeCheckout(taskId: string) {
    setPayingId(taskId);
    try {
      const pay = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const checkout = await pay.json();
      if (pay.ok && checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      toast.error(checkout.error ?? "Checkout failed");
    } finally {
      setPayingId(null);
    }
  }

  async function simulatePayment(taskId: string) {
    setSimulatingId(taskId);
    try {
      const res = await fetch("/api/stripe/dev-simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Simulation failed");
        return;
      }
      toast.success("Payment simulated — job is now funded.");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, stripe_charge_id: data.stripe_charge_id, stripe_payment_intent_id: data.stripe_payment_intent_id }
            : t
        )
      );
    } catch {
      toast.error("Network error");
    } finally {
      setSimulatingId(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb items={[{ label: "Optimal Content", href: "/dashboard" }, { label: "Dashboard" }]} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="mt-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1 backdrop-blur-lg">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Command center
          </span>
        </div>
        <h1 className="mt-4 bg-gradient-to-br from-white via-indigo-100 to-violet-200/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          Dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          {profile?.role === "creator"
            ? "Create funded jobs, track delivery, and release payouts when work is submitted."
            : "Monitor your wallet, browse the job feed, and ship on the 24h clock."}
        </p>
      </motion.div>

      {profileLoading ? (
        <div className="mt-12 flex justify-center">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border border-white/10 bg-slate-900/50" />
            <div className="absolute inset-0 animate-pulse rounded-full border-2 border-violet-500/30 border-t-violet-400" />
          </div>
        </div>
      ) : profile?.role === "optimizer" ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-10 space-y-8"
        >
          <OptimizerWalletCard />
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/45 bg-gradient-to-r from-indigo-600/25 to-violet-600/20 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-12px_rgba(99,102,241,0.45)] backdrop-blur-md transition hover:from-indigo-600/35 hover:to-violet-600/28"
          >
            <Briefcase className="h-4 w-4" strokeWidth={1.5} />
            Browse job feed
          </Link>
        </motion.div>
      ) : profile?.role === "creator" ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-10"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openPostJob}
            className="group relative inline-flex overflow-hidden rounded-xl border border-white/10 shadow-[0_0_50px_-12px_rgba(99,102,241,0.4)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 via-violet-600/35 to-cyan-600/20 opacity-90 transition group-hover:opacity-100" />
            <span className="relative flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white">
              <Briefcase className="h-4 w-4 text-white/90" strokeWidth={1.5} />
              Post a new job
            </span>
          </motion.button>
          {isDev ? (
            <p className="mt-3 max-w-md text-xs text-slate-500">
              Dev: If Stripe webhooks cannot reach localhost, use{" "}
              <span className="text-slate-400">Simulate payment</span> on an unpaid job below.
            </p>
          ) : null}
        </motion.div>
      ) : null}

      <section className="mt-14">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {profile?.role === "creator" ? "Your jobs" : "Your assignments"}
        </h2>
        {loadingTasks ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="glass-panel mt-4 border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            {profile?.role === "creator"
              ? "No jobs yet. Post one to hire an optimizer."
              : "No assignments. Open the job feed to claim."}
          </p>
        ) : (
          <motion.ul
            className="mt-6 space-y-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {tasks.map((t) => {
              const awaitingPay = t.status === "awaiting_checkout";
              const listCents =
                profile?.role === "optimizer" ? optimizerPayoutCents(t.budget) : t.budget;
              return (
                <motion.li
                  key={t.id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.005 }}
                  className="glass-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="text-sm font-medium text-white transition hover:text-violet-300"
                      >
                        {t.title}
                      </Link>
                      {t.status !== "open" && unreadTaskIds.has(t.id) ? (
                        <span
                          className="inline-flex h-2 w-2 shrink-0 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)] ring-2 ring-slate-950/80"
                          title="Unread messages on this task"
                          aria-label="Unread messages on this task"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(t.status)}`}
                      >
                        {awaitingPay ? "awaiting payment" : t.status.replace("_", " ")}
                      </span>
                      <span
                        className="ml-2 font-mono text-slate-400"
                        title={
                          profile?.role === "optimizer"
                            ? "Estimated payout after platform fee"
                            : "Job budget (escrow)"
                        }
                      >
                        {fmtMoney(listCents)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {awaitingPay && profile?.role === "creator" ? (
                      <>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={payingId === t.id}
                          onClick={() => resumeCheckout(t.id)}
                          className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200/95 disabled:opacity-50"
                        >
                          {payingId === t.id ? "Redirecting…" : "Stripe checkout"}
                        </motion.button>
                        {isDev ? (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={simulatingId === t.id}
                            onClick={() => simulatePayment(t.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 disabled:opacity-50"
                          >
                            {simulatingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Simulate payment
                          </motion.button>
                        ) : null}
                      </>
                    ) : null}
                    <Link
                      href={`/tasks/${t.id}`}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.07]"
                    >
                      Workspace
                    </Link>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={null}>
        <DashboardPostOpener />
      </Suspense>
      <DashboardContent />
    </>
  );
}