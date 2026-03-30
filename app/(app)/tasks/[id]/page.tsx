"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ClaimCountdown } from "@/components/claim-countdown";
import { RetentionChecklist } from "@/components/retention-checklist";
import { useSessionProfile } from "@/hooks/use-session-profile";
import { isValidHttpsUrl } from "@/lib/validation";
import { optimizerPayoutCents, readPlatformFeePercent } from "@/lib/optimizer-payout";
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

const PLATFORM_LABELS: Record<string, string> = {
  youtube_longform: "YouTube Longform",
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
};

function formatTargetPlatform(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return (
    PLATFORM_LABELS[raw] ??
    raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function complexityUi(level: string | null | undefined): { label: string; dot: string; text: string } {
  const l = (level ?? "").toLowerCase();
  if (l === "beginner") {
    return { label: "Beginner", dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]", text: "text-emerald-200/90" };
  }
  if (l === "expert") {
    return { label: "Expert", dot: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.45)]", text: "text-red-200/85" };
  }
  if (l === "intermediate") {
    return { label: "Intermediate", dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]", text: "text-amber-200/90" };
  }
  return { label: level || "Level", dot: "bg-zinc-500", text: "text-zinc-400" };
}

function TaskWorkspaceMetaBadges({ task }: { task: TaskRow }) {
  const platform = formatTargetPlatform(task.target_platform);
  const cx = complexityUi(task.complexity_level);
  const tags = tasktags(task.tags);
  const hasComplexity = Boolean(task.complexity_level?.trim());
  const showRow = platform || hasComplexity || tags.length > 0;
  if (!showRow) {
    return (
      <div className="border-b border-white/[0.06] pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Brief meta</p>
        <p className="mt-2 text-xs text-zinc-500">No brief tags were set on this job.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-white/[0.06] pb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Brief meta</p>
      <div className="flex flex-wrap items-center gap-2">
        {platform ? (
          <span className="inline-flex items-center rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-100/95 backdrop-blur-md">
            {platform}
          </span>
        ) : null}
        {hasComplexity ? (
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium backdrop-blur-md ${cx.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${cx.dot}`} aria-hidden />
          {cx.label}
        </span>
        ) : null}
      </div>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-2.5 py-1 text-[10px] font-medium text-violet-100/90 backdrop-blur-md"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function tasktags(raw: string[] | null | undefined): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean);
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
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [busyAppeal, setBusyAppeal] = useState(false);

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
    if (!allChecklistDone) {
      toast.error("Complete all 5 checklist items before submitting");
      return;
    }
    const url = deliverableUrl.trim();
    if (!isValidHttpsUrl(url)) {
      toast.error("Paste a valid http(s) URL to your deliverable (report, doc, or asset).");
      return;
    }
    setBusy("submit");
    try {
      // Flush checklist immediately so the submit endpoint sees the latest state.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const flushRes = await fetch(`/api/tasks/${id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist }),
      });
      const flushData = await flushRes.json();
      if (!flushRes.ok) {
        toast.error(flushData.error ?? "Could not save checklist");
        return;
      }

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

  async function submitAppeal() {
    const r = appealReason.trim();
    if (r.length < 8) {
      toast.error("Please write a clear reason (at least 8 characters).");
      return;
    }
    setBusyAppeal(true);
    try {
      const res = await fetch(`/api/tasks/${id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Appeal failed");
        return;
      }
      toast.success("Appeal recorded — status is now appealed.");
      setTask(data.task as TaskRow);
      setAppealOpen(false);
      setAppealReason("");
      await refreshTask();
      router.refresh();
    } finally {
      setBusyAppeal(false);
    }
  }

  async function resubmitWork() {
    const url = deliverableUrl.trim();
    if (!isValidHttpsUrl(url)) {
      toast.error("Enter a valid https URL for your updated deliverable.");
      return;
    }
    setBusy("resubmit");
    try {
      const res = await fetch(`/api/tasks/${id}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_url: url }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Could not resubmit");
        return;
      }
      toast.success("Resubmitted — the creator can review again.");
      setTask(data.task as TaskRow);
      await refreshTask();
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
  const platformFeePct = readPlatformFeePercent();
  const optimizerSharePct = 100 - platformFeePct;
  const showOptimizerNetPayout = profile?.role === "optimizer" && !isCreator;
  const headerBudgetCents = showOptimizerNetPayout
    ? optimizerPayoutCents(task.budget, platformFeePct)
    : task.budget;
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
    <>
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
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {showOptimizerNetPayout ? "Your payout (est.)" : "Budget"}
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#2e5bff] drop-shadow-[0_0_24px_rgba(46,91,255,0.4)]">
            {fmtMoney(headerBudgetCents)}
          </p>
          {showOptimizerNetPayout ? (
            <p className="mt-2 text-[11px] leading-snug text-zinc-500">
              {optimizerSharePct}% of job budget after the {platformFeePct}% platform fee.
            </p>
          ) : null}
        </div>
      </motion.header>

      {(isCreator || isOptimizerUser) && countdownActive && task.claimed_at ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mt-8 p-5"
        >
          <TaskWorkspaceMetaBadges task={task} />
          <div className="mt-5">
            <ClaimCountdown claimedAtIso={task.claimed_at} active={countdownActive} />
          </div>
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
              <div className="mt-5 flex flex-col gap-5">
                {task.submission_url ? (
                  <a
                    href={task.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                  >
                    Open deliverable link →
                  </a>
                ) : (
                  <p className="text-sm text-zinc-500">No deliverable URL was provided.</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={busy !== null || busyAppeal}
                    onClick={approve}
                    className="rounded-lg border border-white/15 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12] disabled:opacity-50"
                  >
                    {busy === "approve" ? "Processing…" : "Approve & release payout"}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={busy !== null || busyAppeal}
                    onClick={() => setAppealOpen(true)}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-100/95 backdrop-blur-sm transition hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    Appeal
                  </motion.button>
                </div>
              </div>
            </div>
          ) : null}

          {isCreator && task.status === "approved" ? (
            <p className="text-sm text-zinc-500">Approved — payout recorded for this task.</p>
          ) : null}

          {task.status === "disputed" || task.status === "appealed" ? (
            <div className="glass-panel border-amber-500/20 p-5">
              <p className="text-sm text-amber-200/90">
                {task.status === "appealed"
                  ? "This task is under appeal."
                  : "This task is marked disputed."}
              </p>
              {task.appeal_reason ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  <span className="font-medium text-zinc-400">Creator note: </span>
                  {task.appeal_reason}
                </p>
              ) : null}
              {isOptimizerUser && (task.status === "appealed" || task.status === "disputed") ? (
                <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400">Updated deliverable URL</label>
                    <input
                      type="url"
                      value={deliverableUrl}
                      onChange={(e) => setDeliverableUrl(e.target.value)}
                      placeholder="https://…"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-500/40"
                    />
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={busy !== null}
                    onClick={resubmitWork}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/85 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy === "resubmit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy === "resubmit" ? "Resubmitting…" : "Resubmit Work"}
                  </motion.button>
                </div>
              ) : null}
            </div>
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
                disabled={busy !== null || !allChecklistDone}
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

    <AnimatePresence>
      {appealOpen ? (
        <motion.div
          key="appeal-modal"
          className="fixed inset-0 z-[180] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close appeal dialog"
            disabled={busyAppeal}
            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            onClick={() => {
              if (!busyAppeal) setAppealOpen(false);
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appeal-title"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-panel relative z-[1] w-full max-w-md border border-white/10 p-6 shadow-[0_0_60px_-18px_rgba(251,191,36,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appeal-title" className="text-lg font-semibold tracking-tight text-white">
              Appeal this submission
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Explain what needs to change. The task will be marked <span className="text-slate-300">appealed</span>{" "}
              in Supabase and your note will be saved.
            </p>
            <label className="mt-5 block text-xs font-medium text-slate-400">Reason for appeal</label>
            <textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={5}
              maxLength={4000}
              disabled={busyAppeal}
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none backdrop-blur-md focus:border-amber-500/40"
              placeholder="Be specific about pacing, deliverables, or quality issues…"
            />
            <p className="mt-1 text-[10px] text-slate-600">{appealReason.trim().length}/4000 · min 8 characters</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={busyAppeal}
                onClick={() => {
                  setAppealOpen(false);
                  setAppealReason("");
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-400 backdrop-blur-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAppeal}
                onClick={submitAppeal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/45 bg-gradient-to-r from-amber-600/90 to-orange-600/85 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_-10px_rgba(245,158,11,0.45)] disabled:opacity-50"
              >
                {busyAppeal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busyAppeal ? "Submitting…" : "Confirm appeal"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}
