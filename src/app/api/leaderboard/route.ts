import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  // Scoping rules:
  // - Liga members see ONLY their liga leaderboard
  // - Liga owners (admins) see THEIR liga's leaderboard
  // - Non-liga (or anonymous) viewers see the GENERAL leaderboard:
  //   quinielas with ligaId IS NULL, plus liga quinielas that opted-in
  //   (alsoInGeneral = true)
  const session = await getServerSession(authOptions);
  let scopedWhere: Record<string, unknown> = {};
  let viewingLigaId: string | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        ligaId: true,
        ownedLigas: { where: { active: true }, select: { id: true }, take: 1 },
      },
    });
    viewingLigaId = user?.ligaId ?? user?.ownedLigas?.[0]?.id ?? null;
  }

  if (viewingLigaId) {
    scopedWhere = {
      quiniela: { is: { ligaId: viewingLigaId, hiddenFromLeaderboard: false } },
    };
  } else {
    scopedWhere = {
      quiniela: {
        is: {
          hiddenFromLeaderboard: false,
          OR: [{ ligaId: null }, { alsoInGeneral: true }],
        },
      },
    };
  }

  const [entries, total] = await Promise.all([
    prisma.quinielaScore.findMany({
      where: scopedWhere,
      include: {
        quiniela: {
          include: {
            user: {
              select: { id: true, name: true, nickname: true, image: true },
            },
          },
        },
      },
      orderBy: { totalPoints: "desc" },
      skip,
      take: limit,
    }),
    prisma.quinielaScore.count({ where: scopedWhere }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
