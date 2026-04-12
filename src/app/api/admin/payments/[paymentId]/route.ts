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
    // Approve: update payment + increment user credits in a transaction
    const [updatedPayment] = await prisma.$transaction([
      prisma.paymentReport.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: { credits: { increment: payment.credits } },
      }),
      prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: "APPROVE_PAYMENT",
          details: `Approved payment #${paymentId}: ${payment.credits} credits for user ${payment.userId}`,
        },
      }),
    ]);

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
