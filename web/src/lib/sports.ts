export const SPORTS = ['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const;

export type Sport = (typeof SPORTS)[number];

/** Case-insensitive parse of a sport name (e.g. from a URL param). */
export function parseSport(value: string | null | undefined): Sport | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return SPORTS.find((s) => s.toLowerCase() === lower) ?? null;
}

export function getSportEmoji(sport: string): string {
  switch (sport) {
    case 'Tennis':
      return '🎾';
    case 'Table Tennis':
      return '🏓';
    case 'Football':
      return '⚽';
    case 'Basketball':
      return '🏀';
    default:
      return '🏆';
  }
}

/** Rankings use 9999 as the sentinel for "unranked". */
export function isRanked(ranking: number | undefined | null): ranking is number {
  return typeof ranking === 'number' && ranking > 0 && ranking < 9999;
}

export function formatRank(ranking: number | undefined | null, unranked = 'Unranked'): string {
  return isRanked(ranking) ? `#${ranking}` : unranked;
}
