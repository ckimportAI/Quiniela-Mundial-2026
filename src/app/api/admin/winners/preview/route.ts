import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateWinners, POOL_PERCENTAGE } from "@/lib/winners";

export const dynamic = "force-dynamic";

// GET: preview winners without creating records (for admin to review before closing)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Total recaudado USD (approved payments only)
  const agg = await prisma.paymentReport.aggregate({
    where: { status: "APPROVED" },
    _sum: { amount: true },
  });
  const totalRecaudadoUsd = Number(agg._sum.amount ?? 0);

  // All quiniela scores with user + name info
  const scores = await prisma.quinielaScore.findMany({
    include: {
      quiniela: {
        include: {
          user: {
            select: { id: true, nickname: true, name: true, email: true },
          },
        },
      },
    },
  });

  const calc = calculateWinners(
    totalRecaudadoUsd,
    scores.map((s) => ({
      quinielaId: s.quinielaId,
      userId: s.quiniela.user.id,
      totalPoints: s.totalPoints,
      isTest: s.quiniela.isTest,
    }))
  );

  // Enrich winners with user info
  const userMap = new Map(
    scores.map((s) => [s.quiniela.user.id, s.quiniela])
  );

  const enriched = calc.winners.map((w) => {
    const q = userMap.get(w.userId);
    return {
      ...w,
      quinielaName: q?.name ?? "?",
      userNickname: q?.user.nickname ?? null,
      userName: q?.user.name ?? null,
      userEmail: q?.user.email ?? null,
    };
  });

  // Check if winners already created
  const existingCount = await prisma.ganador.count();

  return NextResponse.json({
    totalRecaudadoUsd,
    poolUsd: calc.poolUsd,
    poolPercentage: POOL_PERCENTAGE,
    winners: enriched,
    tournamentClosed: existingCount > 0,
  });
}
