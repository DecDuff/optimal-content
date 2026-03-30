import type { MarketplaceTask } from "@/lib/tasks-types";
import { deadlineToHours } from "@/lib/tasks-types";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function getRemainingMs(task: MarketplaceTask): number {
  const hours = deadlineToHours(task.deadline);
  const end = task.postedAt + hours * 60 * 60 * 1000;
  return end - Date.now();
}

/** True when window is active and under 1 hour — Rapid urgency. */
export function isUrgentDeadline(task: MarketplaceTask): boolean {
  const ms = getRemainingMs(task);
  return ms > 0 && ms < ONE_HOUR_MS;
}

export function formatRemaining(task: MarketplaceTask): string {
  const ms = getRemainingMs(task);
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export type CountdownParts = {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function getCountdownParts(task: MarketplaceTask): CountdownParts {
  const ms = getRemainingMs(task);
  if (ms <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSec = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    expired: false,
  };
}
