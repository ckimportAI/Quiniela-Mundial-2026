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

  const members = await prisma.user.findMany({
    where: { ligaId: liga.id },
    select: {
      id: true,
      email: true,
      nickname: true,
      name: true,
      createdAt: true,
      _count: { select: { quinielas: true, paymentReports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ members });
}
