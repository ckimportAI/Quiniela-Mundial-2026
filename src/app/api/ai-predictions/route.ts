import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PROVIDER_ORDER = ["claude", "chatgpt", "gemini", "grok", "deepseek"];

export async function GET() {
  const aiQuinielas = await prisma.quiniela.findMany({
    where: { isAi: true },
    include: {
      tournamentPredictions: {
        where: { type: "CHAMPION" },
        include: { team: true },
      },
    },
  });

  const items = aiQuinielas
    .map((q) => {
      const champion = q.tournamentPredictions[0]?.team;
      return {
        provider: q.aiProvider ?? "unknown",
        quinielaId: q.id,
        championName: champion?.name ?? null,
        championCode: champion?.code ?? null,
      };
    })
    .sort((a, b) => {
      const ai = PROVIDER_ORDER.indexOf(a.provider);
      const bi = PROVIDER_ORDER.indexOf(b.provider);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  return NextResponse.json({ items });
}
