import { prisma } from "@/lib/prisma";

// Alphanumeric chars without ambiguous ones (0/O, 1/I)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateGiftCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueGiftCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateGiftCode();
    const existing = await prisma.giftCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  // Fallback to 10-char
  return generateGiftCode(10);
}
