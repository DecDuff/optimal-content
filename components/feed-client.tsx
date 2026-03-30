"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
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
  const [claiming, setClaiming] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let t = [...tasks];
    const q = query.trim().toLowerCase();
    if (q) {
      t = t.filter(
        (x) => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
      );
    }
    if (sort === "budget") {
      t.sort((a, b) => b.budget - a.budget);
    } else {
      t.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return t;
  }, [tasks, query, sort]);

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
          Funded, open roles from other creators. Your own jobs never appear here. Use{" "}
          <span className="text-slate-300">Newest</span> or{" "}
          <span className="text-slate-300">Highest budget</span> to prioritize.
        </p>
      </motion.div>

      {fetchError ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200 backdrop-blur-md">
          Could not load jobs: {fetchError}
        </div>
      ) : null}

      <div className="glass-panel mt-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
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
            ? "No funded open jobs from other creators. Post from a creator account, complete Stripe checkout (or use Dev simulate payment), then view this feed from a separate optimizer account."
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
          {filtered.map((t) => (
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
              <div className="min-w-0">
                <Link
                  href={`/tasks/${t.id}`}
                  className="text-sm font-medium text-white transition hover:text-violet-300"
                >
                  {t.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                <span className="font-mono text-xl font-semibold tabular-nums text-transparent bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text drop-shadow-[0_0_24px_rgba(52,211,153,0.25)]">
                  {fmtMoney(t.budget)}
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={claiming === t.id}
                  onClick={() => claim(t.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-600/90 to-violet-600/90 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_32px_-8px_rgba(99,102,241,0.5)] backdrop-blur-sm disabled:opacity-60"
                >
                  {claiming === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : null}
                  {claiming === t.id ? "Claiming…" : "Claim job"}
                </motion.button>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
