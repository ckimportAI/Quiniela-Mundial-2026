import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const quinielas = await prisma.quiniela.findMany({
    where: { userId: session.user.id },
    include: {
      score: true,
      _count: { select: { predictions: true, tournamentPredictions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Also return user credits
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, nickname: true },
  });

  return NextResponse.json({
    quinielas,
    credits: user?.credits ?? 0,
    nickname: user?.nickname,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, credits: true, _count: { select: { quinielas: true } } },
  });

  if (!user?.nickname) {
    return NextResponse.json(
      { error: "Debes elegir un pseudonimo primero" },
      { status: 400 }
    );
  }

  if (user.credits < 1) {
    return NextResponse.json(
      { error: "No tienes creditos disponibles. Recarga en /recargas" },
      { status: 402 }
    );
  }

  // Auto-generate name: nickname-N
  const quinielaNumber = user._count.quinielas + 1;
  const quinielaName = `${user.nickname}-${quinielaNumber}`;

  // Transaction: decrement credit + create quiniela
  const [, quiniela] = await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { decrement: 1 } },
    }),
    prisma.quiniela.create({
      data: {
        name: quinielaName,
        userId: session.user.id,
      },
      include: {
        score: true,
      },
    }),
  ]);

  return NextResponse.json(quiniela, { status: 201 });
}
