import { prisma } from "@/lib/prisma";
import { GroupCard } from "@/components/groups/group-card";
import type { GroupWithTeams } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grupos | Quiniela Mundial 2026",
};

export default async function GruposPage() {
  const groups = (await prisma.group.findMany({
    include: {
      teams: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })) as GroupWithTeams[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grupos</h1>
        <p className="text-muted-foreground">
          48 equipos en 12 grupos. Los 2 primeros de cada grupo y los 8 mejores
          terceros avanzan a la Ronda de 32.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
