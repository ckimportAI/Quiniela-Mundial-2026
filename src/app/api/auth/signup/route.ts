import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  // Optional liga slug to auto-assign membership during signup
  const ligaSlugRaw = typeof body.ligaSlug === "string" ? body.ligaSlug.trim().toLowerCase() : null;
  let ligaIdToAssign: string | null = null;
  if (ligaSlugRaw) {
    const liga = await prisma.liga.findUnique({
      where: { slug: ligaSlugRaw },
      select: { id: true, active: true },
    });
    if (!liga || !liga.active) {
      return NextResponse.json(
        { error: "La liga no existe o esta inactiva" },
        { status: 404 }
      );
    }
    ligaIdToAssign = liga.id;
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true },
  });

  if (existing) {
    if (existing.passwordHash) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email. Inicia sesion." },
        { status: 409 }
      );
    }
    // User registered via Google but never set a password - don't allow password signup
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email via Google. Inicia sesion con Google." },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: normalizedEmail.split("@")[0],
      ligaId: ligaIdToAssign,
    },
    select: { id: true, email: true, ligaId: true },
  });

  return NextResponse.json(
    { success: true, userId: user.id, email: user.email, ligaId: user.ligaId },
    { status: 201 }
  );
}
