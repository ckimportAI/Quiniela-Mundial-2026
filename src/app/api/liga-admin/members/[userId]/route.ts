import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: expel a member from the liga
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { userId } = await params;

  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!liga) {
    return NextResponse.json({ error: "Sin liga" }, { status: 404 });
  }

  // Verify target is in your liga
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ligaId: true },
  });
  if (!target || target.ligaId !== liga.id) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  // Unset ligaId (preserves their data, removes them from the liga)
  await prisma.user.update({
    where: { id: userId },
    data: { ligaId: null },
  });

  return NextResponse.json({ success: true });
}
