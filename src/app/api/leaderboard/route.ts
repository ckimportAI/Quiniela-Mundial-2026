import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.quinielaScore.findMany({
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
    prisma.quinielaScore.count(),
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
