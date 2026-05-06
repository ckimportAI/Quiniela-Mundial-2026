import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const POOL_PERCENTAGE = 0.7;

// GET: list conversions + summary
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Total recaudado in Bs (only count payments where amountBs is set)
  const bsAgg = await prisma.paymentReport.aggregate({
    where: { status: "APPROVED", amountBs: { not: null } },
    _sum: { amountBs: true },
  });
  const totalBsRecaudado = Number(bsAgg._sum.amountBs ?? 0);

  // Total recaudado in USD (for cross-reference)
  const usdAgg = await prisma.paymentReport.aggregate({
    where: { status: "APPROVED" },
    _sum: { amount: true },
  });
  const totalUsdRecaudado = Number(usdAgg._sum.amount ?? 0);

  // Conversions
  const conversions = await prisma.usdtConversion.findMany({
    orderBy: { conversionDate: "desc" },
  });

  const totalBsConvertido = conversions.reduce(
    (sum, c) => sum + Number(c.bsAmount),
    0
  );
  const totalUsdt = conversions.reduce(
    (sum, c) => sum + Number(c.usdtAmount),
    0
  );
  const pendingBs = totalBsRecaudado - totalBsConvertido;
  const avgRate = totalUsdt > 0 ? totalBsConvertido / totalUsdt : 0;

  return NextResponse.json({
    summary: {
      totalBsRecaudado,
      totalUsdRecaudado,
      totalBsConvertido,
      totalUsdt,
      pendingBs,
      avgRate,
      poolUsd: totalUsdRecaudado * POOL_PERCENTAGE,
    },
    conversions: conversions.map((c) => ({
      id: c.id,
      bsAmount: Number(c.bsAmount),
      usdtAmount: Number(c.usdtAmount),
      rate: Number(c.rate),
      conversionDate: c.conversionDate.toISOString(),
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  bsAmount: z.number().positive("Monto Bs debe ser positivo"),
  usdtAmount: z.number().positive("Monto USDT debe ser positivo"),
  conversionDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

// POST: create new conversion
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { bsAmount, usdtAmount, conversionDate, notes } = parsed.data;
  const rate = bsAmount / usdtAmount;

  const conversion = await prisma.usdtConversion.create({
    data: {
      bsAmount,
      usdtAmount,
      rate,
      conversionDate: conversionDate ? new Date(conversionDate) : new Date(),
      notes: notes ?? null,
      createdById: session.user.id,
    },
  });

  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "USDT_CONVERSION",
      details: `${bsAmount} Bs -> ${usdtAmount} USDT (rate: ${rate.toFixed(4)})`,
    },
  });

  return NextResponse.json({
    id: conversion.id,
    bsAmount: Number(conversion.bsAmount),
    usdtAmount: Number(conversion.usdtAmount),
    rate: Number(conversion.rate),
    conversionDate: conversion.conversionDate.toISOString(),
    notes: conversion.notes,
  }, { status: 201 });
}
