"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { MessageRow } from "@/types/database";

type Props = {
  taskId: string;
  currentUserId: string | undefined;
  /** Mobile drawer header — calls close when user taps X */
  onRequestClose?: () => void;
  className?: string;
};

export function TaskMessagesChat({ taskId, currentUserId, onRequestClose, className = "" }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendBusy, setSendBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not load messages");
        setMessages([]);
        return;
      }
      setMessages((data.messages ?? []) as MessageRow[]);
    } catch {
      toast.error("Network error loading messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function send() {
    const text = draft.trim();
    if (!text || !currentUserId) return;
    setSendBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Send failed");
        return;
      }
      setDraft("");
      setMessages((prev) => [...prev, data.message as MessageRow]);
    } catch {
      toast.error("Network error");
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div
      className={`flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-[0_0_40px_-12px_rgba(46,91,255,0.25)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Messages</p>
          <p className="text-xs text-zinc-400">Creator & optimizer</p>
        </div>
        {onRequestClose ? (
          <button
            type="button"
            aria-label="Close messages"
            onClick={onRequestClose}
            className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-zinc-400 transition hover:bg-white/[0.09] hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-[#2e5bff]/70" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-500">
            No messages yet. Coordinate on the brief or submission here.
          </p>
        ) : (
          messages.map((m) => {
            const mine = currentUserId !== undefined && m.sender_id === currentUserId;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    mine
                      ? "max-w-[85%] rounded-2xl rounded-br-md border border-[#2e5bff]/35 bg-gradient-to-br from-[#2e5bff]/25 to-indigo-600/20 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100 shadow-[0_0_24px_-8px_rgba(46,91,255,0.45)]"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-zinc-200 backdrop-blur-md"
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="mt-1.5 text-[10px] tabular-nums text-zinc-500">
                    {new Date(m.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/[0.08] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Type a message…"
            disabled={!currentUserId || sendBusy}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[#2e5bff]/50"
          />
          <button
            type="button"
            disabled={!currentUserId || sendBusy || !draft.trim()}
            onClick={() => void send()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#2e5bff]/45 bg-[#2e5bff]/20 px-4 py-2.5 text-sm font-semibold text-[#9cb4ff] transition hover:bg-[#2e5bff]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
