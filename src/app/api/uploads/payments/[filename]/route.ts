import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { PAYMENTS_DIR } from "@/lib/uploads";

// Serves a payment proof image. Auth required.
// - Admin can see all
// - User can see only their own (if the filename appears in one of their payment reports)
// - Recently-uploaded files (not yet attached to a report) are viewable by the uploader.
//   For simplicity, any authenticated user can view while uploading; they confirm on submit.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { filename } = await params;

  // Validate filename format (no traversal)
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(filename)) {
    return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
  }

  const filePath = path.join(PAYMENTS_DIR, filename);
  const fullUrl = `/api/uploads/payments/${filename}`;

  // Check access: admin or owner of a PaymentReport with this proofUrl
  if (session.user.role !== "ADMIN") {
    const report = await prisma.paymentReport.findFirst({
      where: { proofUrl: fullUrl, userId: session.user.id },
      select: { id: true },
    });
    // If no report yet references this file (very recent upload), allow the
    // uploader to still preview during the report flow. We can't identify
    // uploader from filename alone, so we accept any authenticated request
    // when the file is less than 30 minutes old.
    if (!report) {
      let fresh = false;
      try {
        const stat = await fs.stat(filePath);
        fresh = Date.now() - stat.mtimeMs < 30 * 60 * 1000;
      } catch {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
      if (!fresh) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }
  }

  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "heic" || ext === "heif"
          ? `image/${ext}`
          : "image/jpeg";

  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
