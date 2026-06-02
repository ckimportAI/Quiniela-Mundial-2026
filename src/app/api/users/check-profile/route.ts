import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      nickname: true,
      ligaId: true,
      ownedLigas: {
        where: { active: true },
        select: { slug: true },
        take: 1,
      },
    },
  });

  // For liga members: check if their quiniela(s) are incomplete (any of these
  // counts as incomplete: group stage < 72, open KO ties, missing top scorer).
  let bracketIncomplete = false;
  if (user?.ligaId) {
    const quinielas = await prisma.quiniela.findMany({
      where: { userId: user.id, ligaId: user.ligaId },
      select: { id: true },
    });
    for (const q of quinielas) {
      const [groupFilled, openTies, topScorerCount] = await Promise.all([
        prisma.prediction.count({
          where: {
            quinielaId: q.id,
            match: { phase: "GROUP_STAGE" },
          },
        }),
        prisma.prediction.count({
          where: {
            quinielaId: q.id,
            match: { phase: { not: "GROUP_STAGE" } },
            winnerOnPenaltiesTeamId: null,
            // tie filter via raw is tricky in Prisma; use equality field
            // we'll filter in app by comparing homeScore/awayScore below
          },
        }).then(async () => {
          // Re-query the actual tie count (Prisma can't compare two columns)
          const tieRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count
            FROM predictions p
            JOIN matches m ON p."matchId" = m.id
            WHERE p."quinielaId" = ${q.id}
              AND m.phase != 'GROUP_STAGE'
              AND p."homeScore" = p."awayScore"
              AND p."winnerOnPenaltiesTeamId" IS NULL
          `;
          return Number(tieRows[0]?.count ?? 0);
        }),
        prisma.tournamentPrediction.count({
          where: { quinielaId: q.id, type: "TOP_SCORER" },
        }),
      ]);

      if (groupFilled < 72 || openTies > 0 || topScorerCount === 0) {
        bracketIncomplete = true;
        break;
      }
    }
  }

  return NextResponse.json({
    hasNickname: !!user?.nickname,
    isLigaOwner: (user?.ownedLigas?.length ?? 0) > 0,
    isLigaMember: !!user?.ligaId,
    bracketIncomplete,
  });
}
