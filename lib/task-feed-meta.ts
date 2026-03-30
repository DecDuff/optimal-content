/** Safe display + filter helpers for task metadata on feeds and cards. */

export const FEED_PLATFORM_VALUES = [
  "youtube_longform",
  "youtube_shorts",
  "tiktok",
  "instagram_reels",
] as const;

export type FeedPlatformValue = (typeof FEED_PLATFORM_VALUES)[number];

export const FEED_COMPLEXITY_VALUES = ["beginner", "intermediate", "expert"] as const;

export type FeedComplexityValue = (typeof FEED_COMPLEXITY_VALUES)[number];

const PLATFORM_LABELS: Record<string, string> = {
  youtube_longform: "YouTube Longform",
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
};

/** Non-null tags only; never throws. */
export function safeTaskTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean);
}

export function platformBadgeLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return PLATFORM_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function complexityBadgeClass(
  raw: string | null | undefined
): { label: string; dot: string; pill: string } | null {
  if (raw == null) return null;
  const l = String(raw).trim().toLowerCase();
  if (!l) return null;
  if (l === "beginner") {
    return {
      label: "Beginner",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]",
      pill: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100/90",
    };
  }
  if (l === "intermediate") {
    return {
      label: "Intermediate",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
      pill: "border-amber-500/35 bg-amber-500/10 text-amber-100/90",
    };
  }
  if (l === "expert") {
    return {
      label: "Expert",
      dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]",
      pill: "border-red-500/35 bg-red-500/10 text-red-100/90",
    };
  }
  return {
    label: String(raw).trim(),
    dot: "bg-zinc-500",
    pill: "border-white/10 bg-white/[0.05] text-slate-300",
  };
}
