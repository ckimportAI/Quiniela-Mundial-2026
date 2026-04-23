import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentReportSchema } from "@/lib/validations";
import {
  isOfertaBienvenidaActive,
  puedeComprarPaquete,
} from "@/lib/constants";

// GET: User's payment history
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
    select: { credits: true },
  });

  return NextResponse.json({ payments, credits: user?.credits ?? 0 });
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

  // Duplicate detection: reference + method (+ amountBs + paymentDate if provided)
  // already reported (and not rejected)
  const dupFilters: Array<Record<string, unknown>> = [
    { reference: parsed.data.reference, method: parsed.data.method },
  ];
  // If OCR captured amountBs + date, also check that combination globally
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

  const existingDuplicate = await prisma.paymentReport.findFirst({
    where: {
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
          : "Este comprobante ya fue reportado en el sistema. Si crees que es un error, contacta a soporte.",
      },
      { status: 409 }
    );
  }

  let credits = parsed.data.credits ?? 0;
  let promoApplied = false;

  if (parsed.data.packageId) {
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

  const payment = await prisma.paymentReport.create({
    data: {
      userId: session.user.id,
      packageId: parsed.data.packageId ?? null,
      credits,
      amount: parsed.data.amount,
      amountBs: parsed.data.amountBs ?? null,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
      bcvRateUsd: parsed.data.bcvRateUsd ?? null,
      bcvRateEur: parsed.data.bcvRateEur ?? null,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      proofUrl: parsed.data.proofUrl ?? null,
      promoApplied,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
