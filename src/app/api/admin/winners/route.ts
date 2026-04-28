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

  const winners = await prisma.ganador.findMany({
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          name: true,
          email: true,
          phone: true,
          cedula: true,
        },
      },
      quiniela: { select: { id: true, name: true } },
    },
    orderBy: [{ posicion: "asc" }, { puntosFinales: "desc" }],
  });

  return NextResponse.json({ winners });
}
