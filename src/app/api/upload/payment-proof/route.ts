import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import {
  ensurePaymentsDir,
  PAYMENTS_DIR,
  randomFilename,
  extFromMime,
} from "@/lib/uploads";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Archivo requerido" },
      { status: 400 }
    );
  }

  const blob = file as File;

  if (!ALLOWED_MIMES.has(blob.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no soportado. Usa JPG, PNG o WEBP." },
      { status: 400 }
    );
  }

  if (blob.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Archivo muy grande (max 6 MB)" },
      { status: 400 }
    );
  }

  await ensurePaymentsDir();

  const ext = extFromMime(blob.type);
  const filename = randomFilename(ext);
  const buffer = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(path.join(PAYMENTS_DIR, filename), buffer);

  // URL gated behind auth route
  const url = `/api/uploads/payments/${filename}`;

  return NextResponse.json({
    filename,
    url,
    mime: blob.type,
    size: blob.size,
  });
}
