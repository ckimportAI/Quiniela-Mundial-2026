import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  // If the user belongs to a liga, scope leaderboard to that liga
  // Otherwise show only the main (non-liga) leaderboard
  const session = await getServerSession(authOptions);
  let ligaFilter: { is: { ligaId: string | null } } | undefined;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ligaId: true },
    });
    ligaFilter = { is: { ligaId: user?.ligaId ?? null } };
  } else {
    ligaFilter = { is: { ligaId: null } };
  }

  const [entries, total] = await Promise.all([
    prisma.quinielaScore.findMany({
      where: { quiniela: ligaFilter },
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
    prisma.quinielaScore.count({ where: { quiniela: ligaFilter } }),
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
