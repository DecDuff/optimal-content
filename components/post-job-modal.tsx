"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { isValidYoutubeOrVideoUrl } from "@/lib/validation";

const DESC_MAX = 8_000;
const TITLE_MAX = 200;
const FEE_PCT = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 20);
const OPTIMIZER_PCT = 100 - FEE_PCT;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PostJobModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [budgetDollars, setBudgetDollars] = useState("50");
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setBudgetDollars("50");
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
      reset();
    }
  }, [loading, onClose, reset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    const v = videoUrl.trim();
    const dollars = Number.parseFloat(budgetDollars);

    if (!t || !d || !v) {
      toast.error("Fill in every field.");
      return;
    }
    if (t.length > TITLE_MAX || d.length > DESC_MAX) {
      toast.error("Title or description is too long.");
      return;
    }
    if (!isValidYoutubeOrVideoUrl(v)) {
      toast.error("Use a valid YouTube URL (https://youtube.com/... or youtu.be/...).");
      return;
    }
    if (!Number.isFinite(dollars) || dollars < 0.5) {
      toast.error("Budget must be at least $0.50.");
      return;
    }

    const budget = Math.round(dollars * 100);
    if (budget < 50) {
      toast.error("Budget must be at least $0.50.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: d,
          video_url: v,
          budget,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.task) {
        toast.error(data.error ?? "Could not create task");
        return;
      }

      const pay = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: data.task.id }),
      });
      const checkout = await pay.json();
      if (!pay.ok) {
        toast.error(checkout.error ?? "Checkout failed");
        return;
      }
      if (checkout.url) {
        toast.success("Redirecting to Stripe…");
        window.location.href = checkout.url;
        return;
      }
      toast.error("No checkout URL returned");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const budgetPreview = Number.isFinite(Number.parseFloat(budgetDollars))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number.parseFloat(budgetDollars) || 0
      )
    : "—";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="post-job-overlay"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[#020617]/85 backdrop-blur-md"
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-job-title"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-panel relative z-[1] max-h-[min(92vh,840px)] w-full max-w-lg overflow-y-auto p-8 shadow-[0_0_80px_-20px_rgba(99,102,241,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
                  New brief
                </p>
                <h2 id="post-job-title" className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Post a job
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Escrow budget with Stripe. Job appears on the feed after payment clears.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-400">Task title</label>
                <input
                  required
                  maxLength={TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] outline-none backdrop-blur-md focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/25"
                  placeholder="e.g. Retention pass on 12-min essay video"
                />
              </div>
              <div>
                <div className="flex justify-between gap-2">
                  <label className="text-xs font-medium text-slate-400">Brief / deliverables</label>
                  <span className="text-[10px] tabular-nums text-slate-500">
                    {description.length}/{DESC_MAX}
                  </span>
                </div>
                <textarea
                  required
                  maxLength={DESC_MAX}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm leading-relaxed text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] outline-none backdrop-blur-md focus:border-violet-500/40"
                  placeholder="What should the optimizer deliver? Be specific about pacing, hooks, and assets."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">YouTube video URL</label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none backdrop-blur-md focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Budget (USD)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.01}
                  required
                  value={budgetDollars}
                  onChange={(e) => setBudgetDollars(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white tabular-nums outline-none backdrop-blur-md focus:border-emerald-500/40"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Charged as <span className="font-mono text-slate-400">{budgetPreview}</span> ·{" "}
                  {OPTIMIZER_PCT}% to optimizer on approval ({FEE_PCT}% platform).
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-400 backdrop-blur-sm disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.55)] disabled:opacity-50"
                >
                  {loading ? "Working…" : "Create & pay with Stripe"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
