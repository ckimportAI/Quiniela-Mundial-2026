import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List all payment reports (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");

  // Platform admin only sees non-liga payments
  const where: {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    ligaId: null;
  } = { ligaId: null };
  if (status) where.status = status as "PENDING" | "APPROVED" | "REJECTED";

  const payments = await prisma.paymentReport.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, nickname: true, email: true, phone: true, cedula: true },
      },
      package: {
        select: { id: true, code: true, name: true, priceUsd: true, quinielasCount: true },
      },
    },
    orderBy: [
      { status: "asc" }, // PENDING first (A < P < R alphabetically, but APPROVED < PENDING < REJECTED)
      { createdAt: "desc" },
    ],
  });

  // Count pending for badge (exclude liga payments)
  const pendingCount = await prisma.paymentReport.count({
    where: { status: "PENDING", ligaId: null },
  });

  return NextResponse.json({ payments, pendingCount });
}
