import type { MarketplaceTask } from "@/lib/tasks-types";
/** Heuristic tags when legacy tasks have no taskTags array. */
export function inferTaskTags(task: MarketplaceTask): string[] {
  const set = new Set<string>([...(task.taskTags ?? [])]);
  const url = task.referenceUrl.toLowerCase();
  const blob = `${task.taskName} ${task.specificAsk}`.toLowerCase();

  if (url.includes("youtube") || url.includes("studio.youtube") || blob.includes("youtube")) {
    set.add("YouTube");
  }
  if (url.includes("tiktok") || blob.includes("tiktok")) {
    set.add("TikTok");
  }
  if (blob.includes("short") || blob.includes("short-form") || blob.includes("shortform")) {
    set.add("Short-form");
  }
  if (blob.includes("script")) {
    set.add("Scripting");
  }
  if (blob.includes("hook")) {
    set.add("Hook-master");
  }

  return [...set];
}

export function taskMatchesUserTags(task: MarketplaceTask, userTags: readonly string[]): boolean {
  if (userTags.length === 0) return false;
  const taskTags = inferTaskTags(task);
  return taskTags.some((t) => userTags.includes(t));
}
