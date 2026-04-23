import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isPromo2x1Active,
  PROMO_2X1_START,
  PROMO_2X1_END,
  PROMO_2X1_MULTIPLIER,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const promoActive = isPromo2x1Active();

  return NextResponse.json({
    packages: packages.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      priceUsd: Number(p.priceUsd),
      quinielasCount: p.quinielasCount,
      // With promo, user gets N * multiplier quinielas
      effectiveQuinielas: promoActive
        ? p.quinielasCount * PROMO_2X1_MULTIPLIER
        : p.quinielasCount,
      pricePerQuiniela: promoActive
        ? Number(p.priceUsd) / (p.quinielasCount * PROMO_2X1_MULTIPLIER)
        : Number(p.priceUsd) / p.quinielasCount,
    })),
    promo: {
      active: promoActive,
      name: "2x1 Lanzamiento",
      startsAt: PROMO_2X1_START.toISOString(),
      endsAt: PROMO_2X1_END.toISOString(),
      multiplier: PROMO_2X1_MULTIPLIER,
    },
  });
}
