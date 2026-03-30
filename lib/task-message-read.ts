/** Client-only: last time messages were "seen" per task (ISO timestamps). */
export const TASK_MSG_READ_STORAGE_KEY = "optimal-content:taskMsgRead:v1";

export function readTaskMessageReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TASK_MSG_READ_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function getTaskMessageLastReadIso(taskId: string): string | null {
  const m = readTaskMessageReadMap();
  return m[taskId] ?? null;
}

export function setTaskMessageLastReadIso(taskId: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readTaskMessageReadMap(), [taskId]: iso };
    localStorage.setItem(TASK_MSG_READ_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("optimal-content:task-message-read", { detail: { taskId, iso } }));
  } catch {
    /* quota or private mode */
  }
}

/** Marks read through the latest message timestamp in the thread (ISO). */
export function markTaskMessagesReadThrough(taskId: string, latestIso: string) {
  const prev = getTaskMessageLastReadIso(taskId);
  if (prev && prev >= latestIso) return;
  setTaskMessageLastReadIso(taskId, latestIso);
}
