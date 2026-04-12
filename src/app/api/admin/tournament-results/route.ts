import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results = await prisma.tournamentResult.findMany();
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { type, teamId, playerName, groupId } = body;

  if (!type) {
    return NextResponse.json(
      { error: "Tipo de resultado requerido" },
      { status: 400 }
    );
  }

  const result = await prisma.tournamentResult.upsert({
    where: {
      type_groupId: {
        type,
        groupId: groupId ?? "NONE",
      },
    },
    update: {
      teamId: teamId ?? null,
      playerName: playerName ?? null,
    },
    create: {
      type,
      teamId: teamId ?? null,
      groupId: groupId ?? null,
      playerName: playerName ?? null,
    },
  });

  // Calculate points for matching predictions
  const pointsMap: Record<string, number> = {
    CHAMPION: 20,
    RUNNER_UP: 10,
    THIRD_PLACE: 5,
    TOP_SCORER: 5,
    GROUP_WINNER: 5,
    GROUP_RUNNER_UP: 3,
  };

  const matchingPreds = await prisma.tournamentPrediction.findMany({
    where: { type: type as any },
  });

  for (const pred of matchingPreds) {
    let points = 0;
    if (type === "TOP_SCORER") {
      if (
        pred.playerName &&
        playerName &&
        pred.playerName.toLowerCase().trim() ===
          playerName.toLowerCase().trim()
      ) {
        points = pointsMap[type] ?? 0;
      }
    } else if (
      ["GROUP_WINNER", "GROUP_RUNNER_UP"].includes(type) &&
      pred.groupId === groupId &&
      pred.teamId === teamId
    ) {
      points = pointsMap[type] ?? 0;
    } else if (pred.teamId === teamId) {
      points = pointsMap[type] ?? 0;
    }

    await prisma.tournamentPrediction.update({
      where: { id: pred.id },
      data: { points },
    });
  }

  // Log action
  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "SET_TOURNAMENT_RESULT",
      details: `${type}: ${teamId ?? playerName}`,
    },
  });

  return NextResponse.json(result);
}
