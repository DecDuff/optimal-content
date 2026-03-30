export type RapidDeadline = "6h" | "12h" | "24h";

export type MarketplaceTask = {
  id: string;
  taskName: string;
  referenceUrl: string;
  specificAsk: string;
  price: number;
  deadline: RapidDeadline;
  postedAt: number;
  status: "open" | "claimed";
  /** Set when claimed — matches `profileId` in storage for the current optimizer session. */
  claimedBy?: string;
  claimedAt?: number;
  /** Topics for recommendation matching (subset of skill tags). */
  taskTags?: string[];
};

export function deadlineToHours(d: RapidDeadline): number {
  switch (d) {
    case "6h":
      return 6;
    case "12h":
      return 12;
    case "24h":
      return 24;
    default:
      return 6;
  }
}
