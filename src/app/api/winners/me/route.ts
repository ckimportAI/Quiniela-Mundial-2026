import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET: my winning records
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const winners = await prisma.ganador.findMany({
    where: { userId: session.user.id },
    include: {
      quiniela: { select: { id: true, name: true } },
    },
    orderBy: [{ posicion: "asc" }, { puntosFinales: "desc" }],
  });

  return NextResponse.json({ winners });
}

const submitDataSchema = z.object({
  ganadorId: z.string(),
  bancoCobro: z.string().min(2).max(50),
  telefonoCobro: z.string().min(7).max(20),
  cedulaCobro: z.string().min(5).max(20),
  notasCobro: z.string().max(500).optional(),
});

// PATCH: submit cobro data
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submitDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ganador = await prisma.ganador.findUnique({
    where: { id: parsed.data.ganadorId },
  });
  if (!ganador) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (ganador.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (ganador.status === "PAGADO") {
    return NextResponse.json(
      { error: "Este premio ya fue pagado" },
      { status: 400 }
    );
  }
  if (ganador.status === "NO_RECLAMADO") {
    return NextResponse.json(
      { error: "Este premio fue marcado como no reclamado" },
      { status: 400 }
    );
  }

  // Check deadline
  if (new Date() > ganador.fechaLimite) {
    return NextResponse.json(
      {
        error: `El plazo para reclamar el premio vencio el ${ganador.fechaLimite.toLocaleDateString("es-VE")}`,
      },
      { status: 400 }
    );
  }

  const updated = await prisma.ganador.update({
    where: { id: parsed.data.ganadorId },
    data: {
      bancoCobro: parsed.data.bancoCobro,
      telefonoCobro: parsed.data.telefonoCobro,
      cedulaCobro: parsed.data.cedulaCobro,
      notasCobro: parsed.data.notasCobro ?? null,
      fechaDatosCobro: new Date(),
      status: "DATOS_RECIBIDOS",
    },
  });

  return NextResponse.json(updated);
}
