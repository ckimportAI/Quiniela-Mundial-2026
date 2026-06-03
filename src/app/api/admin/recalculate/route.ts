import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMatchPoints, updateQuinielaScore } from "@/lib/scoring";
import type { MatchPhase } from "@/generated/prisma/enums";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Get all finished matches
  const finishedMatches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      homeScore: { not: null },
      awayScore: { not: null },
    },
  });

  let predictionsUpdated = 0;

  // Pre-load each liga's usePhaseMultipliers flag
  const ligas = await prisma.liga.findMany({
    select: { id: true, usePhaseMultipliers: true },
  });
  const ligaMultMap = new Map(ligas.map((l) => [l.id, l.usePhaseMultipliers]));

  // Recalculate all predictions for finished matches
  for (const match of finishedMatches) {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      include: { quiniela: { select: { ligaId: true } } },
    });

    for (const prediction of predictions) {
      const useMult = prediction.quiniela.ligaId
        ? ligaMultMap.get(prediction.quiniela.ligaId) ?? true
        : true;
      // Bracket picks: if the user predicted specific teams for a KO slot
      // (liga members), their score is only valid when the picked teams
      // match the actual teams. Otherwise 0 points.
      let pointsBlocked = false;
      if (prediction.predictedHomeTeamId || prediction.predictedAwayTeamId) {
        const homeOk = prediction.predictedHomeTeamId
          ? prediction.predictedHomeTeamId === match.homeTeamId
          : true;
        const awayOk = prediction.predictedAwayTeamId
          ? prediction.predictedAwayTeamId === match.awayTeamId
          : true;
        // Allow swapped picks (predicted A vs B, actual is B vs A)
        const swappedOk =
          prediction.predictedHomeTeamId === match.awayTeamId &&
          prediction.predictedAwayTeamId === match.homeTeamId;
        if (!swappedOk && !(homeOk && awayOk)) pointsBlocked = true;
      }

      const points = pointsBlocked
        ? 0
        : calculateMatchPoints(
            { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
            { homeScore: match.homeScore!, awayScore: match.awayScore! },
            match.phase as MatchPhase,
            prediction.isWildcard,
            useMult
          );

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { points },
      });
      predictionsUpdated++;
    }
  }

  // Recalculate tournament prediction points
  const tournamentResults = await prisma.tournamentResult.findMany();
  for (const result of tournamentResults) {
    const matchingPreds = await prisma.tournamentPrediction.findMany({
      where: { type: result.type },
    });

    for (const pred of matchingPreds) {
      let points = 0;
      if (result.type === "TOP_SCORER") {
        if (
          pred.playerName &&
          result.playerName &&
          pred.playerName.toLowerCase().trim() ===
            result.playerName.toLowerCase().trim()
        ) {
          points = 5;
        }
      } else if (pred.teamId === result.teamId) {
        const pointsMap: Record<string, number> = {
          CHAMPION: 20,
          RUNNER_UP: 10,
          THIRD_PLACE: 5,
          GROUP_WINNER: 5,
          GROUP_RUNNER_UP: 3,
        };
        points = pointsMap[result.type] ?? 0;
      }
      await prisma.tournamentPrediction.update({
        where: { id: pred.id },
        data: { points },
      });
    }
  }

  // Rebuild all quiniela scores
  const quinielas = await prisma.quiniela.findMany({
    where: {
      predictions: { some: {} },
    },
    select: { id: true },
  });

  for (const quiniela of quinielas) {
    await updateQuinielaScore(quiniela.id);
  }

  // Log action
  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "RECALCULATE_ALL",
      details: `${predictionsUpdated} predictions recalculated for ${finishedMatches.length} matches, ${quinielas.length} quinielas`,
    },
  });

  return NextResponse.json({
    matchesProcessed: finishedMatches.length,
    predictionsUpdated,
    quinielasUpdated: quinielas.length,
  });
}
