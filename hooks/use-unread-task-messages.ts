"use client";

import { useCallback, useEffect, useState } from "react";
import { readTaskMessageReadMap } from "@/lib/task-message-read";

export function useUnreadTaskMessages() {
  const [unreadTaskIds, setUnreadTaskIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const lastReadByTask = readTaskMessageReadMap();
      const res = await fetch("/api/messages/unread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastReadByTask }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) return;
      const ids = (data.unreadTaskIds ?? []) as string[];
      setUnreadTaskIds(new Set(ids));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRead = () => void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("optimal-content:task-message-read", onRead);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("optimal-content:task-message-read", onRead);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { unreadTaskIds, refreshUnread: refresh };
}
