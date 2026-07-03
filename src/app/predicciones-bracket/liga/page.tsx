import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computePhaseStartTimes,
  phaseHasStarted,
  type MatchInfo,
} from "@/lib/bracket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PHASE_LABELS: Record<string, string> = {
  ROUND_OF_32: "Treintaidosavos (R32)",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer Lugar",
  FINAL: "Final",
};

export default async function LigaPrediccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/predicciones-bracket/liga");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ligaId: true },
  });
  if (!user?.ligaId) {
    redirect("/predicciones");
  }

  const sp = await searchParams;
  const activePhase = sp.phase ?? "ROUND_OF_32";

  // Load all KO matches with their dateTime + teams
  const allMatches = await prisma.match.findMany({
    where: {
      phase: {
        in: [
          "ROUND_OF_32",
          "ROUND_OF_16",
          "QUARTER_FINALS",
          "SEMI_FINALS",
          "THIRD_PLACE",
          "FINAL",
        ],
      },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: [{ phase: "asc" }, { dateTime: "asc" }],
  });
  const matchInfos: MatchInfo[] = allMatches.map((m) => ({
    id: m.id,
    matchNumber: m.matchNumber,
    phase: m.phase,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    dateTime: m.dateTime,
    group: null,
  }));
  const phaseStartTimes = computePhaseStartTimes(matchInfos);
  const now = new Date();

  // Only reveal other players' predictions AFTER the phase's first match
  // has kicked off (Equinox rule — no copying risk once the ball is rolling).
  const phaseStarted = phaseHasStarted(activePhase, phaseStartTimes, now);

  const phaseMatches = allMatches.filter((m) => m.phase === activePhase);
  const phaseMatchIds = new Set(phaseMatches.map((m) => m.id));

  // Load all liga members' quinielas + their predictions for this phase
  const quinielas = phaseStarted
    ? await prisma.quiniela.findMany({
        where: { ligaId: user.ligaId, isTest: false },
        include: {
          user: { select: { nickname: true, name: true } },
          predictions: {
            where: { matchId: { in: Array.from(phaseMatchIds) } },
            select: {
              matchId: true,
              homeScore: true,
              awayScore: true,
              winnerOnPenaltiesTeamId: true,
            },
          },
          score: { select: { totalPoints: true } },
        },
        orderBy: { name: "asc" },
      })
    : [];

  // Sort by score desc
  quinielas.sort(
    (a, b) =>
      (b.score?.totalPoints ?? 0) - (a.score?.totalPoints ?? 0)
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Predicciones de la Liga</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/predicciones-bracket">← Volver al bracket</Link>
        </Button>
      </div>

      {/* Phase tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(PHASE_LABELS).map((p) => (
          <Link
            key={p}
            href={`/predicciones-bracket/liga?phase=${p}`}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              p === activePhase
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            {PHASE_LABELS[p]}
          </Link>
        ))}
      </div>

      {!phaseStarted && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium">🔒 Predicciones aún ocultas</p>
            <p>
              Las predicciones de los demás miembros de la liga se muestran cuando
              la fase comience. Esto evita que los jugadores se copien.
            </p>
          </CardContent>
        </Card>
      )}

      {phaseStarted && phaseMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{PHASE_LABELS[activePhase]}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-background">
                    Quiniela
                  </th>
                  <th className="text-right p-2">Pts</th>
                  {phaseMatches.map((m) => (
                    <th key={m.id} className="text-center p-2 whitespace-nowrap">
                      <div className="text-xs font-normal">
                        {m.homeTeam?.name?.slice(0, 3) ?? "?"} v{" "}
                        {m.awayTeam?.name?.slice(0, 3) ?? "?"}
                      </div>
                      {m.homeScore != null && m.awayScore != null && (
                        <div className="text-xs text-muted-foreground">
                          {m.homeScore}-{m.awayScore}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quinielas.map((q) => {
                  const predMap = new Map(
                    q.predictions.map((p) => [p.matchId, p])
                  );
                  return (
                    <tr key={q.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium sticky left-0 bg-background">
                        <div>{q.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {q.user.nickname ?? q.user.name ?? ""}
                        </div>
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {q.score?.totalPoints ?? 0}
                      </td>
                      {phaseMatches.map((m) => {
                        const p = predMap.get(m.id);
                        return (
                          <td
                            key={m.id}
                            className="text-center p-2 tabular-nums text-xs"
                          >
                            {p
                              ? `${p.homeScore}-${p.awayScore}`
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
