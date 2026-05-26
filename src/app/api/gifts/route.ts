import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: list all gift codes purchased by current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const gifts = await prisma.giftCode.findMany({
    where: { purchaserId: session.user.id },
    include: {
      redeemedBy: { select: { nickname: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    gifts: gifts.map((g) => ({
      id: g.id,
      code: g.code,
      redeemed: !!g.redeemedById,
      redeemedAt: g.redeemedAt?.toISOString() ?? null,
      redeemedBy: g.redeemedBy
        ? g.redeemedBy.nickname ?? g.redeemedBy.name ?? g.redeemedBy.email
        : null,
      expiresAt: g.expiresAt.toISOString(),
      createdAt: g.createdAt.toISOString(),
    })),
  });
}
