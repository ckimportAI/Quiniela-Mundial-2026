/**
 * Bracket resolver for World Cup 2026 (48 teams, 12 groups).
 *
 * Strategy:
 *   1. Compute each group's standings from user's predicted group-stage scores
 *      (criteria: points -> goal diff -> goals for).
 *   2. Pick the 8 best 3rd-placed teams across all 12 groups.
 *   3. Resolve each KO match slot to a concrete team using BRACKET_PAIRINGS.
 *   4. Propagate winners through R32 -> R16 -> QF -> SF -> F using user's
 *      predicted KO scores (ties -> downstream TBD).
 */

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface MatchInfo {
  id: string;
  matchNumber: number;
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  group: { name: string } | null;
}

export interface PredictionInfo {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface GroupStanding {
  teamId: string;
  groupName: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

/** Resolved bracket: for each KO matchNumber, the two team ids that play */
export type ResolvedBracket = Record<
  number,
  { homeTeamId: string | null; awayTeamId: string | null }
>;

// ---------------------------------------------------------------
// FIFA 2026 bracket pairings (approximate — refine if FIFA confirms changes).
//
// Slot codes:
//   "W:X"  = winner of group X
//   "R:X"  = runner-up of group X
//   "3:X"  = third place of group X (only used if X is in the top 8)
//   "WM:N" = winner of match number N (used for R16, QF, SF, F)
//
// 12 groups A-L. Top 2 of each = 24 teams. Best 8 of 12 third-places = 8 teams.
// Total = 32 teams in R32 (matches 73-88).
// ---------------------------------------------------------------

interface SlotConfig {
  home: string;
  away: string;
}

// R32: matches 73-88.
// 8 slots use "3B:N" = the N-th best third-placed team (ranked by points/GD/GF),
// so all 8 slots are always filled regardless of which groups qualify.
const R32_PAIRINGS: Record<number, SlotConfig> = {
  73: { home: "W:A", away: "R:B" },
  74: { home: "W:C", away: "3B:1" },
  75: { home: "W:E", away: "R:F" },
  76: { home: "W:G", away: "3B:2" },
  77: { home: "W:B", away: "R:A" },
  78: { home: "W:D", away: "3B:3" },
  79: { home: "W:F", away: "R:E" },
  80: { home: "W:H", away: "3B:4" },
  81: { home: "W:I", away: "R:J" },
  82: { home: "W:K", away: "3B:5" },
  83: { home: "R:C", away: "R:D" },
  84: { home: "W:J", away: "3B:6" },
  85: { home: "W:L", away: "3B:7" },
  86: { home: "R:G", away: "R:H" },
  87: { home: "R:I", away: "R:L" },
  88: { home: "R:K", away: "3B:8" },
};

// R16: matches 89-96. Each match feeds from two R32 winners.
const R16_PAIRINGS: Record<number, SlotConfig> = {
  89: { home: "WM:73", away: "WM:74" },
  90: { home: "WM:75", away: "WM:76" },
  91: { home: "WM:77", away: "WM:78" },
  92: { home: "WM:79", away: "WM:80" },
  93: { home: "WM:81", away: "WM:82" },
  94: { home: "WM:83", away: "WM:84" },
  95: { home: "WM:85", away: "WM:86" },
  96: { home: "WM:87", away: "WM:88" },
};

// QF: matches 97-100.
const QF_PAIRINGS: Record<number, SlotConfig> = {
  97: { home: "WM:89", away: "WM:90" },
  98: { home: "WM:91", away: "WM:92" },
  99: { home: "WM:93", away: "WM:94" },
  100: { home: "WM:95", away: "WM:96" },
};

// SF: matches 101-102.
const SF_PAIRINGS: Record<number, SlotConfig> = {
  101: { home: "WM:97", away: "WM:98" },
  102: { home: "WM:99", away: "WM:100" },
};

// 3rd place: match 103. Losers of the semis.
const THIRD_PLACE_PAIRINGS: Record<number, SlotConfig> = {
  103: { home: "LM:101", away: "LM:102" },
};

// Final: match 104. Winners of the semis.
const FINAL_PAIRINGS: Record<number, SlotConfig> = {
  104: { home: "WM:101", away: "WM:102" },
};

const BRACKET_PAIRINGS: Record<number, SlotConfig> = {
  ...R32_PAIRINGS,
  ...R16_PAIRINGS,
  ...QF_PAIRINGS,
  ...SF_PAIRINGS,
  ...THIRD_PLACE_PAIRINGS,
  ...FINAL_PAIRINGS,
};

// ---------------------------------------------------------------
// Standings calculation
// ---------------------------------------------------------------

/**
 * Compute standings for every group from user's group-stage predictions.
 * Returns Map<groupName, GroupStanding[]> sorted best-first.
 */
export function computeAllGroupStandings(
  matches: MatchInfo[],
  predictions: PredictionInfo[]
): Map<string, GroupStanding[]> {
  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));
  const groupsAgg = new Map<string, Map<string, GroupStanding>>();

