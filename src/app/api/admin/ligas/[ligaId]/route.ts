import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: toggle active (kill switch only — admin cannot edit liga internals)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ligaId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { ligaId } = await params;
  const body = await request.json();
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Solo se puede toggle active" }, { status: 400 });
  }

  const updated = await prisma.liga.update({
    where: { id: ligaId },
    data: { active: body.active },
  });
  return NextResponse.json({ liga: updated });
}
