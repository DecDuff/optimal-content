/** Canonical optimizer / task topic tags — single source for profile, posts, and matching. */
export const SKILL_TAGS = [
  "YouTube",
  "TikTok",
  "Short-form",
  "Scripting",
  "Hook-master",
] as const;

export type SkillTag = (typeof SKILL_TAGS)[number];
