import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [users, quinielas, predictions] = await Promise.all([
      prisma.user.count(),
      prisma.quiniela.count(),
      prisma.prediction.count(),
    ]);

    return NextResponse.json({ users, quinielas, predictions });
  } catch {
    return NextResponse.json({ users: 0, quinielas: 0, predictions: 0 });
  }
}
