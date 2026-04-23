import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllConfig,
  setConfig,
  CONFIG_KEYS,
  type ConfigKey,
} from "@/lib/site-config";
import { z } from "zod";

const VALID_KEYS = new Set<string>(Object.values(CONFIG_KEYS));

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const config = await getAllConfig();
  return NextResponse.json({ config });
}

const patchSchema = z.object({
  key: z.string(),
  value: z.string().max(500),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos" },
      { status: 400 }
    );
  }

  if (!VALID_KEYS.has(parsed.data.key)) {
    return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
  }

  await setConfig(parsed.data.key as ConfigKey, parsed.data.value, session.user.id);
  return NextResponse.json({ ok: true });
}
