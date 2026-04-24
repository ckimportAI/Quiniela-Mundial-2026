import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const saldos = await prisma.saldoFavor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const unused = saldos.filter((s) => !s.isUsed);
  const totalUsd = unused.reduce((sum, s) => sum + Number(s.montoUsd), 0);
  const totalBs = unused.reduce((sum, s) => sum + Number(s.montoBs), 0);

  return NextResponse.json({
    saldos: saldos.map((s) => ({
      id: s.id,
      montoUsd: Number(s.montoUsd),
      montoBs: Number(s.montoBs),
      tasaEurBcv: Number(s.tasaEurBcv),
      isUsed: s.isUsed,
      usedAt: s.usedAt?.toISOString() ?? null,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
    totalUsd,
    totalBs,
    availableCount: unused.length,
  });
}
