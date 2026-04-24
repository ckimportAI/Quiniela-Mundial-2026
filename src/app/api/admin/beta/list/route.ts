import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const quinielas = await prisma.quiniela.findMany({
    where: { isTest: true },
    include: {
      user: {
        select: { nickname: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    quinielas: quinielas.map((q) => ({
      id: q.id,
      name: q.name,
      isTest: q.isTest,
      createdAt: q.createdAt.toISOString(),
      user: q.user,
    })),
  });
}
