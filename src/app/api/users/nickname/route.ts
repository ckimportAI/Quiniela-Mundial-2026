import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nicknameSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Check if user already has a nickname (permanent, cannot change)
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true },
  });

  if (currentUser?.nickname) {
    return NextResponse.json(
      { error: "Ya tienes un pseudonimo asignado" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = nicknameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { nickname: parsed.data.nickname },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ese pseudonimo ya esta en uso" },
      { status: 409 }
    );
  }

  // Set nickname
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname: parsed.data.nickname },
    select: { id: true, nickname: true },
  });

  return NextResponse.json(updated);
}
