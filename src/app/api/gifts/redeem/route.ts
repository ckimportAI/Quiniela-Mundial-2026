import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redeemGiftSchema } from "@/lib/validations";
import { puedeCrearQuiniela } from "@/lib/constants";

// POST: redeem a gift code -> creates an empty quiniela for the current user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesion para canjear un regalo" },
      { status: 401 }
    );
  }

  if (!puedeCrearQuiniela()) {
    return NextResponse.json(
      { error: "El periodo para crear quinielas ha cerrado" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = redeemGiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Codigo invalido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const gift = await prisma.giftCode.findUnique({
    where: { code: parsed.data.code },
    include: { purchaser: { select: { nickname: true, name: true } } },
  });

  if (!gift) {
    return NextResponse.json(
      { error: "Codigo no encontrado" },
      { status: 404 }
    );
  }

  if (gift.redeemedById) {
    return NextResponse.json(
      { error: "Este codigo ya fue canjeado" },
      { status: 409 }
    );
  }

  if (gift.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Este codigo ha expirado" },
      { status: 410 }
    );
  }

  if (gift.purchaserId === session.user.id) {
    return NextResponse.json(
      { error: "No puedes canjear un regalo que tu mismo compraste" },
      { status: 400 }
    );
  }

  // Build quiniela name: {nickname}-{N+1}
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      nickname: true,
      name: true,
      _count: { select: { quinielas: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const nickname = user.nickname ?? user.name ?? "user";
  const quinielaName = `${nickname}-${user._count.quinielas + 1}`;

  // Create quiniela + link gift in a transaction
  const quiniela = await prisma.quiniela.create({
    data: {
      name: quinielaName,
      userId: session.user.id,
      score: { create: {} },
      giftCode: {
        connect: { id: gift.id },
      },
    },
  });

  await prisma.giftCode.update({
    where: { id: gift.id },
    data: {
      redeemedById: session.user.id,
      redeemedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    quinielaId: quiniela.id,
    quinielaName,
    purchaser:
      gift.purchaser.nickname ?? gift.purchaser.name ?? "Tu amigo",
  });
}
