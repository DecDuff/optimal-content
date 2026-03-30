"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { DirectRequestTarget } from "@/types/direct-request";
import { isValidYoutubeOrVideoUrl } from "@/lib/validation";

const DESC_MAX = 8_000;
const TITLE_MAX = 200;
const FEE_PCT = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? 20);
const OPTIMIZER_PCT = 100 - FEE_PCT;

const PRESET_TAGS = ["Thumbnail", "SEO", "Hook", "Editing"] as const;
type PresetTag = (typeof PRESET_TAGS)[number];
const CUSTOM_TAG_MAX = 40;

const COMPLEXITY_OPTIONS = ["beginner", "intermediate", "expert"] as const;
type ComplexityOption = (typeof COMPLEXITY_OPTIONS)[number];

const TARGET_PLATFORM_OPTIONS = ["youtube_longform", "youtube_shorts", "tiktok", "instagram_reels"] as const;
type TargetPlatformOption = (typeof TARGET_PLATFORM_OPTIONS)[number];

type AiSuggestion = {
  polishedDescription: string;
  suggestedTags: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
};

type Props = {
  open: boolean;
  onClose: () => void;
  directRequest: DirectRequestTarget | null;
};

export function PostJobModal({ open, onClose, directRequest }: Props) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [budgetDollars, setBudgetDollars] = useState("50");
  const [presetTags, setPresetTags] = useState<PresetTag[]>([]);
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherCustomTag, setOtherCustomTag] = useState("");
  const [complexityLevel, setComplexityLevel] = useState<ComplexityOption>("beginner");
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatformOption>("youtube_longform");
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

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
    setPresetTags([]);
    setOtherSelected(false);
    setOtherCustomTag("");
    setComplexityLevel("beginner");
    setTargetPlatform("youtube_longform");
    setAiSuggestion(null);
  }, []);

  const togglePresetTag = useCallback((tag: PresetTag) => {
    setPresetTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const buildTagsForSubmit = useCallback((): string[] => {
    const out: string[] = [...presetTags];
    if (otherSelected) {
      const c = otherCustomTag.trim();
      if (c) out.push(c);
    }
    return out;
  }, [presetTags, otherSelected, otherCustomTag]);

  const handleClose = useCallback(() => {
    if (!loading && !aiBusy) {
      onClose();
      reset();
    }
  }, [loading, aiBusy, onClose, reset]);

  async function runAiPolishAndTag() {
    const raw = description.trim();
    if (raw.length < 20) {
      toast.error("Write at least 20 characters of brief before using AI polish.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: raw, title: title.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "AI request failed");
        return;
      }
      setAiSuggestion({
        polishedDescription: data.polishedDescription,
        suggestedTags: data.suggestedTags ?? [],
        difficulty: data.difficulty ?? "Intermediate",
      });
      toast.success("Suggestions ready — review below.");
    } catch {
      toast.error("Network error");
    } finally {
      setAiBusy(false);
    }
  }

  function applyPolishedDescription() {
    if (!aiSuggestion) return;
    setDescription(aiSuggestion.polishedDescription.slice(0, DESC_MAX));
    toast.success("Description updated from AI.");
  }

  function applySuggestedTags() {
    if (!aiSuggestion) return;
    const tags = aiSuggestion.suggestedTags.map((t) => t.trim()).filter(Boolean).slice(0, 3);
    const nextPresets: PresetTag[] = [];
    const nonPreset: string[] = [];
    for (const t of tags) {
      const presetMatch = PRESET_TAGS.find((p) => p.toLowerCase() === t.toLowerCase());
      if (presetMatch && !nextPresets.includes(presetMatch)) nextPresets.push(presetMatch);
      else nonPreset.push(t);
    }
    const custom =
      nonPreset.length > 0 ? nonPreset.join(" · ").slice(0, CUSTOM_TAG_MAX) : null;
    setPresetTags((prev) => {
      const merged = [...prev];
      for (const p of nextPresets) {
        if (!merged.includes(p)) merged.push(p);
      }
      return merged;
    });
    if (custom) {
      setOtherSelected(true);
      setOtherCustomTag(custom);
    }
    toast.success("Tags applied — adjust before posting.");
  }

  function applySuggestedComplexity() {
    if (!aiSuggestion) return;
    const d = aiSuggestion.difficulty;
    const low = d.toLowerCase();
    if (low === "beginner") setComplexityLevel("beginner");
    else if (low === "intermediate") setComplexityLevel("intermediate");
    else setComplexityLevel("expert");
    toast.success("Complexity updated.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
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

    const tagsForApi = buildTagsForSubmit();
    if (tagsForApi.length === 0) {
      if (otherSelected) {
        toast.error('Choose "Other" and type a custom tag, or pick at least one preset tag.');
      } else {
        toast.error("Select at least one tag.");
      }
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
          tags: tagsForApi,
          complexity_level: complexityLevel,
          target_platform: targetPlatform,
          ...(directRequest
            ? { requested_optimizer_id: directRequest.optimizerId }
            : {}),
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
            className="glass-panel relative z-[1] max-h-[min(92vh,840px)] w-full max-w-lg overflow-y-auto p-4 shadow-[0_0_80px_-20px_rgba(99,102,241,0.35)] sm:p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
                  {directRequest ? "Direct request" : "New brief"}
                </p>
                <h2 id="post-job-title" className="mt-1 text-xl font-semibold tracking-tight text-white">
                  {directRequest
                    ? `Request ${directRequest.displayName}`
                    : "Post a job"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {directRequest
                    ? "Only this optimizer can accept for 24 hours after you pay. It stays off the public feed until they decline."
                    : "Escrow budget with Stripe. Job appears on the feed after payment clears."}
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                disabled={loading || aiBusy}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs font-medium text-slate-400">Brief / deliverables</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] tabular-nums text-slate-500">
                      {description.length}/{DESC_MAX}
                    </span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      disabled={loading || aiBusy}
                      onClick={() => void runAiPolishAndTag()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/45 bg-violet-500/15 px-3 py-1.5 text-[11px] font-semibold text-violet-100 shadow-[0_0_20px_-8px_rgba(139,92,246,0.5)] transition hover:bg-violet-500/25 disabled:opacity-45"
                    >
                      {aiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      )}
                      AI Polish &amp; Tag
                    </motion.button>
                  </div>
                </div>
                <textarea
                  required
                  maxLength={DESC_MAX}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={aiBusy}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm leading-relaxed text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] outline-none backdrop-blur-md focus:border-violet-500/40 disabled:opacity-60"
                  placeholder="What should the optimizer deliver? Be specific about pacing, hooks, and assets."
                />
                {aiSuggestion ? (
                  <div className="mt-3 space-y-3 rounded-xl border border-violet-500/35 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4 backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200/90">
                      AI suggestions
                    </p>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Polished brief</p>
                      <p className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-300">
                        {aiSuggestion.polishedDescription}
                      </p>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        onClick={applyPolishedDescription}
                        className="mt-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.1]"
                      >
                        Use polished description
                      </motion.button>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500">Suggested tags</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {aiSuggestion.suggestedTags.map((t, i) => (
                          <span
                            key={`${i}-${t}`}
                            className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-100/90"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        onClick={applySuggestedTags}
                        className="mt-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.1]"
                      >
                        Apply tags
                      </motion.button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-500">Difficulty</span>
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100/90">
                        {aiSuggestion.difficulty}
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        onClick={applySuggestedComplexity}
                        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.1]"
                      >
                        Use complexity
                      </motion.button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiSuggestion(null)}
                      className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-400 hover:underline"
                    >
                      Dismiss suggestions
                    </button>
                  </div>
                ) : null}
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

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-medium text-slate-400">Tags</label>
                  <span className="text-[10px] text-slate-500">
                    {buildTagsForSubmit().length} in request
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const active = presetTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePresetTag(tag)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                          active
                            ? "border-violet-500/60 bg-violet-500/15 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setOtherSelected((v) => {
                        if (v) setOtherCustomTag("");
                        return !v;
                      });
                    }}
                    aria-pressed={otherSelected}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                      otherSelected
                        ? "border-amber-500/55 bg-amber-500/15 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15"
                    }`}
                  >
                    Other
                  </button>
                </div>
                {otherSelected ? (
                  <div className="mt-3">
                    <label className="text-[11px] font-medium text-slate-500">Custom tag</label>
                    <input
                      type="text"
                      value={otherCustomTag}
                      onChange={(e) => setOtherCustomTag(e.target.value.slice(0, CUSTOM_TAG_MAX))}
                      maxLength={CUSTOM_TAG_MAX}
                      placeholder="e.g. Color grading, B-roll, Live stream"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none backdrop-blur-md focus:border-amber-500/40"
                    />
                    <p className="mt-1 text-[10px] text-slate-600">
                      {otherCustomTag.length}/{CUSTOM_TAG_MAX} — saved with your other tags (not the word
                      &quot;Other&quot;).
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Complexity level</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COMPLEXITY_OPTIONS.map((opt) => {
                    const active = complexityLevel === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setComplexityLevel(opt)}
                        aria-pressed={active}
                        className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-violet-500/60 bg-violet-500/15 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Target platform</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TARGET_PLATFORM_OPTIONS.map((opt) => {
                    const active = targetPlatform === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTargetPlatform(opt)}
                        aria-pressed={active}
                        className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-cyan-500/60 bg-cyan-500/15 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <motion.button
                  type="button"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={handleClose}
                  disabled={loading || aiBusy}
                  className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-400 backdrop-blur-sm touch-manipulation disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading || aiBusy}
                  whileHover={{ scale: loading || aiBusy ? 1 : 1.02 }}
                  whileTap={{ scale: loading || aiBusy ? 1 : 0.98 }}
                  aria-busy={loading}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.55)] touch-manipulation disabled:pointer-events-none disabled:opacity-55"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {loading
                    ? "Redirecting…"
                    : directRequest
                      ? "Send request & pay with Stripe"
                      : "Post task & pay with Stripe"}
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
