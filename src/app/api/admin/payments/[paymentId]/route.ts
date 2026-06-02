import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewPaymentSchema } from "@/lib/validations";
import { generateUniqueGiftCode } from "@/lib/gift-code";
import { FIN_CREAR_QUINIELAS } from "@/lib/constants";

const TOLERANCE = 0.02; // 2%

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

  const payment = await prisma.paymentReport.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  // Platform admin cannot touch liga payments
  if (payment.ligaId) {
    return NextResponse.json(
      { error: "Este pago pertenece a una liga privada" },
      { status: 403 }
    );
  }

  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Este pago ya fue revisado" },
      { status: 400 }
    );
  }

  if (parsed.data.status === "APPROVED") {
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: {
        nickname: true,
        name: true,
        saldoBs: true,
        _count: { select: { quinielas: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const nickname = user.nickname ?? user.name ?? "user";
    const existingCount = user._count.quinielas;
    const toCreate = payment.credits;

    // For gift payments we pre-generate the unique codes outside the transaction
    // (DB roundtrips per code lookup) and use them inside.
    const giftCodes: string[] = [];
    if (payment.isGift && payment.giftQuantity > 0) {
      for (let i = 0; i < payment.giftQuantity; i++) {
        giftCodes.push(await generateUniqueGiftCode());
      }
    }

    // ----------------------------------------------------------
    // Saldo a favor logic (only when Bs info is available)
    // ----------------------------------------------------------
    let saldoToCreateBs = 0; // amount of NEW saldo to credit (excess Bs)
    let saldoToConsumeBs = Number(payment.saldoUsadoBs ?? 0); // saldo user requested to apply

    // Validate: user can only consume up to their available saldo
    const availableSaldoBs = Number(user.saldoBs);
    if (saldoToConsumeBs > availableSaldoBs) {
      saldoToConsumeBs = availableSaldoBs;
    }

    if (payment.amountBs && payment.bcvRateEur) {
      const fullExpectedBs = Number(payment.amount) * Number(payment.bcvRateEur);
      // Effective expected = total - saldo applied
      const effectiveExpectedBs = fullExpectedBs - saldoToConsumeBs;
      const actualBs = Number(payment.amountBs);
      const diff = actualBs - effectiveExpectedBs;
      const pct =
        effectiveExpectedBs > 0 ? Math.abs(diff) / effectiveExpectedBs : 0;

      if (diff > 0 && pct > TOLERANCE) {
        saldoToCreateBs = Math.round(diff * 100) / 100;
      }
    }

    // ----------------------------------------------------------
    // Build transaction operations
    // ----------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: any[] = [
      prisma.paymentReport.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          quinielasGranted: payment.isGift ? 0 : payment.packageId ? toCreate : 0,
          saldoUsadoBs: saldoToConsumeBs > 0 ? saldoToConsumeBs : null,
          saldoCreadoBs: saldoToCreateBs > 0 ? saldoToCreateBs : null,
        },
      }),
      prisma.adminLog.create({
        data: {
          adminId: session.user.id,
          action: "APPROVE_PAYMENT",
          details: payment.isGift
            ? `Approved gift #${paymentId.slice(-8)}: ${payment.giftQuantity} codes`
            : payment.packageId
              ? `Approved #${paymentId.slice(-8)}: ${toCreate} qui, saldoUsado=${saldoToConsumeBs}, saldoCreado=${saldoToCreateBs}`
              : `Approved #${paymentId.slice(-8)}: ${payment.credits} credits`,
        },
      }),
    ];

    // Update user.saldoBs: subtract consumed, add created
    const saldoDelta = saldoToCreateBs - saldoToConsumeBs;
    if (saldoDelta !== 0) {
      ops.push(
        prisma.user.update({
          where: { id: payment.userId },
          data: { saldoBs: { increment: saldoDelta } },
        })
      );
    }

    if (payment.isGift) {
      // Create N GiftCodes (no quinielas yet, recipients redeem)
      for (const code of giftCodes) {
        ops.push(
          prisma.giftCode.create({
            data: {
              code,
              purchaserId: payment.userId,
              paymentReportId: paymentId,
              expiresAt: FIN_CREAR_QUINIELAS,
            },
          })
        );
      }
    } else if (payment.packageId) {
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
      ops.push(
        prisma.user.update({
          where: { id: payment.userId },
          data: { credits: { increment: payment.credits } },
        })
      );
    }

    const [updatedPayment] = await prisma.$transaction(ops);
    return NextResponse.json(updatedPayment);
  }

  // ---- REJECTED branch ----
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
        details: `Rejected payment #${paymentId.slice(-8)}: ${parsed.data.rejectionNote ?? "No reason"}`,
      },
    }),
  ]);

  return NextResponse.json(updatedPayment[0]);
}
