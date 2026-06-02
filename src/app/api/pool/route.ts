import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBooleanConfig, CONFIG_KEYS } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const POOL_PERCENTAGE = 0.7; // 70% of total goes to the pool

export async function GET() {
  const showOnHome = await getBooleanConfig(CONFIG_KEYS.SHOW_POOL_HOME);

  // Sum amount of APPROVED payment reports (in USD) excluding liga payments
  const agg = await prisma.paymentReport.aggregate({
    where: { status: "APPROVED", ligaId: null },
    _sum: { amount: true },
  });

  const totalUsd = Number(agg._sum.amount ?? 0);
  const poolUsd = totalUsd * POOL_PERCENTAGE;

  return NextResponse.json({
    showOnHome,
    totalUsd,
    poolUsd,
  });
}
