import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/matches/match-card";
import type { MatchWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resultados | Quiniela Mundial 2026",
};

const phaseOrder = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
] as const;

const phaseLabels: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Final",
};

export default async function ResultadosPage() {
  const matches = (await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      group: true,
    },
    orderBy: [{ dateTime: "asc" }, { matchNumber: "asc" }],
  })) as unknown as MatchWithDetails[];

  // Group matches by phase
  const matchesByPhase = new Map<string, MatchWithDetails[]>();
  for (const phase of phaseOrder) {
    const phaseMatches = matches.filter((m) => m.phase === phase);
    if (phaseMatches.length > 0) {
      matchesByPhase.set(phase, phaseMatches);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resultados</h1>
        <p className="text-muted-foreground">
          104 partidos del Mundial FIFA 2026. Del 11 de junio al 19 de julio.
        </p>
      </div>

      {Array.from(matchesByPhase.entries()).map(([phase, phaseMatches]) => (
        <section key={phase}>
          <h2 className="text-xl font-semibold mb-4">
            {phaseLabels[phase]}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({phaseMatches.length} partidos)
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {phaseMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
