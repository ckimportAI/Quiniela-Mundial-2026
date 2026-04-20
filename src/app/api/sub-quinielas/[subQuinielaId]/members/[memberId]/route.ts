import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMemberQuinielaSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ subQuinielaId: string; memberId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { subQuinielaId, memberId } = await params;

  // Find the member record
  const member = await prisma.subQuinielaMember.findUnique({
    where: { id: memberId },
    select: { subQuinielaId: true, userId: true },
  });
  if (!member || member.subQuinielaId !== subQuinielaId) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  // Only the member themselves can change their linked quiniela
  if (member.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateMemberQuinielaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
      { status: 400 }
    );
  }

  // Verify new quiniela belongs to the member
  const quiniela = await prisma.quiniela.findFirst({
    where: { id: parsed.data.quinielaId, userId: session.user.id },
  });
  if (!quiniela) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  const updated = await prisma.subQuinielaMember.update({
    where: { id: memberId },
    data: { quinielaId: parsed.data.quinielaId },
    include: {
      quiniela: { include: { score: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { subQuinielaId, memberId } = await params;

  const member = await prisma.subQuinielaMember.findUnique({
    where: { id: memberId },
    select: { subQuinielaId: true, userId: true, role: true },
  });
  if (!member || member.subQuinielaId !== subQuinielaId) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  // Check permissions: self-leave or admin-kick
  const isAdmin = await prisma.subQuinielaMember.findFirst({
    where: {
      subQuinielaId,
      userId: session.user.id,
      role: "ADMIN",
    },
  });

  const isSelf = member.userId === session.user.id;

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Admin cannot leave - must delete the group instead
  if (isSelf && member.role === "ADMIN") {
    return NextResponse.json(
      { error: "El administrador no puede abandonar el grupo. Eliminalo en su lugar." },
      { status: 400 }
    );
  }

  await prisma.subQuinielaMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
