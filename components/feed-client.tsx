"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import {
  FEED_COMPLEXITY_VALUES,
  FEED_PLATFORM_VALUES,
  complexityBadgeClass,
  platformBadgeLabel,
  safeTaskTags,
} from "@/lib/task-feed-meta";
import { optimizerPayoutCents } from "@/lib/optimizer-payout";
import type { FeedComplexityValue, FeedPlatformValue } from "@/lib/task-feed-meta";
import type { TaskRow } from "@/types/database";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type Props = {
  initialTasks: TaskRow[];
  fetchError: string | null;
};

export default function FeedClient({ initialTasks, fetchError }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "budget">("new");
  const [filterPlatform, setFilterPlatform] = useState<"" | FeedPlatformValue>("");
  const [filterComplexity, setFilterComplexity] = useState<"" | FeedComplexityValue>("");
  const [tagFilter, setTagFilter] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const hasExtraFilters = Boolean(filterPlatform || filterComplexity || tagFilter);

  const filtered = useMemo(() => {
    let t = [...tasks];
    const q = query.trim().toLowerCase();
    if (q) {
      t = t.filter(
        (x) => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
      );
    }
    if (filterPlatform) {
      t = t.filter((x) => (x.target_platform ?? "").trim() === filterPlatform);
    }
    if (filterComplexity) {
      t = t.filter((x) => (x.complexity_level ?? "").trim().toLowerCase() === filterComplexity);
    }
    if (tagFilter) {
      t = t.filter((row) => safeTaskTags(row.tags).includes(tagFilter));
    }
    if (sort === "budget") {
      t.sort((a, b) => optimizerPayoutCents(b.budget) - optimizerPayoutCents(a.budget));
    } else {
      t.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return t;
  }, [tasks, query, sort, filterPlatform, filterComplexity, tagFilter]);

  function clearFilters() {
    setFilterPlatform("");
    setFilterComplexity("");
    setTagFilter("");
  }

  async function claim(id: string) {
    setClaiming(id);
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not claim job");
        return;
      }
      toast.success("Job claimed — delivery window started.");
      setTasks((prev) => prev.filter((t) => t.id !== id));
      startTransition(() => {
        router.push(`/tasks/${id}`);
        router.refresh();
      });
    } catch {
      toast.error("Network error");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: "Optimal Content", href: "/dashboard" },
          { label: "Browse jobs" },
        ]}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="mt-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1 backdrop-blur-lg">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Optimizer
          </span>
        </div>
        <h1 className="mt-4 bg-gradient-to-br from-white via-indigo-100 to-violet-300/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          Job feed
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Open roles from other creators (your own posts are hidden here). New jobs show as soon as they&apos;re
          created; claim stays locked until checkout funds the task. Filter by platform, complexity, or tag.
        </p>
      </motion.div>

      {fetchError ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200 backdrop-blur-md">
          Could not load jobs: {fetchError}
        </div>
      ) : null}

      <div className="glass-panel mt-8 flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" strokeWidth={1.5} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles & briefs…"
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none backdrop-blur-md focus:border-violet-500/35"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "new" | "budget")}
              className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-xs font-medium text-slate-300 outline-none backdrop-blur-md focus:border-violet-500/35"
            >
              <option value="new">Newest first</option>
              <option value="budget">Highest budget</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[180px] flex-1 sm:max-w-[220px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Platform
            </label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value as "" | FeedPlatformValue)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-xs font-medium text-slate-300 outline-none backdrop-blur-md focus:border-cyan-500/35"
            >
              <option value="">All platforms</option>
              {FEED_PLATFORM_VALUES.map((v) => (
                <option key={v} value={v}>
                  {platformBadgeLabel(v) ?? v}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1 sm:max-w-[220px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Complexity
            </label>
            <select
              value={filterComplexity}
              onChange={(e) => setFilterComplexity(e.target.value as "" | FeedComplexityValue)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-xs font-medium text-slate-300 outline-none backdrop-blur-md focus:border-violet-500/35"
            >
              <option value="">All levels</option>
              {FEED_COMPLEXITY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {query.trim() || hasExtraFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                clearFilters();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400 backdrop-blur-sm transition hover:border-white/15 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Reset search & filters
            </button>
          ) : null}
        </div>

        {tagFilter ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Active tag</span>
            <button
              type="button"
              onClick={() => setTagFilter("")}
              className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[11px] font-medium text-violet-100 backdrop-blur-md transition hover:bg-violet-500/25"
            >
              {tagFilter}
              <X className="h-3 w-3 opacity-80" strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>

      {isRefreshing ? (
        <p className="mt-4 text-xs text-slate-500">Refreshing…</p>
      ) : null}

      {filtered.length === 0 ? (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mt-10 border-dashed border-white/10 p-10 text-center text-sm leading-relaxed text-slate-500"
        >
          {tasks.length === 0
            ? "No open jobs from other creators yet. Use a different optimizer account than the creator (this feed hides your own tasks), or ask someone else to post a brief."
            : query.trim() || hasExtraFilters
              ? "No jobs match your search or filters. Try clearing filters or different keywords."
              : "No jobs match your search. Try different keywords."}
        </motion.p>
      ) : (
        <motion.ul
          className="mt-8 space-y-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {filtered.map((t) => {
            const plat = platformBadgeLabel(t.target_platform);
            const cx = complexityBadgeClass(t.complexity_level);
            const tags = safeTaskTags(t.tags);
            const showMetaRow = Boolean(plat || cx || tags.length > 0);
            const funded = Boolean(t.stripe_charge_id);

            return (
              <motion.li
                key={t.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.006 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="text-sm font-medium text-white transition hover:text-violet-300"
                  >
                    {t.title}
                  </Link>
                  {showMetaRow ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {plat ? (
                        <span className="inline-flex rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-100/95 backdrop-blur-md">
                          {plat}
                        </span>
                      ) : null}
                      {cx ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium backdrop-blur-md ${cx.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cx.dot}`} aria-hidden />
                          {cx.label}
                        </span>
                      ) : null}
                      {tags.map((tag) => {
                        const active = tagFilter === tag;
                        return (
                          <button
                            key={`${t.id}-${tag}`}
                            type="button"
                            onClick={() => setTagFilter(active ? "" : tag)}
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium backdrop-blur-md transition ${
                              active
                                ? "border-violet-400/60 bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/40"
                                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-500/30 hover:text-white"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{t.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                  <div className="text-right">
                    <span className="font-mono text-xl font-semibold tabular-nums text-transparent bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text drop-shadow-[0_0_24px_rgba(52,211,153,0.25)]">
                      {fmtMoney(optimizerPayoutCents(t.budget))}
                    </span>
                    <p className="mt-0.5 text-[10px] text-slate-500">Your est. payout</p>
                  </div>
                  {!funded ? (
                    <span className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-center text-[10px] font-medium text-amber-200/90 backdrop-blur-md">
                      Awaiting creator payment
                    </span>
                  ) : null}
                  <motion.button
                    type="button"
                    whileHover={{ scale: funded && claiming !== t.id ? 1.02 : 1 }}
                    whileTap={{ scale: funded && claiming !== t.id ? 0.98 : 1 }}
                    disabled={claiming === t.id || !funded}
                    title={!funded ? "This job will be claimable after Stripe checkout completes." : undefined}
                    onClick={() => claim(t.id)}
                    aria-busy={claiming === t.id}
                    className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-600/90 to-violet-600/90 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(99,102,241,0.5)] backdrop-blur-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:py-2.5 sm:text-xs"
                  >
                    {claiming === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : null}
                    {claiming === t.id ? "Claiming…" : "Claim job"}
                  </motion.button>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
