import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Main platform stats exclude liga members/quinielas
    const [users, quinielas, predictions] = await Promise.all([
      prisma.user.count({ where: { ligaId: null } }),
      prisma.quiniela.count({ where: { ligaId: null } }),
      prisma.prediction.count({ where: { quiniela: { ligaId: null } } }),
    ]);

    return NextResponse.json({ users, quinielas, predictions });
  } catch {
    return NextResponse.json({ users: 0, quinielas: 0, predictions: 0 });
  }
}
