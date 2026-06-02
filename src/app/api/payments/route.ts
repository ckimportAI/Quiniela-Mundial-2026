import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentReportSchema } from "@/lib/validations";
import {
  isOfertaBienvenidaActive,
  puedeComprarPaquete,
} from "@/lib/constants";

// GET: User's payment history (scoped by liga if member)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payments = await prisma.paymentReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });


  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, saldoBs: true },
  });

  return NextResponse.json({
    payments,
    credits: user?.credits ?? 0,
    saldoBs: Number(user?.saldoBs ?? 0),
  });
}

// POST: Submit new payment report
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Enforce purchase deadline
  if (!puedeComprarPaquete()) {
    return NextResponse.json(
      { error: "El periodo de compra de paquetes ha cerrado" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = paymentReportSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    console.error("Payment validation failed:", {
      body,
      errors: flat,
    });
    return NextResponse.json(
      { error: "Datos invalidos", details: flat },
      { status: 400 }
    );
  }

  // ----------------------------------------------------------
  // Duplicate detection (scoped by tenant context to avoid cross-talk
  // between Liga payments and the main QuinielaPanas pool)
  // ----------------------------------------------------------
  // Resolve the user's liga membership first so we can scope the lookup.
  const userForScope = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ligaId: true },
  });
  const scopeLigaId = userForScope?.ligaId ?? null;

  const dupFilters: Array<Record<string, unknown>> = [
    { reference: parsed.data.reference, method: parsed.data.method },
  ];
  if (parsed.data.amountBs && parsed.data.paymentDate) {
    const day = new Date(parsed.data.paymentDate);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    dupFilters.push({
      amountBs: parsed.data.amountBs,
      method: parsed.data.method,
      paymentDate: { gte: dayStart, lt: dayEnd },
    });
  }

  // Liga members compare against their own liga's payments only.
  // Non-liga users compare against general (ligaId IS NULL) payments only.
  const existingDuplicate = await prisma.paymentReport.findFirst({
    where: {
      ligaId: scopeLigaId,
      OR: dupFilters,
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true, userId: true, reference: true },
  });

  if (existingDuplicate) {
    const sameUser = existingDuplicate.userId === session.user.id;
    return NextResponse.json(
      {
        error: sameUser
          ? "Ya reportaste este comprobante anteriormente."
          : "Este comprobante ya fue reportado. Si crees que es un error, contacta al administrador.",
      },
      { status: 409 }
    );
  }

  let credits = parsed.data.credits ?? 0;
  let promoApplied = false;
  const isGift = parsed.data.isGift === true;
  const giftQuantity = isGift ? (parsed.data.giftQuantity ?? 0) : 0;

  // ----------------------------------------------------------
  // LIGA path: user belongs to a private liga -> custom price + scoping
  // ----------------------------------------------------------
  const memberLigaId = scopeLigaId;

  let ligaPriceUsd = 0;
  let ligaQuinielasPerPurchase = 0;
  if (memberLigaId) {
    if (isGift) {
      return NextResponse.json(
        { error: "Los miembros de una liga no pueden comprar regalos" },
        { status: 400 }
      );
    }
    const liga = await prisma.liga.findUnique({ where: { id: memberLigaId } });
    if (!liga || !liga.active) {
      return NextResponse.json(
        { error: "Tu liga no esta activa" },
        { status: 400 }
      );
    }
    ligaPriceUsd = Number(liga.priceUsd);
    ligaQuinielasPerPurchase = liga.quinielasPerPurchase;
    if (Math.abs(parsed.data.amount - ligaPriceUsd) > 0.01) {
      return NextResponse.json(
        { error: `Monto incorrecto. Esperado: $${ligaPriceUsd.toFixed(2)}` },
        { status: 400 }
      );
    }
    credits = ligaQuinielasPerPurchase;
  }

  // ----------------------------------------------------------
  // GIFT path: $10 per quiniela, no welcome bonus applies
  // ----------------------------------------------------------
  if (memberLigaId) {
    // Liga members: skip gift + package branches entirely
  } else if (isGift) {
    if (giftQuantity < 1 || giftQuantity > 10) {
      return NextResponse.json(
        { error: "La cantidad de regalos debe ser entre 1 y 10" },
        { status: 400 }
      );
    }
    // Lookup INDIVIDUAL package to derive unit price (no bonus for gifts)
    const indivPkg = await prisma.package.findUnique({
      where: { code: "INDIVIDUAL" },
    });
    if (!indivPkg) {
      return NextResponse.json(
        { error: "Paquete individual no encontrado" },
        { status: 500 }
      );
    }
    const expectedTotal = Number(indivPkg.priceUsd) * giftQuantity;
    if (Math.abs(parsed.data.amount - expectedTotal) > 0.01) {
      return NextResponse.json(
        {
          error: `Monto incorrecto. Esperado: $${expectedTotal.toFixed(2)} (${giftQuantity} x $${indivPkg.priceUsd})`,
        },
        { status: 400 }
      );
    }
    credits = giftQuantity; // tracked but not used to create quinielas for buyer
  } else if (parsed.data.packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: parsed.data.packageId },
    });
    if (!pkg || !pkg.active) {
      return NextResponse.json(
        { error: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    // Base quinielas from package
    credits = pkg.quinielasCount;

    // Welcome offer: escalonado (bonus per package) if offer active AND user hasn't used it
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ofertaBienvenidaUsada: true },
    });

    if (
      isOfertaBienvenidaActive() &&
      user &&
      !user.ofertaBienvenidaUsada &&
      pkg.bonusQuinielasOferta > 0
    ) {
      credits = pkg.quinielasCount + pkg.bonusQuinielasOferta;
      promoApplied = true;

      // Mark user as having used the welcome offer (locks bonus on future reports)
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ofertaBienvenidaUsada: true,
          fechaPrimeraCompra: new Date(),
        },
      });
    }
  }

  // Validate saldo usage doesn't exceed available
  let saldoUsadoBs: number | null = null;
  if (parsed.data.useSaldoBs && parsed.data.useSaldoBs > 0) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { saldoBs: true },
    });
    const available = Number(u?.saldoBs ?? 0);
    if (parsed.data.useSaldoBs > available) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponible: Bs. ${available.toFixed(2)}` },
        { status: 400 }
      );
    }
    saldoUsadoBs = parsed.data.useSaldoBs;
  }

  // ----------------------------------------------------------
  // Opt-in: liga member also wants to participate in general pool (+$10)
  // ----------------------------------------------------------
  const wantsGeneralOptIn =
    !!memberLigaId && parsed.data.wantsGeneralOptIn === true;
  const OPT_IN_USD = 10;

  if (wantsGeneralOptIn) {
    if (
      !parsed.data.generalReference ||
      parsed.data.generalReference.trim().length < 3
    ) {
      return NextResponse.json(
        { error: "Falta la referencia del pago de $10 al pote general" },
        { status: 400 }
      );
    }
  }

  // Create liga payment first
  const ligaPayment = await prisma.paymentReport.create({
    data: {
      userId: session.user.id,
      packageId: memberLigaId ? null : parsed.data.packageId ?? null,
      ligaId: memberLigaId ?? null,
      credits,
      amount: parsed.data.amount,
      amountBs: parsed.data.amountBs ?? null,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
      bcvRateUsd: parsed.data.bcvRateUsd ?? null,
      bcvRateEur: parsed.data.bcvRateEur ?? null,
      saldoUsadoBs,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      proofUrl: parsed.data.proofUrl ?? null,
      promoApplied,
      isGift,
      giftQuantity,
    },
  });

  // If opt-in, create the linked general $10 PaymentReport
  if (wantsGeneralOptIn) {
    const optInPayment = await prisma.paymentReport.create({
      data: {
        userId: session.user.id,
        ligaId: null, // goes to platform (you), not Leonard
        packageId: null, // no package, it's just an opt-in fee
        credits: 0, // does not grant any new quiniela
        amount: OPT_IN_USD,
        amountBs: parsed.data.generalAmountBs ?? null,
        paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
        bcvRateUsd: parsed.data.bcvRateUsd ?? null,
        bcvRateEur: parsed.data.bcvRateEur ?? null,
        method: parsed.data.generalMethod ?? parsed.data.method,
        reference: parsed.data.generalReference!,
        notes: "Opt-in al pote general (liga member)",
        proofUrl: parsed.data.generalProofUrl ?? null,
        isGeneralOptIn: true,
        linkedPaymentId: ligaPayment.id,
      },
    });

    // Back-link
    await prisma.paymentReport.update({
      where: { id: ligaPayment.id },
      data: { linkedPaymentId: optInPayment.id },
    });
  }

  return NextResponse.json(ligaPayment, { status: 201 });
}
