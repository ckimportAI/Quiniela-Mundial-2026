import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ quinielaId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { quinielaId } = await params;

  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
    include: {
      score: true,
      _count: { select: { predictions: true, tournamentPredictions: true } },
    },
  });

  if (!quiniela || quiniela.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json(quiniela);
}

// PATCH removed: quiniela names are auto-generated ({nickname}-N) and cannot be changed

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { quinielaId } = await params;

  // Verify ownership
  const existing = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Cascade delete will remove predictions, tournament predictions, and score
  await prisma.quiniela.delete({
    where: { id: quinielaId },
  });

  return NextResponse.json({ success: true });
}
