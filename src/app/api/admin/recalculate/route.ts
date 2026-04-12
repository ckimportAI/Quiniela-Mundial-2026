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

  // Recalculate all predictions for finished matches
  for (const match of finishedMatches) {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
    });

    for (const prediction of predictions) {
      const points = calculateMatchPoints(
        { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
        { homeScore: match.homeScore!, awayScore: match.awayScore! },
        match.phase as MatchPhase,
        prediction.isWildcard
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
