import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeCrearQuiniela } from "@/lib/constants";

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

  return NextResponse.json({
    quiniela: { id: quiniela.id, name: quiniela.name },
    matches,
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

  // Build upsert operations for each non-empty match pick
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  for (const p of matchPicks) {
    if (!p.matchId) continue;
    // Require both scores to save
    if (p.homeScore == null || p.awayScore == null) continue;
    if (!Number.isInteger(p.homeScore) || !Number.isInteger(p.awayScore)) continue;
    if (p.homeScore < 0 || p.awayScore < 0 || p.homeScore > 20 || p.awayScore > 20) continue;

    ops.push(
      prisma.prediction.upsert({
        where: {
          quinielaId_matchId: {
            quinielaId,
            matchId: p.matchId,
          },
        },
        update: {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          predictedHomeTeamId: p.predictedHomeTeamId ?? null,
          predictedAwayTeamId: p.predictedAwayTeamId ?? null,
        },
        create: {
          userId: session.user.id,
          quinielaId,
          matchId: p.matchId,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          predictedHomeTeamId: p.predictedHomeTeamId ?? null,
          predictedAwayTeamId: p.predictedAwayTeamId ?? null,
        },
      })
    );
  }

  // Tournament picks (CHAMPION, RUNNER_UP, THIRD_PLACE, TOP_SCORER)
  const ALLOWED_TYPES = ["CHAMPION", "RUNNER_UP", "THIRD_PLACE", "TOP_SCORER"];
  for (const t of tournamentPicks) {
    if (!ALLOWED_TYPES.includes(t.type)) continue;
    const hasTeam = !!t.teamId;
    const hasPlayer = !!t.playerName;
    if (!hasTeam && !hasPlayer) continue;

    ops.push(
      prisma.tournamentPrediction.upsert({
        where: {
          quinielaId_type_groupId: {
            quinielaId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: t.type as any,
            // Prisma compound unique requires this exact triple; use empty string sentinel
            // groupId is nullable but in unique constraint we treat null as ""
            // To keep consistent we just use upsert by find/then-update fallback below.
            groupId: "",
          },
        },
        update: {
          teamId: t.teamId ?? null,
          playerName: t.playerName ?? null,
        },
        create: {
          userId: session.user.id,
          quinielaId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: t.type as any,
          teamId: t.teamId ?? null,
          playerName: t.playerName ?? null,
        },
      })
    );
  }

  // Tournament upsert above relies on groupId in unique, but actual data may have groupId=null.
  // Fallback: explicit find-or-create per type to be safe.
  // Replace the tournamentPicks ops with safer logic:
  ops.length = 0;
  // Re-add match picks first
  for (const p of matchPicks) {
    if (!p.matchId) continue;
    if (p.homeScore == null || p.awayScore == null) continue;
    if (!Number.isInteger(p.homeScore) || !Number.isInteger(p.awayScore)) continue;
    if (p.homeScore < 0 || p.awayScore < 0 || p.homeScore > 20 || p.awayScore > 20) continue;
    ops.push(
      prisma.prediction.upsert({
        where: { quinielaId_matchId: { quinielaId, matchId: p.matchId } },
        update: {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          predictedHomeTeamId: p.predictedHomeTeamId ?? null,
          predictedAwayTeamId: p.predictedAwayTeamId ?? null,
        },
        create: {
          userId: session.user.id,
          quinielaId,
          matchId: p.matchId,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          predictedHomeTeamId: p.predictedHomeTeamId ?? null,
          predictedAwayTeamId: p.predictedAwayTeamId ?? null,
        },
      })
    );
  }

  await prisma.$transaction(ops);

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
