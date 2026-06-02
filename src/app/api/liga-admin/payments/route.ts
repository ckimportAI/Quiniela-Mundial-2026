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

  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!liga) {
    return NextResponse.json({ error: "Sin liga" }, { status: 404 });
  }

  const payments = await prisma.paymentReport.findMany({
    where: { ligaId: liga.id },
    include: {
      user: {
        select: { id: true, email: true, nickname: true, name: true, phone: true, cedula: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = await prisma.paymentReport.count({
    where: { ligaId: liga.id, status: "PENDING" },
  });

  return NextResponse.json({ payments, pendingCount });
}
