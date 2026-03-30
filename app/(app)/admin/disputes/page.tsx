"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gavel, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import type { MessageRow, TaskRow } from "@/types/database";

type DisputesPayload = {
  tasks: TaskRow[];
  display_names: Record<string, string>;
  messages_by_task: Record<string, MessageRow[]>;
};

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminDisputesPage() {
  const [data, setData] = useState<DisputesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/disputes", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setData(null);
        return;
      }
      setData(json as DisputesPayload);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function forceApprove(taskId: string) {
    if (!confirm("Force approve and pay the optimizer? This cannot be undone.")) return;
    setActingId(taskId);
    try {
      const res = await fetch("/api/admin/force-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Force approve failed");
        return;
      }
      toast.success("Payout recorded — task approved.");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setActingId(null);
    }
  }

  async function forceRefund(taskId: string) {
    if (!confirm("Force refund the creator? This cannot be undone.")) return;
    setActingId(taskId);
    try {
      const res = await fetch("/api/admin/force-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Force refund failed");
        return;
      }
      toast.success("Refund processed — task marked refunded.");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: "Optimal Content", href: "/dashboard" },
          { label: "Admin", href: "/admin/disputes" },
          { label: "Disputes" },
        ]}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 text-amber-200/90">
          <Gavel className="h-5 w-5" strokeWidth={1.5} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Moderation</p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Dispute desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Open appeals and disputes with full task context and workspace chat. Use overrides only after reviewing
          messages and Stripe state (no transfer should exist yet).
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading cases…
        </div>
      ) : error ? (
        <p className="mt-10 text-sm text-rose-400">{error}</p>
      ) : !data?.tasks.length ? (
        <p className="glass-panel mt-10 border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
          No open appeals or disputes.
        </p>
      ) : (
        <ul className="mt-10 space-y-8">
          {data.tasks.map((task) => {
            const names = data.display_names;
            const creator = names[task.creator_id] ?? task.creator_id;
            const optimizer = task.optimizer_id ? names[task.optimizer_id] ?? task.optimizer_id : "—";
            const msgs = data.messages_by_task[task.id] ?? [];
            const busy = actingId === task.id;

            return (
              <li
                key={task.id}
                className="glass-panel overflow-hidden border border-white/[0.08] shadow-[0_0_40px_-16px_rgba(99,102,241,0.35)]"
              >
                <div className="border-b border-white/[0.06] bg-slate-950/40 px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-base font-semibold text-white hover:text-violet-300"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">{task.id}</p>
                      <p className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-200/90">
                          {task.status}
                        </span>
                        <span>
                          Creator: <span className="text-slate-300">{creator}</span>
                        </span>
                        <span>
                          Optimizer: <span className="text-slate-300">{optimizer}</span>
                        </span>
                      </p>
                      {task.appeal_reason?.trim() ? (
                        <div className="mt-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-100/90">
                          <span className="font-semibold text-orange-200/80">Appeal note: </span>
                          {task.appeal_reason}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={busy}
                        onClick={() => forceApprove(task.id)}
                        className="rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-45"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Force approve & pay
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={busy}
                        onClick={() => forceRefund(task.id)}
                        className="rounded-lg border border-rose-500/45 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 disabled:opacity-45"
                      >
                        Force refund
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Workspace chat
                  </div>
                  {msgs.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No messages on this task.</p>
                  ) : (
                    <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/[0.06] bg-slate-950/50 p-3">
                      {msgs.map((m) => {
                        const who =
                          m.sender_id === task.creator_id
                            ? `Creator (${names[m.sender_id] ?? m.sender_id.slice(0, 8)})`
                            : m.sender_id === task.optimizer_id
                              ? `Optimizer (${names[m.sender_id] ?? m.sender_id.slice(0, 8)})`
                              : names[m.sender_id] ?? m.sender_id.slice(0, 8);
                        return (
                          <li key={m.id} className="border-b border-white/[0.04] pb-2 text-xs last:border-0 last:pb-0">
                            <p className="text-[10px] text-slate-500">
                              {who} · {fmtWhen(m.created_at)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-300">{m.content}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t border-white/[0.06] px-4 py-3 sm:px-6">
                  <p className="text-[10px] text-slate-600">
                    Escrow: {task.stripe_charge_id ? "charge on file" : "missing"} · Transfer:{" "}
                    {task.stripe_transfer_id ? "already paid (override blocked)" : "none"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
