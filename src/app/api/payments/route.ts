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
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
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
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      proofUrl: parsed.data.proofUrl ?? null,
      promoApplied,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
