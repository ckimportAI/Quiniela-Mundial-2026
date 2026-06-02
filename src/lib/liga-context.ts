import { prisma } from "@/lib/prisma";

/**
 * Returns the Liga the user belongs to (as member) or owns.
 * Priority: if owner, returns the owned liga; else returns the member liga.
 * Returns null if the user is neither.
 */
export async function getLigaForUser(userId: string) {
  if (!userId) return null;

  // Try owner first
  const owned = await prisma.liga.findFirst({
    where: { ownerId: userId, active: true },
  });
  if (owned) return { ...owned, isOwner: true as const };

  // Then membership
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ligaId: true },
  });
  if (!user?.ligaId) return null;

  const liga = await prisma.liga.findUnique({
    where: { id: user.ligaId },
  });
  if (!liga || !liga.active) return null;

  return { ...liga, isOwner: false as const };
}

/**
 * Throws if the user is NOT the owner of the given liga.
 * Use as a guard in /liga-admin endpoints.
 */
export async function requireLigaOwner(ligaId: string, userId: string) {
  const liga = await prisma.liga.findUnique({
    where: { id: ligaId },
    select: { ownerId: true, active: true },
  });
  if (!liga) throw new Error("Liga no encontrada");
  if (!liga.active) throw new Error("Liga inactiva");
  if (liga.ownerId !== userId) throw new Error("No autorizado");
  return liga;
}

/**
 * Find a liga by its public slug. Used by /liga/[slug] pages.
 */
export async function getLigaBySlug(slug: string) {
  return prisma.liga.findUnique({
    where: { slug: slug.toLowerCase().trim() },
  });
}
