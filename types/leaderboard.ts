export type LeaderboardTier = "new" | "bronze" | "silver" | "gold";

export type LeaderboardRow = {
  rank: number;
  optimizer_id: string;
  display_name: string;
  /** Tasks completed successfully (status `approved`). */
  completed_tasks: number;
  tier: LeaderboardTier;
  is_current_user: boolean;
};
