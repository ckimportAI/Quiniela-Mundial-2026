import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ligas = await prisma.liga.findMany({
    include: {
      owner: { select: { email: true, nickname: true, name: true } },
      _count: { select: { members: true, quinielas: true, paymentReports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ligas });
}

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const slug = String(body.slug ?? "").toLowerCase().trim();
  const name = String(body.name ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").toLowerCase().trim();
  const priceUsd = Number(body.priceUsd ?? 10);
  const quinielasPerPurchase = Math.min(10, Math.max(1, Number(body.quinielasPerPurchase ?? 1)));

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug invalido (3-40 caracteres, letras/numeros/guiones)" },
      { status: 400 }
    );
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
  }
  if (!ownerEmail.includes("@")) {
    return NextResponse.json({ error: "Email del dueno invalido" }, { status: 400 });
  }

  // Resolve owner: must exist (admin creates the owner user first)
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, ligaId: true },
  });
  if (!owner) {
    return NextResponse.json(
      { error: "El dueno debe registrarse primero con ese email" },
      { status: 404 }
    );
  }
  if (owner.ligaId) {
    return NextResponse.json(
      { error: "El dueno propuesto ya es miembro de otra liga" },
      { status: 400 }
    );
  }

  const slugExists = await prisma.liga.findUnique({ where: { slug } });
  if (slugExists) {
    return NextResponse.json({ error: "El slug ya esta en uso" }, { status: 409 });
  }

  const liga = await prisma.liga.create({
    data: {
      slug,
      name,
      ownerId: owner.id,
      priceUsd,
      quinielasPerPurchase,
    },
  });

  return NextResponse.json({ liga }, { status: 201 });
}
