import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LigaAdminClient from "./liga-admin-client";

export const dynamic = "force-dynamic";

export default async function LigaAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/liga-admin");
  }

  const liga = await prisma.liga.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!liga) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <h1 className="text-2xl font-bold">Sin liga</h1>
        <p className="text-sm text-muted-foreground">
          No eres dueno de ninguna liga privada. Si tu cliente acordo contigo
          administrar una, contacta al admin de la plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Panel del administrador
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold">{liga.name}</h1>
        <p className="text-sm text-muted-foreground">
          Slug:{" "}
          <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
            {liga.slug}
          </code>
          {" · "}Link publico:{" "}
          <a
            href={`/liga/${liga.slug}`}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            /liga/{liga.slug}
          </a>
        </p>
      </div>

      <LigaAdminClient />
    </div>
  );
}
