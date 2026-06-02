import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BracketClient from "./bracket-client";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/predicciones-bracket");
  }

  // Verify the user is a liga member
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ligaId: true },
  });
  if (!user?.ligaId) {
    redirect("/predicciones");
  }

  const quinielas = await prisma.quiniela.findMany({
    where: { userId: session.user.id, ligaId: user.ligaId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (quinielas.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <h1 className="text-2xl font-bold">Sin quinielas</h1>
        <p className="text-sm text-muted-foreground">
          Aun no tienes una quiniela activa en tu liga. Reporta tu pago para que
          el administrador la apruebe y aparezca aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <BracketClient quinielas={quinielas} />
    </div>
  );
}
