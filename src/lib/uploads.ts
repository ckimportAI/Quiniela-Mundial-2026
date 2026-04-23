import path from "path";
import fs from "fs/promises";

// Uploads dir is outside public/ so files aren't publicly served.
// Access is gated via the /api/uploads/* route with auth.
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
export const PAYMENTS_DIR = path.join(UPLOADS_ROOT, "payments");

export async function ensurePaymentsDir() {
  await fs.mkdir(PAYMENTS_DIR, { recursive: true });
}

export function randomFilename(ext: string): string {
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 5);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${id}.${safeExt}`;
}

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[mime.toLowerCase()] ?? "jpg";
}
