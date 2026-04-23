import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentReportSchema } from "@/lib/validations";
import { isPromo2x1Active, PROMO_2X1_MULTIPLIER } from "@/lib/constants";

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

  // Also return current credits
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

  const body = await request.json();
  const parsed = paymentReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Resolve package if packageId provided
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
    promoApplied = isPromo2x1Active();
    credits = promoApplied
      ? pkg.quinielasCount * PROMO_2X1_MULTIPLIER
      : pkg.quinielasCount;
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
      promoApplied,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
