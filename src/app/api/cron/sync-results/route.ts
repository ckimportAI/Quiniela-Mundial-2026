import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getLiveFixtures,
  getSeasonFixtures,
  isFinished,
  isLive,
  extractFinalScore,
  getTeamNameCandidates,
  type ApiFootballFixture,
} from "@/lib/api-football";
import { calculateMatchPoints, updateQuinielaScore } from "@/lib/scoring";
import type { MatchPhase } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

/**
 * Try to find a DB match that corresponds to the API fixture.
 * Matches by team names (with normalization) and any scheduled/live match status.
 */
async function findMatchingDbMatch(fixture: ApiFootballFixture) {
  const homeCandidates = getTeamNameCandidates(fixture.teams.home.name);
  const awayCandidates = getTeamNameCandidates(fixture.teams.away.name);

  const homeTeam = await prisma.team.findFirst({
    where: {
      OR: homeCandidates.map((n) => ({
        name: { equals: n, mode: "insensitive" as const },
      })),
    },
  });

  const awayTeam = await prisma.team.findFirst({
    where: {
      OR: awayCandidates.map((n) => ({
        name: { equals: n, mode: "insensitive" as const },
      })),
    },
  });

  if (!homeTeam || !awayTeam) return null;

  return prisma.match.findFirst({
    where: {
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    },
  });
}

async function syncOne(fixture: ApiFootballFixture): Promise<
  | { skipped: true; reason: string }
  | { updated: true; matchNumber: number; homeScore: number; awayScore: number; affectedQuinielas: number }
> {
  const dbMatch = await findMatchingDbMatch(fixture);
  if (!dbMatch) {
    return { skipped: true, reason: "match not found in DB" };
  }

  // Only update if not already finished locally
  if (dbMatch.status === "FINISHED") {
    return { skipped: true, reason: "already finished locally" };
  }

  // If fixture is LIVE, we just bump status (no scoring yet)
  if (isLive(fixture) && !isFinished(fixture)) {
    if (dbMatch.status !== "LIVE") {
      await prisma.match.update({
        where: { id: dbMatch.id },
        data: { status: "LIVE", locked: true },
      });
    }
    return { skipped: true, reason: "live, no final score yet" };
  }

  if (!isFinished(fixture)) {
    return { skipped: true, reason: `status ${fixture.fixture.status.short}` };
  }

  const score = extractFinalScore(fixture);
  if (!score) {
    return { skipped: true, reason: "no final score in fixture" };
  }

  // Update match result
  await prisma.match.update({
    where: { id: dbMatch.id },
    data: {
      homeScore: score.home,
      awayScore: score.away,
      status: "FINISHED",
      locked: true,
      homePenalty: fixture.score.penalty.home,
      awayPenalty: fixture.score.penalty.away,
    },
  });

  // Score predictions
  const predictions = await prisma.prediction.findMany({
    where: { matchId: dbMatch.id },
  });

  for (const p of predictions) {
    const points = calculateMatchPoints(
      { homeScore: p.homeScore, awayScore: p.awayScore },
      { homeScore: score.home, awayScore: score.away },
      dbMatch.phase as MatchPhase,
      p.isWildcard
    );
    await prisma.prediction.update({
      where: { id: p.id },
      data: { points },
    });
  }

  // Recalculate quiniela scores
  const quinielaIds = [...new Set(predictions.map((p) => p.quinielaId))];
  for (const qid of quinielaIds) {
    await updateQuinielaScore(qid);
  }

  await prisma.adminLog.create({
    data: {
      adminId: "SYSTEM",
      action: "AUTO_SYNC_RESULT",
      details: `Match #${dbMatch.matchNumber}: ${fixture.teams.home.name} ${score.home}-${score.away} ${fixture.teams.away.name} (API-Football)`,
    },
  });

  return {
    updated: true,
    matchNumber: dbMatch.matchNumber,
    homeScore: score.home,
    awayScore: score.away,
    affectedQuinielas: quinielaIds.length,
  };
}

export async function GET(request: NextRequest) {
  // Auth: Cron-Secret for scheduled, or admin session for manual
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasValidCronAuth =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!hasValidCronAuth) {
    // Fallback: allow admin session
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const mode = request.nextUrl.searchParams.get("mode") ?? "live";

  try {
    const fixtures =
      mode === "all" ? await getSeasonFixtures() : await getLiveFixtures();

    const results: Array<
      | { skipped: true; reason: string; home?: string; away?: string }
      | { updated: true; matchNumber: number; homeScore: number; awayScore: number; affectedQuinielas: number }
    > = [];

    for (const f of fixtures) {
      const r = await syncOne(f);
      if ("skipped" in r) {
        results.push({
          ...r,
          home: f.teams.home.name,
          away: f.teams.away.name,
        });
      } else {
        results.push(r);
      }
    }

    const updatedCount = results.filter((r) => "updated" in r).length;

    return NextResponse.json({
      mode,
      fixturesChecked: fixtures.length,
      updated: updatedCount,
      results,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
