import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinSubQuinielaSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = joinSubQuinielaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
      { status: 400 }
    );
  }

  const { inviteCode, quinielaId } = parsed.data;

  // Find sub-quiniela by invite code
  const subQuiniela = await prisma.subQuiniela.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  });
  if (!subQuiniela) {
    return NextResponse.json(
      { error: "Codigo de invitacion invalido" },
      { status: 404 }
    );
  }

  // Verify quiniela belongs to user
  const quiniela = await prisma.quiniela.findFirst({
    where: { id: quinielaId, userId: session.user.id },
  });
  if (!quiniela) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.subQuinielaMember.findUnique({
    where: {
      subQuinielaId_userId: {
        subQuinielaId: subQuiniela.id,
        userId: session.user.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya eres miembro de esta sub-quiniela" },
      { status: 400 }
    );
  }

  const member = await prisma.subQuinielaMember.create({
    data: {
      subQuinielaId: subQuiniela.id,
      userId: session.user.id,
      quinielaId,
      role: "MEMBER",
    },
    include: {
      subQuiniela: {
        include: {
          createdBy: { select: { id: true, name: true, nickname: true, image: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  return NextResponse.json(member, { status: 201 });
}
