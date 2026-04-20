import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubQuinielaSchema } from "@/lib/validations";
import { generateUniqueInviteCode } from "@/lib/invite-code";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const memberships = await prisma.subQuinielaMember.findMany({
    where: { userId: session.user.id },
    include: {
      subQuiniela: {
        include: {
          createdBy: { select: { id: true, name: true, nickname: true, image: true } },
          _count: { select: { members: true } },
        },
      },
      quiniela: {
        include: { score: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ memberships });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSubQuinielaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
      { status: 400 }
    );
  }

  const { name, description, quinielaId } = parsed.data;

  // Verify quiniela belongs to user
  const quiniela = await prisma.quiniela.findFirst({
    where: { id: quinielaId, userId: session.user.id },
  });
  if (!quiniela) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  const inviteCode = await generateUniqueInviteCode();

  // Create sub-quiniela + add creator as ADMIN member
  const subQuiniela = await prisma.subQuiniela.create({
    data: {
      name,
      description: description || null,
      inviteCode,
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          quinielaId,
          role: "ADMIN",
        },
      },
    },
    include: {
      createdBy: { select: { id: true, name: true, nickname: true, image: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(subQuiniela, { status: 201 });
}
