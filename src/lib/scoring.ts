// Re-export all constants and pure functions (safe for client components)
export {
  POINTS,
  PHASE_MULTIPLIERS,
  TOURNAMENT_POINTS,
  WILDCARD_MULTIPLIER,
  MAX_WILDCARDS,
  LOCK_MINUTES_BEFORE,
  calculateMatchPoints,
  getScoringCategory,
} from "./scoring-constants";

// Server-only function that uses Prisma
import { prisma } from "@/lib/prisma";

/**
 * Update the QuinielaScore for a given quiniela.
 * Aggregates match prediction points and tournament prediction points.
 * Shared by admin/results, admin/recalculate, and cron/sync-results.
 *
 * SERVER-ONLY: Do not import from client components.
 */
export async function updateQuinielaScore(quinielaId: string) {
  const predictions = await prisma.prediction.findMany({
    where: {
      quinielaId,
      points: { not: null },
    },
    include: {
      match: true,
    },
  });

  let totalPoints = 0;
  let exactScores = 0;
  let correctResults = 0;
  let partialScores = 0;
  let groupPoints = 0;
  let knockoutPoints = 0;
  let wildcardPoints = 0;

  for (const p of predictions) {
    const pts = p.points ?? 0;
    totalPoints += pts;

    if (p.match.homeScore === p.homeScore && p.match.awayScore === p.awayScore) {
      exactScores++;
    } else if (pts >= 3) {
      correctResults++;
    } else if (pts >= 1) {
      partialScores++;
    }

    if (p.match.phase === "GROUP_STAGE") {
      groupPoints += pts;
    } else {
      knockoutPoints += pts;
    }

    if (p.isWildcard && pts > 0) {
      wildcardPoints += pts / 2;
    }
  }

  // Include tournament prediction points
  const tournamentPreds = await prisma.tournamentPrediction.findMany({
    where: { quinielaId, points: { not: null } },
  });
  const tournamentPts = tournamentPreds.reduce(
    (sum, tp) => sum + (tp.points ?? 0),
    0
  );
  totalPoints += tournamentPts;

  await prisma.quinielaScore.upsert({
    where: { quinielaId },
    update: {
      totalPoints,
      exactScores,
      correctResults,
      partialScores,
      groupPoints,
      knockoutPoints,
      tournamentPoints: tournamentPts,
      wildcardPoints: Math.round(wildcardPoints),
    },
    create: {
      quinielaId,
      totalPoints,
      exactScores,
      correctResults,
      partialScores,
      groupPoints,
      knockoutPoints,
      tournamentPoints: tournamentPts,
      wildcardPoints: Math.round(wildcardPoints),
    },
  });

  // Recalculate ranks
  const allScores = await prisma.quinielaScore.findMany({
    orderBy: { totalPoints: "desc" },
  });

  for (let i = 0; i < allScores.length; i++) {
    await prisma.quinielaScore.update({
      where: { id: allScores[i].id },
      data: { rank: i + 1 },
    });
  }
}
