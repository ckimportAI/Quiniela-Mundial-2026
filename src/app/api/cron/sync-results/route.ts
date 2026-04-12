import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getLiveScores,
  isFixtureFinished,
  extractScore,
} from "@/lib/sportmonks";
import { calculateMatchPoints, updateQuinielaScore } from "@/lib/scoring";
import type { MatchPhase } from "@/generated/prisma/enums";

// Vercel Cron: runs every 2 minutes during match days
// vercel.json: { "crons": [{ "path": "/api/cron/sync-results", "schedule": "*/2 * * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const liveFixtures = await getLiveScores();

    if (!liveFixtures || liveFixtures.length === 0) {
      return NextResponse.json({ message: "No live fixtures", updated: 0 });
    }

    let updated = 0;

    for (const fixture of liveFixtures) {
      if (!isFixtureFinished(fixture)) continue;

      const score = extractScore(fixture);
      if (!score) continue;

      // Find matching match in our DB by team codes
      const homeTeam = await prisma.team.findUnique({
        where: { code: score.homeTeamCode },
      });
      const awayTeam = await prisma.team.findUnique({
        where: { code: score.awayTeamCode },
      });

      if (!homeTeam || !awayTeam) continue;

      // Find scheduled match with these teams
      const match = await prisma.match.findFirst({
        where: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          status: { in: ["SCHEDULED", "LIVE"] },
        },
      });

      if (!match) continue;

      // Update match result
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          status: "FINISHED",
          locked: true,
        },
      });

      // Calculate points for all predictions
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      });

      for (const prediction of predictions) {
        const points = calculateMatchPoints(
          {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          },
          { homeScore: score.homeScore, awayScore: score.awayScore },
          match.phase as MatchPhase,
          prediction.isWildcard
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

      updated++;

      // Log
      await prisma.adminLog.create({
        data: {
          adminId: "SYSTEM",
          action: "AUTO_SYNC_RESULT",
          details: `Match #${match.matchNumber}: ${score.homeTeamCode} ${score.homeScore}-${score.awayScore} ${score.awayTeamCode} (via Sportmonks)`,
        },
      });
    }

    return NextResponse.json({
      message: "Sync complete",
      liveFixtures: liveFixtures.length,
      updated,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
