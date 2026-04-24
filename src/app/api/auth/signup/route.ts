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
    },
    select: { id: true, email: true },
  });

  return NextResponse.json({ success: true, userId: user.id, email: user.email }, { status: 201 });
}
