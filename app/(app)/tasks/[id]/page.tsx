"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ClaimCountdown } from "@/components/claim-countdown";
import { RetentionChecklist } from "@/components/retention-checklist";
import { useSessionProfile } from "@/hooks/use-session-profile";
import { isValidHttpsUrl } from "@/lib/validation";
import type { ChecklistState, TaskRow, TaskStatus } from "@/types/database";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const CHECKLIST_KEYS = ["1", "2", "3", "4", "5"] as const satisfies readonly (keyof ChecklistState)[];

const EMPTY_CHECKLIST: ChecklistState = {
  "1": false,
  "2": false,
  "3": false,
  "4": false,
  "5": false,
};

function normalizeChecklist(raw: unknown): ChecklistState {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next: ChecklistState = { ...EMPTY_CHECKLIST };
  for (const k of CHECKLIST_KEYS) {
    const v = o[k] ?? o[String(k)];
    next[k] = v === true || v === "true" || v === 1 || v === "1";
  }
  return next;
}

function countChecked(state: ChecklistState): number {
  return CHECKLIST_KEYS.filter((k) => state[k]).length;
}

export default function TaskWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { profile, loading: profileLoading } = useSessionProfile();

  const [task, setTask] = useState<TaskRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>(EMPTY_CHECKLIST);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistChecklist = useCallback((next: ChecklistState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/tasks/${id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: next }),
      });
    }, 450);
  }, [id]);

  const refreshTask = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      try {
        const res = await fetch(`/api/tasks/${id}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
          signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load");
          setTask(null);
          return;
        }
        setLoadError(null);
        const t = data.task as TaskRow;
        setTask(t);
        setChecklist(normalizeChecklist(t.checklist));
        if (t.submission_url) setDeliverableUrl(t.submission_url);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "Failed to load");
        setTask(null);
      }
    },
    [id]
  );

  useEffect(() => {
    const ac = new AbortController();
    void refreshTask(ac.signal);
    return () => {
      ac.abort();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [refreshTask]);

  const onChecklistToggle = useCallback(
    (key: keyof ChecklistState) => {
      setChecklist((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persistChecklist(next);
        return next;
      });
    },
    [persistChecklist]
  );

  async function claim() {
    setBusy("claim");
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not claim");
        return;
      }
      toast.success("Job claimed — 24h window started.");
      const claimed = data.task as TaskRow;
      setTask(claimed);
      setChecklist(normalizeChecklist(claimed.checklist));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function submitWork() {
    const url = deliverableUrl.trim();
    if (!isValidHttpsUrl(url)) {
      toast.error("Paste a valid http(s) URL to your deliverable (report, doc, or asset).");
      return;
    }
    setBusy("submit");
    try {
      const res = await fetch(`/api/tasks/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_url: url }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Cannot submit");
        return;
      }
      toast.success("Submitted for creator review.");
      setTask(data.task as TaskRow);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    try {
      const res = await fetch(`/api/tasks/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Approve failed");
        return;
      }
      toast.success("Payout released.");
      setTask(data.task as TaskRow);
    } finally {
      setBusy(null);
    }
  }

  if (!id) {
    return <p className="p-8 text-sm text-zinc-500">Invalid task</p>;
  }

  if (profileLoading || (!task && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2e5bff]/25 border-t-[#2e5bff]" />
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className="min-h-screen px-6 py-8">
        <p className="text-sm text-red-400">{loadError ?? "Not found"}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-[#2e5bff]">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const uid = profile?.id;
  const isCreator = uid === task.creator_id;
  const isOptimizerUser = uid === task.optimizer_id;
  const isAssignedOptimizer = isOptimizerUser && task.status === "claimed";
  const funded = Boolean(task.stripe_charge_id);
  const canClaim =
    task.status === "open" && profile?.role === "optimizer" && !isCreator && funded;
  const showClaimTeaser =
    task.status === "open" && profile?.role === "optimizer" && !isCreator && !funded;
  const checkedCount = countChecked(checklist);
  const allChecklistDone = checkedCount === CHECKLIST_KEYS.length;
  const countdownActive =
    task.status === "claimed" || task.status === "submitted";

  const statusLabel = (s: TaskStatus) => s.replace("_", " ");

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: "Optimal Content", href: "/dashboard" },
          { label: "Workspace", href: `/tasks/${id}` },
          { label: task.title.slice(0, 48) + (task.title.length > 48 ? "…" : "") },
        ]}
      />

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Task workspace ·{" "}
            <span className="capitalize text-zinc-300">{statusLabel(task.status)}</span>
          </p>
          <h1 className="mt-2 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            {task.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{task.description}</p>
          <a
            href={task.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2e5bff] transition hover:text-[#5c7cff]"
          >
            Open YouTube / video link →
          </a>
        </div>
        <div className="glass-panel w-full max-w-xs shrink-0 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Budget</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#2e5bff] drop-shadow-[0_0_24px_rgba(46,91,255,0.4)]">
            {fmtMoney(task.budget)}
          </p>
        </div>
      </motion.header>

      {(isCreator || isOptimizerUser) && countdownActive && task.claimed_at ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mt-8 p-5"
        >
          <ClaimCountdown claimedAtIso={task.claimed_at} active={countdownActive} />
        </motion.div>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {isCreator && task.status === "open" ? (
            <div className="glass-panel border-[#2e5bff]/30 p-6">
              <p className="text-sm leading-relaxed text-zinc-300">
                This job is marked `open`. Optimizers will be able to claim once funding is confirmed and
                appears on their side.
              </p>
              <p className="mt-2 text-[12px] text-zinc-500">
                Stripe checkout CTA is intentionally hidden on this page when the task is `open`.
              </p>
            </div>
          ) : null}

          {canClaim ? (
            <div className="glass-panel border-[#2e5bff]/30 p-6">
              <p className="text-sm leading-relaxed text-zinc-300">
                This job is funded and unclaimed. Claim to lock the brief and start your 24-hour delivery
                window.
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: busy ? 1 : 1.02 }}
                whileTap={{ scale: busy ? 1 : 0.98 }}
                disabled={busy !== null}
                onClick={claim}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/60 bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(99,102,241,0.55)] disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {busy === "claim" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy === "claim" ? "Claiming…" : "Claim job"}
              </motion.button>
            </div>
          ) : null}

          {showClaimTeaser ? (
            <div className="glass-panel border-zinc-700/50 p-5">
              <p className="text-sm text-zinc-400">
                This task is currently `open` but not yet funded. You&apos;ll be able to claim after checkout
                completes.
              </p>
            </div>
          ) : null}

          {isCreator && task.status === "submitted" ? (
            <div className="glass-panel border-emerald-500/25 p-6">
              <p className="text-sm text-zinc-200">
                The optimizer submitted deliverables. Approve to route their share to the connected Stripe
                account (test mode).
              </p>
              {task.submission_url ? (
                <a
                  href={task.submission_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Open deliverable link →
                </a>
              ) : null}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={busy !== null}
                onClick={approve}
                className="mt-4 rounded-lg border border-white/15 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12] disabled:opacity-50"
              >
                {busy === "approve" ? "Processing…" : "Approve & release payout"}
              </motion.button>
            </div>
          ) : null}

          {isCreator && task.status === "approved" ? (
            <p className="text-sm text-zinc-500">Approved — payout recorded for this task.</p>
          ) : null}

          {task.status === "disputed" ? (
            <p className="text-sm text-amber-200/90">This task is marked disputed.</p>
          ) : null}
        </div>

        <div>
          {isAssignedOptimizer ? (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
            >
              <RetentionChecklist checklist={checklist} onToggle={onChecklistToggle} />
              <div className="mt-5">
                <label className="text-xs font-medium text-slate-400">Deliverable URL</label>
                <input
                  type="url"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://… (report, Notion, Drive, or asset)"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none backdrop-blur-md focus:border-cyan-500/40"
                />
                <p className="mt-1 text-[10px] text-slate-600">
                  Link to your optimization notes, timeline, or revised asset.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: busy ? 1 : 1.02 }}
                whileTap={{ scale: busy ? 1 : 0.98 }}
                disabled={
                  busy !== null || checkedCount < CHECKLIST_KEYS.length || !deliverableUrl.trim()
                }
                onClick={submitWork}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600/90 to-cyan-600/80 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-8px_rgba(52,211,153,0.35)] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy === "submit" ? "Submitting…" : "Submit for creator approval"}
              </motion.button>
            </motion.div>
          ) : task.status === "claimed" && isCreator ? (
            <p className="text-sm text-zinc-500">
              An optimizer is on the clock. You&apos;ll get the approval action when they submit.
            </p>
          ) : task.status === "open" && isCreator && funded ? (
            <p className="text-sm text-zinc-500">Live on the job feed — waiting for an optimizer to claim.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
