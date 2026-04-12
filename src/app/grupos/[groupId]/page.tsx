import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/matches/match-card";
import type { MatchWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export async function generateMetadata({ params }: GroupDetailPageProps) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });
  if (!group) return { title: "Grupo no encontrado" };
  return { title: `Grupo ${group.name} | Quiniela Mundial 2026` };
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      teams: {
        orderBy: { name: "asc" },
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          group: true,
        },
        orderBy: [{ dateTime: "asc" }, { matchNumber: "asc" }],
      },
    },
  });

  if (!group) notFound();

  const matches = group.matches as unknown as MatchWithDetails[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/grupos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Grupos
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-3xl font-bold tracking-tight">
          Grupo {group.name}
        </h1>
      </div>

      {/* Teams */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {group.teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <span className="text-2xl">{team.flag}</span>
            <div>
              <p className="font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.code}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Matches */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Partidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
