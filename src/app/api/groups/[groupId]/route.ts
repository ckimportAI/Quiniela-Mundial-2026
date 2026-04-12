import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      teams: { orderBy: { name: "asc" } },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          group: true,
        },
        orderBy: [{ dateTime: "asc" }, { matchNumber: "asc" }],
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(group);
}
