import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const grantSchema = z.object({
  userId: z.string().min(1),
  count: z.number().int().min(1).max(10),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      nickname: true,
      name: true,
      _count: { select: { quinielas: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  if (!user.nickname) {
    return NextResponse.json(
      { error: "Usuario debe completar onboarding (nickname) primero" },
      { status: 400 }
    );
  }

  const nickname = user.nickname;
  const existingCount = user._count.quinielas;
  const toCreate = parsed.data.count;

  // Create N test quinielas
  const created = [];
  for (let i = 0; i < toCreate; i++) {
    const q = await prisma.quiniela.create({
      data: {
        name: `${nickname}-${existingCount + i + 1}`,
        userId: parsed.data.userId,
        isTest: true,
        score: { create: {} },
      },
    });
    created.push(q);
  }

  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "GRANT_TEST_QUINIELAS",
      details: `Granted ${toCreate} test quinielas to user ${parsed.data.userId} (${nickname})`,
    },
  });

  return NextResponse.json({
    success: true,
    granted: toCreate,
    quinielas: created.map((q) => ({ id: q.id, name: q.name })),
  });
}
