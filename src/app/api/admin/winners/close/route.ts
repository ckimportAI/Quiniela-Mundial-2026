import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateWinners, RECLAIM_DAYS } from "@/lib/winners";
import { z } from "zod";

const closeSchema = z.object({
  confirm: z.literal("CERRAR_TORNEO"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Confirmacion requerida: { confirm: "CERRAR_TORNEO" }' },
      { status: 400 }
    );
  }

  // Check tournament not already closed
  const existing = await prisma.ganador.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: `El torneo ya fue cerrado. Hay ${existing} ganadores registrados.` },
      { status: 400 }
    );
  }

  // Total recaudado USD
  const agg = await prisma.paymentReport.aggregate({
    where: { status: "APPROVED" },
    _sum: { amount: true },
  });
  const totalRecaudadoUsd = Number(agg._sum.amount ?? 0);

  if (totalRecaudadoUsd <= 0) {
    return NextResponse.json(
      { error: "No hay pagos aprobados. No se puede cerrar el torneo." },
      { status: 400 }
    );
  }

  // All scores
  const scores = await prisma.quinielaScore.findMany({
    include: {
      quiniela: { select: { isTest: true, userId: true } },
    },
  });

  const calc = calculateWinners(
    totalRecaudadoUsd,
    scores.map((s) => ({
      quinielaId: s.quinielaId,
      userId: s.quiniela.userId,
      totalPoints: s.totalPoints,
      isTest: s.quiniela.isTest,
    }))
  );

  if (calc.winners.length === 0) {
    return NextResponse.json(
      { error: "No hay quinielas con puntos. No se puede cerrar." },
      { status: 400 }
    );
  }

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + RECLAIM_DAYS);

  // Create all winners in a transaction
  const created = await prisma.$transaction([
    ...calc.winners.map((w) =>
      prisma.ganador.create({
        data: {
          quinielaId: w.quinielaId,
          userId: w.userId,
          posicion: w.posicion,
          puntosFinales: w.puntosFinales,
          empatadosCon: w.empatadosCon,
          premioUsd: w.premioUsd,
          fechaLimite,
        },
      })
    ),
    prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: "CLOSE_TOURNAMENT",
        details: `Cerrado torneo: ${calc.winners.length} ganadores, pool $${calc.poolUsd.toFixed(2)}`,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    poolUsd: calc.poolUsd,
    winnersCreated: calc.winners.length,
    fechaLimite: fechaLimite.toISOString(),
    created: created.slice(0, calc.winners.length),
  });
}
