import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase");
  const groupId = searchParams.get("groupId");
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  const where: Record<string, unknown> = {};

  if (phase) where.phase = phase;
  if (groupId) where.groupId = groupId;
  if (status) where.status = status;

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.dateTime = { gte: start, lt: end };
  }

  const matches = await prisma.match.findMany({
    where,
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      group: true,
    },
    orderBy: [{ dateTime: "asc" }, { matchNumber: "asc" }],
  });

  return NextResponse.json(matches);
}
