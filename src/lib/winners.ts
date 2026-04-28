// Pure logic for calculating winners (used by API and admin preview)

export const POOL_PERCENTAGE = 0.7;
export const PRIZE_DISTRIBUTION = {
  1: 0.55, // 55%
  2: 0.28, // 28%
  3: 0.17, // 17%
} as const;

export const RECLAIM_DAYS = 30;

export interface ScoreEntry {
  quinielaId: string;
  userId: string;
  totalPoints: number;
  isTest?: boolean;
}

export interface CalculatedWinner {
  quinielaId: string;
  userId: string;
  posicion: 1 | 2 | 3;
  puntosFinales: number;
  empatadosCon: number;
  premioUsd: number;
}

/**
 * Calculate winners for a tournament given total payments and scores.
 *
 * Rules (from T&C 9.1.1):
 * - Sort by totalPoints DESC
 * - Top distinct point group = position 1
 * - Next distinct group = position 2
 * - Next distinct group = position 3
 * - Each member of position N gets (poolPercent[N] / groupSize) * totalPool
 * - Test quinielas excluded
 */
export function calculateWinners(
  totalRecaudadoUsd: number,
  scores: ScoreEntry[]
): {
  poolUsd: number;
  winners: CalculatedWinner[];
} {
  const poolUsd = totalRecaudadoUsd * POOL_PERCENTAGE;

  // Filter out test quinielas + zero point quinielas
  const eligible = scores
    .filter((s) => !s.isTest && s.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  if (eligible.length === 0) {
    return { poolUsd, winners: [] };
  }

  // Group by points
  const groups: ScoreEntry[][] = [];
  let currentGroup: ScoreEntry[] = [];
  let currentPoints: number | null = null;

  for (const s of eligible) {
    if (s.totalPoints !== currentPoints) {
      if (currentGroup.length) groups.push(currentGroup);
      currentGroup = [s];
      currentPoints = s.totalPoints;
    } else {
      currentGroup.push(s);
    }
  }
  if (currentGroup.length) groups.push(currentGroup);

  const winners: CalculatedWinner[] = [];
  for (let i = 0; i < Math.min(3, groups.length); i++) {
    const pos = (i + 1) as 1 | 2 | 3;
    const group = groups[i];
    const positionPool = poolUsd * PRIZE_DISTRIBUTION[pos];
    const premioPerWinner = positionPool / group.length;

    for (const entry of group) {
      winners.push({
        quinielaId: entry.quinielaId,
        userId: entry.userId,
        posicion: pos,
        puntosFinales: entry.totalPoints,
        empatadosCon: group.length,
        premioUsd: Math.round(premioPerWinner * 100) / 100,
      });
    }
  }

  return { poolUsd, winners };
}