  for (const m of matches) {
    if (m.phase !== "GROUP_STAGE") continue;
    if (!m.homeTeamId || !m.awayTeamId || !m.group?.name) continue;
    const groupName = m.group.name;
    if (!groupsAgg.has(groupName)) groupsAgg.set(groupName, new Map());
    const agg = groupsAgg.get(groupName)!;
    const seed = (teamId: string) => {
      if (!agg.has(teamId)) {
        agg.set(teamId, {
          teamId,
          groupName,
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
        });
      }
    };
    seed(m.homeTeamId);
    seed(m.awayTeamId);

    const pred = predByMatch.get(m.id);
    if (!pred) continue;
    const home = agg.get(m.homeTeamId)!;
    const away = agg.get(m.awayTeamId)!;
    home.played++;
    away.played++;
    home.goalsFor += pred.homeScore;
    home.goalsAgainst += pred.awayScore;
    away.goalsFor += pred.awayScore;
    away.goalsAgainst += pred.homeScore;
    if (pred.homeScore > pred.awayScore) home.points += 3;
    else if (pred.homeScore < pred.awayScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  // Finalize: compute goalDiff and sort each group
  const out = new Map<string, GroupStanding[]>();
  for (const [groupName, agg] of groupsAgg.entries()) {
    const list = Array.from(agg.values()).map((s) => ({
      ...s,
      goalDiff: s.goalsFor - s.goalsAgainst,
    }));
    list.sort(sortByStandings);
    out.set(groupName, list);
  }
  return out;
}

function sortByStandings(a: GroupStanding, b: GroupStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
}

/**
 * Pick the 8 best 3rd-place teams across the 12 groups (top by points/GD/GF).
 * Returns a Map<groupName, GroupStanding> of the 8 advancing 3rd-places.
 */
export function pickBestThirds(
  standingsByGroup: Map<string, GroupStanding[]>
): Map<string, GroupStanding> {
  const thirds: GroupStanding[] = [];
  for (const list of standingsByGroup.values()) {
    if (list[2]) thirds.push(list[2]);
  }
  thirds.sort(sortByStandings);
  const top8 = thirds.slice(0, 8);
  return new Map(top8.map((s) => [s.groupName, s]));
}

/**
 * Same input but returns the best 3rds as an ORDERED ARRAY (1st best, 2nd best, ...)
 * Used by slot codes like "3B:N".
 */
export function pickBestThirdsRanked(
  standingsByGroup: Map<string, GroupStanding[]>
): GroupStanding[] {
  const thirds: GroupStanding[] = [];
  for (const list of standingsByGroup.values()) {
    if (list[2]) thirds.push(list[2]);
  }
  thirds.sort(sortByStandings);
  return thirds.slice(0, 8);
}

// ---------------------------------------------------------------
// Bracket resolution
// ---------------------------------------------------------------

/**
 * Returns the resolved teams for every KO match, propagated through phases
 * using user's predicted scores. Ties result in null winner downstream.
 */
export function resolveBracket(
  matches: MatchInfo[],
  predictions: PredictionInfo[]
): ResolvedBracket {
  const standings = computeAllGroupStandings(matches, predictions);
  const bestThirds = pickBestThirds(standings);
  const bestThirdsRanked = pickBestThirdsRanked(standings);
  const predByMatchNumber = new Map<number, PredictionInfo>();
  const matchById = new Map(matches.map((m) => [m.id, m]));
  for (const p of predictions) {
    const m = matchById.get(p.matchId);
    if (m) predByMatchNumber.set(m.matchNumber, p);
  }

  const resolved: ResolvedBracket = {};

  // Helper: resolve a slot code to a teamId
  const resolveSlot = (code: string): string | null => {
    if (code.startsWith("W:")) {
      const g = code.slice(2);
      return standings.get(g)?.[0]?.teamId ?? null;
    }
    if (code.startsWith("R:")) {
      const g = code.slice(2);
      return standings.get(g)?.[1]?.teamId ?? null;
    }
    if (code.startsWith("3:")) {
      const g = code.slice(2);
      const third = bestThirds.get(g);
      return third?.teamId ?? null;
    }
    if (code.startsWith("3B:")) {
      const idx = parseInt(code.slice(3), 10) - 1;
      return bestThirdsRanked[idx]?.teamId ?? null;
    }
    if (code.startsWith("WM:")) {
      const n = parseInt(code.slice(3), 10);
      return matchWinner(n);
    }
    if (code.startsWith("LM:")) {
      const n = parseInt(code.slice(3), 10);
      return matchLoser(n);
    }
    return null;
  };

  const matchWinner = (matchNumber: number): string | null => {
    const slot = resolved[matchNumber];
    if (!slot || !slot.homeTeamId || !slot.awayTeamId) return null;
    const pred = predByMatchNumber.get(matchNumber);
    if (!pred) return null;
    if (pred.homeScore > pred.awayScore) return slot.homeTeamId;
    if (pred.awayScore > pred.homeScore) return slot.awayTeamId;
    return null; // tie -> TBD
  };

  const matchLoser = (matchNumber: number): string | null => {
    const slot = resolved[matchNumber];
    if (!slot || !slot.homeTeamId || !slot.awayTeamId) return null;
    const pred = predByMatchNumber.get(matchNumber);
    if (!pred) return null;
    if (pred.homeScore > pred.awayScore) return slot.awayTeamId;
    if (pred.awayScore > pred.homeScore) return slot.homeTeamId;
    return null; // tie -> TBD
  };

  // Resolve in match-number order so previous results are available
  const allMatchNumbers = Object.keys(BRACKET_PAIRINGS)
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);

  for (const matchNumber of allMatchNumbers) {
    const cfg = BRACKET_PAIRINGS[matchNumber];
    resolved[matchNumber] = {
      homeTeamId: resolveSlot(cfg.home),
      awayTeamId: resolveSlot(cfg.away),
    };
  }

  return resolved;
}

/**
 * Returns a human-readable label for a slot when the team is TBD.
 */
export function slotLabelFor(matchNumber: number): { home: string; away: string } | null {
  const cfg = BRACKET_PAIRINGS[matchNumber];
  if (!cfg) return null;
  return {
    home: humanizeSlot(cfg.home),
    away: humanizeSlot(cfg.away),
  };
}

function humanizeSlot(code: string): string {
  if (code.startsWith("W:")) return `Ganador ${code.slice(2)}`;
  if (code.startsWith("R:")) return `2do ${code.slice(2)}`;
  if (code.startsWith("3:")) return `3ro ${code.slice(2)}`;
  if (code.startsWith("3B:")) return `${code.slice(3)}o mejor 3ro`;
  if (code.startsWith("WM:")) return `Ganador #${code.slice(3)}`;
  if (code.startsWith("LM:")) return `Perdedor #${code.slice(3)}`;
  return code;
}
