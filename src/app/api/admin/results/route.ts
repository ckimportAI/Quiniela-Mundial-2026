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

  const { matchId, homeScore, awayScore, homePenalty, awayPenalty } =
    parsed.data;

  // Update match result
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      homePenalty: homePenalty ?? null,
      awayPenalty: awayPenalty ?? null,
      status: "FINISHED",
      locked: true,
    },
  });

  // Calculate points for all predictions of this match
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
  });

  for (const prediction of predictions) {
    const points = calculateMatchPoints(
      { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      { homeScore, awayScore },
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
