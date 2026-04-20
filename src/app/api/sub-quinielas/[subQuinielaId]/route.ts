import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ subQuinielaId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { subQuinielaId } = await params;

  // Verify user is a member
  const membership = await prisma.subQuinielaMember.findUnique({
    where: {
      subQuinielaId_userId: {
        subQuinielaId,
        userId: session.user.id,
      },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Fetch sub-quiniela with all members and their scores
  const subQuiniela = await prisma.subQuiniela.findUnique({
    where: { id: subQuinielaId },
    include: {
      createdBy: { select: { id: true, name: true, nickname: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, nickname: true, image: true } },
          quiniela: {
            include: { score: true },
          },
        },
      },
    },
  });

  if (!subQuiniela) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Build leaderboard sorted by totalPoints
  const leaderboard = subQuiniela.members
    .map((member) => ({
      ...member,
      totalPoints: member.quiniela.score?.totalPoints ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((member, idx) => ({
      rank: idx + 1,
      member,
    }));

  return NextResponse.json({
    subQuiniela: {
      id: subQuiniela.id,
      name: subQuiniela.name,
      description: subQuiniela.description,
      inviteCode: subQuiniela.inviteCode,
      createdBy: subQuiniela.createdBy,
      createdAt: subQuiniela.createdAt,
    },
    leaderboard,
    currentUserMember: {
      id: membership.id,
      role: membership.role,
      quinielaId: membership.quinielaId,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { subQuinielaId } = await params;

  // Verify user is admin
  const subQuiniela = await prisma.subQuiniela.findUnique({
    where: { id: subQuinielaId },
    select: { createdById: true },
  });
  if (!subQuiniela || subQuiniela.createdById !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.slice(0, 50) : undefined;
  const description = typeof body.description === "string" ? body.description.slice(0, 200) : undefined;

  const updated = await prisma.subQuiniela.update({
    where: { id: subQuinielaId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description: description || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { subQuinielaId } = await params;

  // Verify user is creator
  const subQuiniela = await prisma.subQuiniela.findUnique({
    where: { id: subQuinielaId },
    select: { createdById: true },
  });
  if (!subQuiniela || subQuiniela.createdById !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.subQuiniela.delete({ where: { id: subQuinielaId } });

  return NextResponse.json({ success: true });
}
