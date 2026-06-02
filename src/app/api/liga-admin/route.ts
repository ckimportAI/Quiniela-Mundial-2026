import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLigaForUser } from "@/lib/liga-context";

export const dynamic = "force-dynamic";

// GET: returns the liga owned by the current user + summary stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!liga) {
    return NextResponse.json({ error: "No eres dueno de ninguna liga" }, { status: 404 });
  }

  const [members, quinielas, payments, approvedTotal] = await Promise.all([
    prisma.user.count({ where: { ligaId: liga.id } }),
    prisma.quiniela.count({ where: { ligaId: liga.id } }),
    prisma.paymentReport.count({ where: { ligaId: liga.id, status: "PENDING" } }),
    prisma.paymentReport.aggregate({
      where: { ligaId: liga.id, status: "APPROVED" },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    liga,
    stats: {
      members,
      quinielas,
      pendingPayments: payments,
      approvedTotalUsd: Number(approvedTotal._sum.amount ?? 0),
    },
  });
}

// PATCH: update liga config (owner only)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!liga) {
    return NextResponse.json({ error: "No eres dueno de ninguna liga" }, { status: 404 });
  }

  // Whitelist editable fields
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.slice(0, 80);
  if (typeof body.description === "string") updates.description = body.description.slice(0, 300);
  if (typeof body.priceUsd === "number" && body.priceUsd >= 1) updates.priceUsd = body.priceUsd;
  if (typeof body.quinielasPerPurchase === "number" && body.quinielasPerPurchase >= 1) {
    updates.quinielasPerPurchase = Math.min(10, body.quinielasPerPurchase);
  }
  if (typeof body.pagoMovilPhone === "string") updates.pagoMovilPhone = body.pagoMovilPhone.slice(0, 20);
  if (typeof body.pagoMovilCedula === "string") updates.pagoMovilCedula = body.pagoMovilCedula.slice(0, 20);
  if (typeof body.pagoMovilBank === "string") updates.pagoMovilBank = body.pagoMovilBank.slice(0, 50);
  if (typeof body.zelleEmail === "string") updates.zelleEmail = body.zelleEmail.slice(0, 100);
  if (typeof body.zelleName === "string") updates.zelleName = body.zelleName.slice(0, 100);
  if (typeof body.paymentNotes === "string") updates.paymentNotes = body.paymentNotes.slice(0, 500);
  if (typeof body.prizesText === "string") updates.prizesText = body.prizesText.slice(0, 4000);

  const updated = await prisma.liga.update({
    where: { id: liga.id },
    data: updates,
  });

  return NextResponse.json({ liga: updated });
}
