import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchResultSchema } from "@/lib/validations";
import { calculateMatchPoints, updateQuinielaScore } from "@/lib/scoring";
import type { MatchPhase } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = matchResultSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    matchId,
    homeScore,
    awayScore,
    regulationHomeScore,
    regulationAwayScore,
    homePenalty,
    awayPenalty,
  } = parsed.data;

  // Update match result. regulation* holds the 90-min score for KO matches
  // decided in extra time; Equinox (usePhaseMultipliers=false) scores against
  // it instead of the final score.
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      regulationHomeScore: regulationHomeScore ?? null,
      regulationAwayScore: regulationAwayScore ?? null,
      homePenalty: homePenalty ?? null,
      awayPenalty: awayPenalty ?? null,
      status: "FINISHED",
      locked: true,
    },
  });

  // Calculate points for all predictions of this match
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { quiniela: { select: { ligaId: true } } },
  });

  // Pre-load liga scoring config (phase multipliers + wildcards)
  const ligaIds = [...new Set(predictions.map((p) => p.quiniela.ligaId).filter(Boolean) as string[])];
  const ligas = ligaIds.length
    ? await prisma.liga.findMany({
        where: { id: { in: ligaIds } },
        select: { id: true, usePhaseMultipliers: true, wildcardsEnabled: true },
      })
    : [];
  const ligaMultMap = new Map(ligas.map((l) => [l.id, l.usePhaseMultipliers]));
  const ligaWildMap = new Map(ligas.map((l) => [l.id, l.wildcardsEnabled]));

  for (const prediction of predictions) {
    const useMult = prediction.quiniela.ligaId
      ? ligaMultMap.get(prediction.quiniela.ligaId) ?? true
      : true;
    const wildOk = prediction.quiniela.ligaId
      ? ligaWildMap.get(prediction.quiniela.ligaId) ?? true
      : true;
    const effectiveWildcard = wildOk && prediction.isWildcard;
    // Bracket pick guard: liga members predict KO teams in advance; if their
    // predicted teams don't match the actual match teams, score is 0.
    let pointsBlocked = false;
    if (prediction.predictedHomeTeamId || prediction.predictedAwayTeamId) {
      const homeOk = prediction.predictedHomeTeamId
        ? prediction.predictedHomeTeamId === match.homeTeamId
        : true;
      const awayOk = prediction.predictedAwayTeamId
        ? prediction.predictedAwayTeamId === match.awayTeamId
        : true;
      const swappedOk =
        prediction.predictedHomeTeamId === match.awayTeamId &&
        prediction.predictedAwayTeamId === match.homeTeamId;
      if (!swappedOk && !(homeOk && awayOk)) pointsBlocked = true;
    }

    // Equinox (useMult=false) scores KO phases against the 90-min score.
    const useRegulation =
      !useMult &&
      match.phase !== "GROUP_STAGE" &&
      regulationHomeScore != null &&
      regulationAwayScore != null;
    const actualHome = useRegulation ? regulationHomeScore : homeScore;
    const actualAway = useRegulation ? regulationAwayScore : awayScore;

    const points = pointsBlocked
      ? 0
      : calculateMatchPoints(
          { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
          { homeScore: actualHome!, awayScore: actualAway! },
          match.phase as MatchPhase,
          effectiveWildcard,
          useMult
        );

    await prisma.prediction.update({
      where: { id: prediction.id },
      data: { points },
    });
  }

  // Update quiniela scores for all affected quinielas
  const quinielaIds = [...new Set(predictions.map((p) => p.quinielaId))];
  for (const quinielaId of quinielaIds) {
    await updateQuinielaScore(quinielaId);
  }

  // Log action
  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "SET_RESULT",
      details: `Match #${match.matchNumber}: ${homeScore}-${awayScore}`,
    },
  });

  return NextResponse.json({
    match,
    predictionsUpdated: predictions.length,
  });
}
