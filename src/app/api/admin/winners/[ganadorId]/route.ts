import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const markPaidSchema = z.object({
  action: z.literal("mark_paid"),
  metodoPago: z.string().min(2).max(50),
  referenciaPago: z.string().min(3).max(100),
  tasaEurBcvPago: z.number().positive(),
  montoPagadoBs: z.number().positive(),
  comprobanteUrl: z.string().max(300).optional(),
  notasAdmin: z.string().max(500).optional(),
});

const markUnclaimedSchema = z.object({
  action: z.literal("mark_unclaimed"),
  notasAdmin: z.string().max(500).optional(),
});

const updateAdminSchema = z.discriminatedUnion("action", [
  markPaidSchema,
  markUnclaimedSchema,
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ganadorId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ganadorId } = await params;
  const body = await request.json();
  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ganador = await prisma.ganador.findUnique({
    where: { id: ganadorId },
  });
  if (!ganador) {
    return NextResponse.json({ error: "Ganador no encontrado" }, { status: 404 });
  }
  if (ganador.status === "PAGADO") {
    return NextResponse.json(
      { error: "Este ganador ya fue marcado como pagado" },
      { status: 400 }
    );
  }

  if (parsed.data.action === "mark_paid") {
    const updated = await prisma.$transaction([
      prisma.ganador.update({
        where: { id: ganadorId },
        data: {
          status: "PAGADO",
          metodoPago: parsed.data.metodoPago,
          referenciaPago: parsed.data.referenciaPago,
          tasaEurBcvPago: parsed.data.tasaEurBcvPago,
          montoPagadoBs: parsed.data.montoPagadoBs,
          comprobanteUrl: parsed.data.comprobanteUrl ?? null,
          notasAdmin: parsed.data.notasAdmin ?? null,
          fechaPago: new Date(),
          pagadoPor: session.user.id,
        },
      }),
      prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: "PAY_WINNER",
          details: `Pagado ganador #${ganadorId.slice(-8)}: $${ganador.premioUsd} = Bs. ${parsed.data.montoPagadoBs}`,
        },
      }),
    ]);
    return NextResponse.json(updated[0]);
  }

  // mark_unclaimed
  const updated = await prisma.$transaction([
    prisma.ganador.update({
      where: { id: ganadorId },
      data: {
        status: "NO_RECLAMADO",
        notasAdmin: parsed.data.notasAdmin ?? null,
      },
    }),
    prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: "MARK_UNCLAIMED",
        details: `Marcado no reclamado: ganador #${ganadorId.slice(-8)}`,
      },
    }),
  ]);
  return NextResponse.json(updated[0]);
}
