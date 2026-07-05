import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tournamentPredictionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quinielaId = searchParams.get("quinielaId");

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

  const predictions = await prisma.tournamentPrediction.findMany({
    where: { quinielaId },
    include: { team: true },
  });

  return NextResponse.json(predictions);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Deadline: 5 minutes before the first Quarter-Finals match.
  // Once QF kicks off, the champion/subchampion/3rd race is effectively decided
  // so we lock tournament predictions there.
  const firstQF = await prisma.match.findFirst({
    where: { phase: "QUARTER_FINALS" },
    orderBy: { dateTime: "asc" },
    select: { dateTime: true },
  });
  if (firstQF?.dateTime) {
    const deadline = new Date(firstQF.dateTime.getTime() - 5 * 60 * 1000);
    if (new Date() >= deadline) {
      return NextResponse.json(
        { error: "El plazo para predicciones de torneo ha expirado" },
        { status: 403 }
      );
    }
  }

  const body = await request.json();
  const parsed = tournamentPredictionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { quinielaId, type, teamId, groupId, playerName } = parsed.data;

  // Verify quiniela belongs to user
  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
  });
  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  // Validate: team predictions need teamId, scorer needs playerName
  if (type === "TOP_SCORER" && !playerName) {
    return NextResponse.json(
      { error: "Debes ingresar el nombre del goleador" },
      { status: 400 }
    );
  }

  if (
    ["CHAMPION", "RUNNER_UP", "THIRD_PLACE"].includes(type) &&
    !teamId
  ) {
    return NextResponse.json(
      { error: "Debes seleccionar un equipo" },
      { status: 400 }
    );
  }

  if (
    ["GROUP_WINNER", "GROUP_RUNNER_UP"].includes(type) &&
    (!teamId || !groupId)
  ) {
    return NextResponse.json(
      { error: "Debes seleccionar un equipo y un grupo" },
      { status: 400 }
    );
  }

  // Upsert tournament prediction
  const prediction = await prisma.tournamentPrediction.upsert({
    where: {
      quinielaId_type_groupId: {
        quinielaId,
        type: type as any,
        groupId: groupId ?? "NONE",
      },
    },
    update: {
      teamId: teamId ?? null,
      playerName: playerName ?? null,
    },
    create: {
      userId: session.user.id,
      quinielaId,
      type: type as any,
      teamId: teamId ?? null,
      groupId: groupId ?? null,
      playerName: playerName ?? null,
    },
    include: { team: true },
  });

  return NextResponse.json(prediction);
}
