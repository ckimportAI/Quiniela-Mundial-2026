import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  confirm: z.literal("BORRAR_DATOS_BETA"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Confirmacion requerida. Envia { confirm: "BORRAR_DATOS_BETA" }',
      },
      { status: 400 }
    );
  }

  // Count before
  const counts = await prisma.$transaction([
    prisma.quiniela.count({ where: { isTest: true } }),
    prisma.prediction.count({
      where: { quiniela: { isTest: true } },
    }),
    prisma.tournamentPrediction.count({
      where: { quiniela: { isTest: true } },
    }),
  ]);

  const [testQuinielaCount, testPredCount, testTourneyPredCount] = counts;

  // Delete cascade - just deleting quinielas cascades to predictions & scores
  const deleted = await prisma.quiniela.deleteMany({
    where: { isTest: true },
  });

  await prisma.adminLog.create({
    data: {
      adminId: session.user.id,
      action: "RESET_BETA_DATA",
      details: `Deleted ${deleted.count} test quinielas, ${testPredCount} predictions, ${testTourneyPredCount} tournament predictions`,
    },
  });

  return NextResponse.json({
    success: true,
    deletedQuinielas: deleted.count,
    deletedPredictions: testPredCount,
    deletedTournamentPredictions: testTourneyPredCount,
    pre: {
      testQuinielaCount,
      testPredCount,
      testTourneyPredCount,
    },
  });
}
