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

  return NextResponse.json({
    hasNickname: !!user?.nickname,
    isLigaOwner: (user?.ownedLigas?.length ?? 0) > 0,
    isLigaMember: !!user?.ligaId,
  });
}
