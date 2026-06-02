import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeCrearQuiniela } from "@/lib/constants";
import { resolveBracket, slotLabelFor, type MatchInfo, type PredictionInfo } from "@/lib/bracket";

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
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    group: m.group,
  }));
  const predictionInfos: PredictionInfo[] = predictions
    .map((p) => ({
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
    }));
  const resolved = resolveBracket(matchInfos, predictionInfos);

  // Enrich each match with resolvedHomeTeamId/awayTeamId + human slot label
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const enrichedMatches = matches.map((m) => {
    const r = resolved[m.matchNumber];
    const slotLabel = slotLabelFor(m.matchNumber);
    return {
      ...m,
      resolvedHomeTeam: r?.homeTeamId ? teamById.get(r.homeTeamId) ?? null : null,
      resolvedAwayTeam: r?.awayTeamId ? teamById.get(r.awayTeamId) ?? null : null,
      slotLabel,
    };
  });

  return NextResponse.json({
    quiniela: { id: quiniela.id, name: quiniela.name },
    matches: enrichedMatches,
    teams,
    predictions,
    tournamentPicks,
    canEdit: puedeCrearQuiniela(),
  });
}

// POST: save all predictions in one shot
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!puedeCrearQuiniela()) {
    return NextResponse.json(
      { error: "El periodo de predicciones ha cerrado" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const quinielaId = String(body.quinielaId ?? "");
  const matchPicks: Array<{
    matchId: string;
    homeScore: number | null;
    awayScore: number | null;
    predictedHomeTeamId?: string | null;
    predictedAwayTeamId?: string | null;
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

  // Save the raw scores first (no predicted teams yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];
  for (const p of validPicks) {
    ops.push(
      prisma.prediction.upsert({
        where: { quinielaId_matchId: { quinielaId, matchId: p.matchId } },
        update: {
          homeScore: p.homeScore!,
          awayScore: p.awayScore!,
        },
        create: {
          userId: session.user.id,
          quinielaId,
          matchId: p.matchId,
          homeScore: p.homeScore!,
          awayScore: p.awayScore!,
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

  const ALLOWED_TYPES = ["CHAMPION", "RUNNER_UP", "THIRD_PLACE", "TOP_SCORER"];

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

  return NextResponse.json({ success: true });
}
