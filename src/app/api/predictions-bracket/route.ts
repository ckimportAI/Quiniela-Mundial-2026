import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeCrearQuiniela } from "@/lib/constants";
import {
  resolveBracket,
  slotLabelFor,
  computeAllGroupStandings,
  pickBestThirds,
  computePhaseDeadlines,
  phaseIsLocked,
  type MatchInfo,
  type PredictionInfo,
} from "@/lib/bracket";

export const dynamic = "force-dynamic";

// GET: full bracket data for the liga member's quiniela
// Returns matches grouped by phase + user's existing predictions + tournament picks
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const quinielaId = request.nextUrl.searchParams.get("quinielaId");
  if (!quinielaId) {
    return NextResponse.json({ error: "quinielaId requerido" }, { status: 400 });
  }

  // Verify ownership + liga membership
  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
    select: { id: true, userId: true, ligaId: true, name: true },
  });
  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }
  if (!quiniela.ligaId) {
    return NextResponse.json(
      { error: "Esta quiniela no es de una liga; usa /predicciones" },
      { status: 400 }
    );
  }

  const [matches, predictions, tournamentPicks, teams] = await Promise.all([
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        group: { select: { name: true } },
      },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.prediction.findMany({
      where: { quinielaId },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        predictedHomeTeamId: true,
        predictedAwayTeamId: true,
        winnerOnPenaltiesTeamId: true,
      },
    }),
    prisma.tournamentPrediction.findMany({
      where: { quinielaId },
      select: { type: true, teamId: true, playerName: true },
    }),
    prisma.team.findMany({
      include: { group: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Compute resolved bracket from user's group-stage predictions
  const matchInfos: MatchInfo[] = matches.map((m) => ({
    id: m.id,
    matchNumber: m.matchNumber,
    phase: m.phase,
    dateTime: m.dateTime,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    group: m.group,
  }));
  const predictionInfos: PredictionInfo[] = predictions
    .map((p) => ({
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      winnerOnPenaltiesTeamId: p.winnerOnPenaltiesTeamId,
    }));
  const resolved = resolveBracket(matchInfos, predictionInfos);

  // Compute standings + best 3rds for the standings tab
  const standings = computeAllGroupStandings(matchInfos, predictionInfos);
  const bestThirds = pickBestThirds(standings);
  const standingsArray = Array.from(standings.entries()).map(([groupName, list]) => ({
    groupName,
    teams: list.map((s, idx) => {
      const team = teams.find((t) => t.id === s.teamId);
      return {
        rank: idx + 1,
        teamId: s.teamId,
        teamName: team?.name ?? s.teamId,
        teamFlag: team?.flag ?? null,
        played: s.played,
        points: s.points,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDiff: s.goalDiff,
        isBestThird: idx === 2 && bestThirds.has(groupName),
      };
    }),
  }));
  standingsArray.sort((a, b) => a.groupName.localeCompare(b.groupName));

  // Enrich each match with resolvedHomeTeamId/awayTeamId + human slot label
  // Prefer the actual DB-stored teams (set by admin) over the auto-resolver output
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const enrichedMatches = matches.map((m) => {
    const r = resolved[m.matchNumber];
    const slotLabel = slotLabelFor(m.matchNumber);
    const dbHomeTeam = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
    const dbAwayTeam = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
    return {
      ...m,
      resolvedHomeTeam:
        dbHomeTeam ?? (r?.homeTeamId ? teamById.get(r.homeTeamId) ?? null : null),
      resolvedAwayTeam:
        dbAwayTeam ?? (r?.awayTeamId ? teamById.get(r.awayTeamId) ?? null : null),
      slotLabel,
    };
  });

  // Auto-derive championship picks from the bracket (read-only in UI)
  const predByMatchNumberGet = new Map<number, { homeScore: number; awayScore: number; winnerOnPenaltiesTeamId: string | null }>();
  for (const p of predictions) {
    const match = matches.find((m) => m.id === p.matchId);
    if (match) {
      predByMatchNumberGet.set(match.matchNumber, {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winnerOnPenaltiesTeamId: p.winnerOnPenaltiesTeamId,
      });
    }
  }
  function resolveWLGet(matchNumber: number) {
    const slot = resolved[matchNumber];
    const pred = predByMatchNumberGet.get(matchNumber);
    if (!slot?.homeTeamId || !slot?.awayTeamId || !pred) return { winner: null, loser: null };
    if (pred.homeScore > pred.awayScore) return { winner: slot.homeTeamId, loser: slot.awayTeamId };
    if (pred.awayScore > pred.homeScore) return { winner: slot.awayTeamId, loser: slot.homeTeamId };
    if (pred.winnerOnPenaltiesTeamId === slot.homeTeamId) return { winner: slot.homeTeamId, loser: slot.awayTeamId };
    if (pred.winnerOnPenaltiesTeamId === slot.awayTeamId) return { winner: slot.awayTeamId, loser: slot.homeTeamId };
    return { winner: null, loser: null };
  }
  const finalWL = resolveWLGet(104);
  const thirdWL = resolveWLGet(103);
  const derived = {
    championTeamId: finalWL.winner,
    runnerUpTeamId: finalWL.loser,
    thirdPlaceTeamId: thirdWL.winner,
  };

  // ---------------------------------------------------------------
  // Completeness report
  // ---------------------------------------------------------------
  const phaseTotals = {
    GROUP_STAGE: 0,
    ROUND_OF_32: 0,
    ROUND_OF_16: 0,
    QUARTER_FINALS: 0,
    SEMI_FINALS: 0,
    THIRD_PLACE: 0,
    FINAL: 0,
  } as Record<string, number>;
  const phaseFilled = { ...phaseTotals };
  const phaseFillable = { ...phaseTotals }; // KO matches where both teams are resolved

  let openTiesCount = 0;

  for (const m of matches) {
    phaseTotals[m.phase] = (phaseTotals[m.phase] ?? 0) + 1;
    const r = resolved[m.matchNumber];
    const bothTeamsKnown =
      m.phase === "GROUP_STAGE"
        ? !!(m.homeTeamId && m.awayTeamId)
        : !!(r?.homeTeamId && r?.awayTeamId);
    if (bothTeamsKnown) phaseFillable[m.phase] = (phaseFillable[m.phase] ?? 0) + 1;

    const pred = predictions.find((p) => p.matchId === m.id);
    if (pred) {
      phaseFilled[m.phase] = (phaseFilled[m.phase] ?? 0) + 1;
      // KO ties without penalty winner
      if (
        m.phase !== "GROUP_STAGE" &&
        pred.homeScore === pred.awayScore &&
        bothTeamsKnown &&
        !pred.winnerOnPenaltiesTeamId
      ) {
        openTiesCount++;
      }
    }
  }

  const topScorerEntry = tournamentPicks.find((t) => t.type === "TOP_SCORER");
  const topScorerFilled = !!(topScorerEntry?.playerName && topScorerEntry.playerName.trim());

  // Once a phase is locked, we don't count its unfilled slots as "still missing"
  // since the user can no longer fill them. The user "missed" them — separate concept.
  const phaseDeadlinesEarly = computePhaseDeadlines(matchInfos);
  const nowEarly = new Date();
  for (const phase of Object.keys(phaseTotals)) {
    if (phaseIsLocked(phase, phaseDeadlinesEarly, nowEarly)) {
      phaseFillable[phase] = phaseFilled[phase] ?? 0;
    }
  }

  const totalRequired = matches.length + 1; // matches + top scorer
  const totalFilled =
    Object.values(phaseFilled).reduce((a, b) => a + b, 0) + (topScorerFilled ? 1 : 0);
  const percent = Math.round((totalFilled / totalRequired) * 100);

  const completeness = {
    percent,
    isComplete: totalFilled === totalRequired && openTiesCount === 0,
    totalRequired,
    totalFilled,
    phases: Object.keys(phaseTotals).map((phase) => ({
      phase,
      total: phaseTotals[phase],
      filled: phaseFilled[phase],
      fillable: phaseFillable[phase],
    })),
    openTiesCount,
    topScorerFilled,
  };

  // Phase deadlines + current lock state
  const phaseDeadlines = computePhaseDeadlines(matchInfos);
  const now = new Date();
  const phaseLocks: Record<string, boolean> = {};
  for (const phase of Object.keys(phaseDeadlines)) {
    phaseLocks[phase] = phaseIsLocked(phase, phaseDeadlines, now);
  }

  return NextResponse.json({
    quiniela: { id: quiniela.id, name: quiniela.name },
    matches: enrichedMatches,
    teams,
    predictions,
    tournamentPicks,
    standings: standingsArray,
    derived,
    completeness,
    phaseDeadlines: Object.fromEntries(
      Object.entries(phaseDeadlines).map(([k, v]) => [k, v.toISOString()])
    ),
    phaseLocks,
    // After the tournament starts, per-match lock takes over. Always allow
    // opening the editor; the POST handler still rejects edits to locked
    // matches individually.
    canEdit: true,
  });
}

// POST: save all predictions in one shot
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // No global cutoff: per-match lock (5 min before kickoff) is enforced
  // further down. Picks for already-locked matches are silently dropped so
  // the user can still save predictions for upcoming matches.

  const body = await request.json();
  const quinielaId = String(body.quinielaId ?? "");
  const matchPicks: Array<{
    matchId: string;
    homeScore: number | null;
    awayScore: number | null;
    predictedHomeTeamId?: string | null;
    predictedAwayTeamId?: string | null;
    winnerOnPenaltiesTeamId?: string | null;
  }> = Array.isArray(body.matchPicks) ? body.matchPicks : [];
  const tournamentPicks: Array<{
    type: string;
    teamId?: string | null;
    playerName?: string | null;
  }> = Array.isArray(body.tournamentPicks) ? body.tournamentPicks : [];

  // Verify ownership
  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
    select: { id: true, userId: true, ligaId: true },
  });
  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }
  if (!quiniela.ligaId) {
    return NextResponse.json(
      { error: "Esta quiniela no es de una liga" },
      { status: 400 }
    );
  }

  // Validate match picks (require integer scores in range)
  const validPicks = matchPicks.filter(
    (p) =>
      p.matchId &&
      p.homeScore != null &&
      p.awayScore != null &&
      Number.isInteger(p.homeScore) &&
      Number.isInteger(p.awayScore) &&
      p.homeScore >= 0 &&
      p.awayScore >= 0 &&
      p.homeScore <= 20 &&
      p.awayScore <= 20
  );

  // Per-match lockdown: drop picks whose match kicks off within 5 minutes
  const PER_MATCH_LOCK_MINUTES = 5;
  const allMatchesForLock = await prisma.match.findMany({
    select: { id: true, dateTime: true },
  });
  const matchDeadlines = new Map(
    allMatchesForLock.map((m) => [
      m.id,
      new Date(m.dateTime.getTime() - PER_MATCH_LOCK_MINUTES * 60 * 1000),
    ])
  );
  const nowPost = new Date();
  const editablePicks = validPicks.filter((p) => {
    const deadline = matchDeadlines.get(p.matchId);
    return !deadline || nowPost < deadline;
  });
  const blockedCount = validPicks.length - editablePicks.length;

  // Save the raw scores first (no predicted teams yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];
  for (const p of editablePicks) {
    // Only persist penalty winner when it's actually a tie
    const isTie = p.homeScore === p.awayScore;
    const penaltyWinner = isTie ? p.winnerOnPenaltiesTeamId ?? null : null;
    ops.push(
      prisma.prediction.upsert({
        where: { quinielaId_matchId: { quinielaId, matchId: p.matchId } },
        update: {
          homeScore: p.homeScore!,
          awayScore: p.awayScore!,
          winnerOnPenaltiesTeamId: penaltyWinner,
        },
        create: {
          userId: session.user.id,
          quinielaId,
          matchId: p.matchId,
          homeScore: p.homeScore!,
          awayScore: p.awayScore!,
          winnerOnPenaltiesTeamId: penaltyWinner,
        },
      })
    );
  }
  await prisma.$transaction(ops);

  // Re-resolve bracket and persist resolved teams as predictedHomeTeamId/awayTeamId.
  // This makes scoring (which compares predictedHomeTeamId vs match.homeTeamId)
  // award points only when the user's predicted bracket actually materializes.
  const allMatches = await prisma.match.findMany({
    include: { group: { select: { name: true } } },
    orderBy: { matchNumber: "asc" },
  });
  const allPreds = await prisma.prediction.findMany({
    where: { quinielaId },
    select: { matchId: true, homeScore: true, awayScore: true },
  });
  const matchInfos: MatchInfo[] = allMatches.map((m) => ({
    id: m.id,
    matchNumber: m.matchNumber,
    phase: m.phase,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    group: m.group,
  }));
  const predInfos: PredictionInfo[] = allPreds;
  const resolved = resolveBracket(matchInfos, predInfos);

  // For each KO match, update the prediction with the resolved teams
  for (const m of allMatches) {
    if (m.phase === "GROUP_STAGE") continue;
    const r = resolved[m.matchNumber];
    if (!r) continue;
    await prisma.prediction.updateMany({
      where: { quinielaId, matchId: m.id },
      data: {
        predictedHomeTeamId: r.homeTeamId,
        predictedAwayTeamId: r.awayTeamId,
      },
    });
  }

  // ---------------------------------------------------------------
  // Auto-derive Champion / Runner-up / Third place from final + 3rd-place match
  // ---------------------------------------------------------------
  const predByMatchNumber = new Map<number, { homeScore: number; awayScore: number; winnerOnPenaltiesTeamId: string | null }>();
  const allPredsWithMatch = await prisma.prediction.findMany({
    where: { quinielaId },
    include: { match: { select: { matchNumber: true } } },
  });
  for (const p of allPredsWithMatch) {
    predByMatchNumber.set(p.match.matchNumber, {
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      winnerOnPenaltiesTeamId: p.winnerOnPenaltiesTeamId,
    });
  }

  function resolveWinnerLoser(matchNumber: number): { winner: string | null; loser: string | null } {
    const slot = resolved[matchNumber];
    const pred = predByMatchNumber.get(matchNumber);
    if (!slot?.homeTeamId || !slot?.awayTeamId || !pred) {
      return { winner: null, loser: null };
    }
    if (pred.homeScore > pred.awayScore) return { winner: slot.homeTeamId, loser: slot.awayTeamId };
    if (pred.awayScore > pred.homeScore) return { winner: slot.awayTeamId, loser: slot.homeTeamId };
    // Tie -> penalty winner
    if (pred.winnerOnPenaltiesTeamId === slot.homeTeamId) {
      return { winner: slot.homeTeamId, loser: slot.awayTeamId };
    }
    if (pred.winnerOnPenaltiesTeamId === slot.awayTeamId) {
      return { winner: slot.awayTeamId, loser: slot.homeTeamId };
    }
    return { winner: null, loser: null };
  }

  const finalRes = resolveWinnerLoser(104);
  const thirdPlaceRes = resolveWinnerLoser(103);

  const autoDerived: Array<{ type: string; teamId: string | null }> = [
    { type: "CHAMPION", teamId: finalRes.winner },
    { type: "RUNNER_UP", teamId: finalRes.loser },
    { type: "THIRD_PLACE", teamId: thirdPlaceRes.winner },
  ];

  for (const d of autoDerived) {
    // Delete any existing entry for this type
    await prisma.tournamentPrediction.deleteMany({
      where: {
        quinielaId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: d.type as any,
        groupId: null,
      },
    });
    if (d.teamId) {
      await prisma.tournamentPrediction.create({
        data: {
          userId: session.user.id,
          quinielaId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: d.type as any,
          teamId: d.teamId,
        },
      });
    }
  }

  const ALLOWED_TYPES = ["TOP_SCORER"];

  // Handle tournament picks separately (delete-and-recreate for simplicity)
  for (const t of tournamentPicks) {
    if (!ALLOWED_TYPES.includes(t.type)) continue;
    const hasTeam = !!t.teamId;
    const hasPlayer = !!t.playerName;
    if (!hasTeam && !hasPlayer) continue;

    // Remove existing entry for this type (groupId null) then create
    await prisma.tournamentPrediction.deleteMany({
      where: {
        quinielaId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: t.type as any,
        groupId: null,
      },
    });
    await prisma.tournamentPrediction.create({
      data: {
        userId: session.user.id,
        quinielaId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: t.type as any,
        teamId: t.teamId ?? null,
        playerName: t.playerName ?? null,
      },
    });
  }

  return NextResponse.json({ success: true, blockedCount });
}
