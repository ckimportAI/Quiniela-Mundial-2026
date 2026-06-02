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

  // Liga member sees only their liga's single package
  let userLiga: { ligaId: string | null } | null = null;
  if (session?.user?.id) {
    userLiga = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ligaId: true },
    });
  }

  if (userLiga?.ligaId) {
    const liga = await prisma.liga.findUnique({
      where: { id: userLiga.ligaId },
    });
    if (liga && liga.active) {
      const price = Number(liga.priceUsd);
      const qty = liga.quinielasPerPurchase;
      return NextResponse.json({
        isLiga: true,
        ligaName: liga.name,
        ligaSlug: liga.slug,
        ligaBsRate: liga.bsRate ? Number(liga.bsRate) : null,
        ligaPaymentInfo: {
          pagoMovilPhone: liga.pagoMovilPhone,
          pagoMovilCedula: liga.pagoMovilCedula,
          pagoMovilBank: liga.pagoMovilBank,
          zelleEmail: liga.zelleEmail,
          zelleName: liga.zelleName,
          paymentNotes: liga.paymentNotes,
        },
        packages: [
          {
            id: `LIGA:${liga.id}`,
            code: "LIGA_PKG",
            name: liga.name,
            description: liga.description,
            priceUsd: price,
            quinielasCount: qty,
            bonusQuinielasOferta: 0,
            effectiveQuinielas: qty,
            pricePerQuiniela: price / qty,
            savingsVsIndividual: 0,
            comboFreeQuinielas: 0,
            badge: null,
          },
        ],
        offer: { active: false, availableForUser: false, userHasUsedOffer: false },
        purchase: { allowed: liga.active && puedeComprarPaquete(), deadline: FIN_COMPRA_PAQUETES.toISOString() },
      });
    }
  }

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
  const bonusAvailableForUser = offerActive && !userHasUsedOffer;
  const canPurchase = puedeComprarPaquete();

  const basePricePerQuiniela = 10;

  return NextResponse.json({
    isLiga: false,
    packages: packages.map((p) => {
      const effectiveQuinielas = bonusAvailableForUser
        ? p.quinielasCount + p.bonusQuinielasOferta
        : p.quinielasCount;
      const pricePerQuiniela = Number(p.priceUsd) / effectiveQuinielas;
      const savingsVsIndividual =
        basePricePerQuiniela * effectiveQuinielas - Number(p.priceUsd);
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
