import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { paymentId } = await params;
  const body = await request.json();
  const newStatus = body.status as "APPROVED" | "REJECTED";
  if (!["APPROVED", "REJECTED"].includes(newStatus)) {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }

  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!liga) {
    return NextResponse.json({ error: "Sin liga" }, { status: 404 });
  }

  const payment = await prisma.paymentReport.findUnique({
    where: { id: paymentId },
  });
  if (!payment || payment.ligaId !== liga.id) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Este pago ya fue revisado" }, { status: 400 });
  }

  if (newStatus === "REJECTED") {
    const updated = await prisma.paymentReport.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionNote: typeof body.rejectionNote === "string" ? body.rejectionNote.slice(0, 500) : null,
      },
    });
    return NextResponse.json(updated);
  }

  // APPROVED: create quinielas with ligaId set
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: {
      nickname: true,
      name: true,
      _count: { select: { quinielas: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  const nickname = user.nickname ?? user.name ?? "user";
  const existingCount = user._count.quinielas;
  const toCreate = payment.credits;

  // If linked general opt-in payment is already APPROVED -> mark quinielas as alsoInGeneral
  let alsoInGeneral = false;
  if (payment.linkedPaymentId) {
    const linked = await prisma.paymentReport.findUnique({
      where: { id: payment.linkedPaymentId },
      select: { status: true },
    });
    if (linked?.status === "APPROVED") alsoInGeneral = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [
    prisma.paymentReport.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        quinielasGranted: toCreate,
      },
    }),
  ];

  for (let i = 0; i < toCreate; i++) {
    ops.push(
      prisma.quiniela.create({
        data: {
          name: `${nickname}-${existingCount + i + 1}`,
          userId: payment.userId,
          ligaId: liga.id,
          alsoInGeneral,
          score: { create: {} },
        },
      })
    );
  }

  const [updatedPayment] = await prisma.$transaction(ops);
  return NextResponse.json(updatedPayment);
}
