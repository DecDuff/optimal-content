"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markTaskMessagesReadThrough } from "@/lib/task-message-read";
import type { MessageRow } from "@/types/database";

const CONTENT_MAX = 8000;

type Props = {
  taskId: string;
  currentUserId: string | undefined;
  /** When true, persist “read through latest message” so dashboard unread dots clear while this chat is visible. */
  readTrackingActive?: boolean;
  /** Mobile drawer header — calls close when user taps X */
  onRequestClose?: () => void;
  className?: string;
};

function rowFromPayload(raw: Record<string, unknown>): MessageRow | null {
  const id = raw.id;
  const task_id = raw.task_id;
  const sender_id = raw.sender_id;
  const content = raw.content;
  const created_at = raw.created_at;
  if (
    typeof id === "string" &&
    typeof task_id === "string" &&
    typeof sender_id === "string" &&
    typeof content === "string" &&
    typeof created_at === "string"
  ) {
    return { id, task_id, sender_id, content, created_at };
  }
  return null;
}

export function TaskMessagesChat({
  taskId,
  currentUserId,
  readTrackingActive = true,
  onRequestClose,
  className = "",
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendBusy, setSendBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const trimmedLen = draft.trim().length;
  const draftLen = draft.length;
  const tooLong = draftLen > CONTENT_MAX;
  const atCharLimit = draftLen >= CONTENT_MAX;
  const canSend = Boolean(currentUserId) && !sendBusy && trimmedLen >= 1 && !tooLong;

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
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages:task:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const row = rowFromPayload(payload.new as Record<string, unknown>);
          if (!row) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    if (!readTrackingActive || loading || messages.length === 0) return;
    let latest = messages[0].created_at;
    for (const m of messages) {
      if (m.created_at > latest) latest = m.created_at;
    }
    markTaskMessagesReadThrough(taskId, latest);
  }, [readTrackingActive, loading, messages, taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function send() {
    if (!currentUserId) return;
    if (trimmedLen < 1) {
      toast.error("Message cannot be empty.");
      return;
    }
    if (tooLong) {
      toast.error(`Message is too long (max ${CONTENT_MAX} characters).`);
      return;
    }
    const text = draft.trim();
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
      const inserted = data.message as MessageRow;
      setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
    } catch {
      toast.error("Network error");
    } finally {
      setSendBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!canSend) {
      if (tooLong) toast.error(`Message is too long (max ${CONTENT_MAX} characters).`);
      else if (trimmedLen < 1) toast.error("Message cannot be empty.");
      return;
    }
    void send();
  }

  return (
    <div
      className={`flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-[0_0_40px_-12px_rgba(46,91,255,0.25)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Messages</p>
          <p className="text-xs text-zinc-400">Creator & optimizer · Live</p>
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
          <p className="px-4 py-12 text-center text-sm leading-relaxed text-zinc-500">
            No messages yet. Say hello!
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

      <div className="border-t border-white/[0.08] p-3 sm:p-4">
        {tooLong ? (
          <p className="mb-2 text-[11px] text-red-400/90">
            Too long — shorten to {CONTENT_MAX} characters or less.
          </p>
        ) : null}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={CONTENT_MAX}
            placeholder="Type a message…"
            disabled={!currentUserId || sendBusy}
            className="min-h-12 min-w-0 flex-1 touch-manipulation rounded-xl border border-white/10 bg-slate-950/50 px-3 py-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[#2e5bff]/50 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void send()}
            className="inline-flex min-h-12 shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-[#2e5bff]/45 bg-[#2e5bff]/20 px-4 py-3 text-sm font-semibold text-[#9cb4ff] transition hover:bg-[#2e5bff]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Send
          </button>
        </div>
        <p
          className={`mt-2 text-center text-[11px] tabular-nums ${
            tooLong || atCharLimit ? "text-amber-400/90" : trimmedLen < 1 ? "text-zinc-600" : "text-zinc-500"
          }`}
        >
          {draftLen}/{CONTENT_MAX}
        </p>
      </div>
    </div>
  );
}
