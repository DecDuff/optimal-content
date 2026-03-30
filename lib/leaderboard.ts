/** Static cohort so ranks feel real; current user count is injected live. */
export const MOCK_OPTIMIZER_ROWS = [
  { id: "opt-mock-riley", name: "Riley Chen", claims: 14 },
  { id: "opt-mock-alex", name: "Alex Novak", claims: 11 },
  { id: "opt-mock-sam", name: "Sam Ortiz", claims: 9 },
  { id: "opt-mock-jordan", name: "Jordan K.", claims: 7 },
] as const;

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  claims: number;
  isCurrentUser: boolean;
};

export function buildLeaderboard(profileId: string, myClaimCount: number): {
  rows: LeaderboardEntry[];
  myRank: number | null;
} {
  if (!profileId) {
    return { rows: [], myRank: null };
  }

  const combined = [
    ...MOCK_OPTIMIZER_ROWS.map((r) => ({
      id: r.id,
      name: r.name,
      claims: r.claims,
      isCurrentUser: false as const,
    })),
    {
      id: profileId,
      name: "You",
      claims: myClaimCount,
      isCurrentUser: true as const,
    },
  ];

  combined.sort((a, b) => {
    if (b.claims !== a.claims) return b.claims - a.claims;
    if (a.isCurrentUser !== b.isCurrentUser) return a.isCurrentUser ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const rows: LeaderboardEntry[] = combined.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    claims: row.claims,
    isCurrentUser: row.isCurrentUser,
  }));

  const myRow = rows.find((r) => r.isCurrentUser);
  return { rows, myRank: myRow ? myRow.rank : null };
}
