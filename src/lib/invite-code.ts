import { prisma } from "@/lib/prisma";

// Alphanumeric chars without ambiguous ones (0/O, 1/I)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const existing = await prisma.subQuiniela.findUnique({
      where: { inviteCode: code },
    });
    if (!existing) return code;
  }
  // Fallback to 8-char code if collisions happen
  return generateInviteCode(8);
}
