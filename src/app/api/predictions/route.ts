import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { predictionSchema } from "@/lib/validations";
import { LOCK_MINUTES_BEFORE, MAX_WILDCARDS } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quinielaId = searchParams.get("quinielaId");
  const groupId = searchParams.get("groupId");
  const matchId = searchParams.get("matchId");

  if (!quinielaId) {
    return NextResponse.json(
      { error: "quinielaId es requerido" },
      { status: 400 }
    );
  }

  // Verify quiniela belongs to user
  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
  });
  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  const where: Record<string, unknown> = {
    quinielaId,
  };

  if (matchId) {
    where.matchId = matchId;
  }

  if (groupId) {
    where.match = { groupId };
  }

  const predictions = await prisma.prediction.findMany({
    where,
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          group: true,
        },
      },
    },
    orderBy: { match: { dateTime: "asc" } },
  });

  return NextResponse.json(predictions);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = predictionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { quinielaId, matchId, homeScore, awayScore, isWildcard } = parsed.data;

  // Verify quiniela belongs to user
  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
  });
  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  // Check match exists and is not locked
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    return NextResponse.json(
      { error: "Partido no encontrado" },
      { status: 404 }
    );
  }

  // Check if match is locked (5 minutes before start)
  const lockTime = new Date(match.dateTime);
  lockTime.setMinutes(lockTime.getMinutes() - LOCK_MINUTES_BEFORE);

  if (new Date() >= lockTime) {
    return NextResponse.json(
      { error: "Las predicciones para este partido estan cerradas" },
      { status: 403 }
    );
  }

  // Check wildcard limit per quiniela
  if (isWildcard) {
    const existingWildcards = await prisma.prediction.count({
      where: {
        quinielaId,
        isWildcard: true,
        matchId: { not: matchId }, // Exclude current match (in case of update)
      },
    });

    if (existingWildcards >= MAX_WILDCARDS) {
      return NextResponse.json(
        {
          error: `Ya has usado tus ${MAX_WILDCARDS} comodines en esta quiniela`,
        },
        { status: 400 }
      );
    }
  }

  // Upsert prediction
  const prediction = await prisma.prediction.upsert({
    where: {
      quinielaId_matchId: {
        quinielaId,
        matchId,
      },
    },
    update: {
      homeScore,
      awayScore,
      isWildcard: isWildcard ?? false,
    },
    create: {
      userId: session.user.id,
      quinielaId,
      matchId,
      homeScore,
      awayScore,
      isWildcard: isWildcard ?? false,
    },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
  });

  return NextResponse.json(prediction);
}
