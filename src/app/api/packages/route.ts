import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isOfertaBienvenidaActive,
  OFERTA_BIENVENIDA_START,
  OFERTA_BIENVENIDA_END,
  puedeComprarPaquete,
  FIN_COMPRA_PAQUETES,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  // Check user state for personalized bonus eligibility
  let userHasUsedOffer = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ofertaBienvenidaUsada: true },
    });
    userHasUsedOffer = user?.ofertaBienvenidaUsada ?? false;
  }

  const offerActive = isOfertaBienvenidaActive();
  // User can benefit only if: offer is active AND user has NOT used it yet
  const bonusAvailableForUser = offerActive && !userHasUsedOffer;
  const canPurchase = puedeComprarPaquete();

  const basePricePerQuiniela = 10; // Individual price as reference

  return NextResponse.json({
    packages: packages.map((p) => {
      const effectiveQuinielas = bonusAvailableForUser
        ? p.quinielasCount + p.bonusQuinielasOferta
        : p.quinielasCount;
      const pricePerQuiniela = Number(p.priceUsd) / effectiveQuinielas;
      const savingsVsIndividual =
        basePricePerQuiniela * effectiveQuinielas - Number(p.priceUsd);
      // Quinielas "gratis" inherentes al combo (independiente del 2x1)
      // Por ejemplo Amigos: 3 quinielas pero pagas precio de 2 (1 gratis)
      const comboFreeQuinielas =
        p.quinielasCount - Math.round(Number(p.priceUsd) / basePricePerQuiniela);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        priceUsd: Number(p.priceUsd),
        quinielasCount: p.quinielasCount,
        bonusQuinielasOferta: p.bonusQuinielasOferta,
        effectiveQuinielas,
        pricePerQuiniela,
        savingsVsIndividual: Math.max(0, savingsVsIndividual),
        comboFreeQuinielas: Math.max(0, comboFreeQuinielas),
        badge: p.badge,
      };
    }),
    offer: {
      active: offerActive,
      availableForUser: bonusAvailableForUser,
      userHasUsedOffer,
      code: "bienvenida_lanzamiento",
      name: "Oferta 2x1 de Bienvenida",
      startsAt: OFERTA_BIENVENIDA_START.toISOString(),
      endsAt: OFERTA_BIENVENIDA_END.toISOString(),
    },
    purchase: {
      allowed: canPurchase,
      deadline: FIN_COMPRA_PAQUETES.toISOString(),
    },
  });
}
