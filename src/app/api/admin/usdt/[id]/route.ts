import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const conv = await prisma.usdtConversion.findUnique({ where: { id } });
  if (!conv) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.usdtConversion.delete({ where: { id } }),
    prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: "DELETE_USDT_CONVERSION",
        details: `Eliminada conversion ${conv.bsAmount} Bs -> ${conv.usdtAmount} USDT`,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
