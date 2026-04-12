import { MatchPhase } from "@/generated/prisma/enums";

// --- Point values ---
export const POINTS = {
  EXACT_SCORE: 5,
  CORRECT_RESULT: 3,
  PARTIAL_SCORE: 1,
  WRONG: 0,
} as const;

// --- Phase multipliers for knockout stages ---
export const PHASE_MULTIPLIERS: Record<MatchPhase, number> = {
  GROUP_STAGE: 1,
  ROUND_OF_32: 1.5,
  ROUND_OF_16: 1.5,
  QUARTER_FINALS: 2,
  SEMI_FINALS: 2.5,
  THIRD_PLACE: 3,
  FINAL: 3,
};

// --- Tournament prediction points ---
export const TOURNAMENT_POINTS = {
  CHAMPION: 20,
  RUNNER_UP: 10,
  THIRD_PLACE: 5,
  TOP_SCORER: 5,
  GROUP_WINNER: 5,
  GROUP_RUNNER_UP: 3,
} as const;

// --- Wildcard multiplier ---
export const WILDCARD_MULTIPLIER = 2;

// --- Max wildcards per quiniela ---
export const MAX_WILDCARDS = 2;

// --- Prediction lock minutes before match ---
export const LOCK_MINUTES_BEFORE = 5;

/**
 * Calculate points for a match prediction.
 * Points are NOT cumulative - only the highest category applies.
 */
export function calculateMatchPoints(
  prediction: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number },
  phase: MatchPhase,
  isWildcard: boolean = false
): number {
  const multiplier = PHASE_MULTIPLIERS[phase];
  let basePoints: number = POINTS.WRONG;

  const predDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = actual.homeScore - actual.awayScore;

  if (
    prediction.homeScore === actual.homeScore &&
    prediction.awayScore === actual.awayScore
  ) {
    basePoints = POINTS.EXACT_SCORE;
  } else if (Math.sign(predDiff) === Math.sign(actualDiff)) {
    basePoints = POINTS.CORRECT_RESULT;
  } else if (
    prediction.homeScore === actual.homeScore ||
    prediction.awayScore === actual.awayScore
  ) {
    basePoints = POINTS.PARTIAL_SCORE;
  }

  let points = Math.round(basePoints * multiplier);

  if (isWildcard && points > 0) {
    points *= WILDCARD_MULTIPLIER;
  }

  return points;
}

/**
 * Determine the scoring category for display purposes.
 */
export function getScoringCategory(
  prediction: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number }
): "exact" | "correct_result" | "partial" | "wrong" {
  if (
    prediction.homeScore === actual.homeScore &&
    prediction.awayScore === actual.awayScore
  ) {
    return "exact";
  }

  const predDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = actual.homeScore - actual.awayScore;

  if (Math.sign(predDiff) === Math.sign(actualDiff)) {
    return "correct_result";
  }

  if (
    prediction.homeScore === actual.homeScore ||
    prediction.awayScore === actual.awayScore
  ) {
    return "partial";
  }

  return "wrong";
}
