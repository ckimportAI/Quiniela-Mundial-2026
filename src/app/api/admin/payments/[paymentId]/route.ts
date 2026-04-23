import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewPaymentSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { paymentId } = await params;

  const body = await request.json();
  const parsed = reviewPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Fetch the payment report
  const payment = await prisma.paymentReport.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Este pago ya fue revisado" },
      { status: 400 }
    );
  }

  if (parsed.data.status === "APPROVED") {
    // Fetch user to auto-name quinielas
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { nickname: true, name: true, _count: { select: { quinielas: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const nickname = user.nickname ?? user.name ?? "user";
    const existingCount = user._count.quinielas;
    const toCreate = payment.credits; // already includes promo if applied

    // If payment is package-based → auto-create quinielas.
    // If legacy credit-only payment → just increment credits.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: any[] = [
      prisma.paymentReport.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          quinielasGranted: payment.packageId ? toCreate : 0,
        },
      }),
      prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: "APPROVE_PAYMENT",
          details: payment.packageId
            ? `Approved payment #${paymentId}: ${toCreate} quinielas for user ${payment.userId} (promo: ${payment.promoApplied})`
            : `Approved payment #${paymentId}: ${payment.credits} credits for user ${payment.userId}`,
        },
      }),
    ];

    if (payment.packageId) {
      // Auto-create N quinielas
      for (let i = 0; i < toCreate; i++) {
        ops.push(
          prisma.quiniela.create({
            data: {
              name: `${nickname}-${existingCount + i + 1}`,
              userId: payment.userId,
              score: { create: {} },
            },
          })
        );
      }
    } else {
      // Legacy: just add credits
      ops.push(
        prisma.user.update({
          where: { id: payment.userId },
          data: { credits: { increment: payment.credits } },
        })
      );
    }

    const [updatedPayment] = await prisma.$transaction(ops);

    return NextResponse.json(updatedPayment);
  } else {
    // Reject: update payment with rejection note
    const updatedPayment = await prisma.$transaction([
      prisma.paymentReport.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          rejectionNote: parsed.data.rejectionNote ?? null,
        },
      }),
      prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: "REJECT_PAYMENT",
          details: `Rejected payment #${paymentId}: ${parsed.data.rejectionNote ?? "No reason"}`,
        },
      }),
    ]);

    return NextResponse.json(updatedPayment[0]);
  }
}
