import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/ui/team-flag";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ quinielaId: string }>;
}

export default async function QuinielaViewPage({ params }: PageProps) {
  const { quinielaId } = await params;

  const quiniela = await prisma.quiniela.findUnique({
    where: { id: quinielaId },
    include: {
      user: {
        select: { nickname: true, name: true, image: true },
      },
      score: true,
      predictions: {
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              group: true,
            },
          },
        },
        orderBy: { match: { matchNumber: "asc" } },
      },
    },
  });

  if (!quiniela) {
    notFound();
  }

  const nickname = quiniela.user.nickname ?? quiniela.user.name ?? "Sin nombre";

  // Group predictions by group name
  const grouped = new Map<string, typeof quiniela.predictions>();
  for (const pred of quiniela.predictions) {
    const groupName = pred.match.group?.name ?? "Eliminatorias";
    if (!grouped.has(groupName)) grouped.set(groupName, []);
    grouped.get(groupName)!.push(pred);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tabla">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Quiniela de {nickname}
          </h1>
          <p className="text-sm text-muted-foreground">
            {quiniela.name} &middot; {quiniela.predictions.length} predicciones
            {quiniela.score && ` · ${quiniela.score.totalPoints} pts`}
          </p>
        </div>
      </div>

      {/* Predictions by group */}
      {quiniela.predictions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Este jugador aun no ha hecho predicciones.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([groupName, preds]) => (
          <Card key={groupName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Grupo {groupName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {preds.map((pred) => {
                  const m = pred.match;
                  return (
                    <div
                      key={pred.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        pred.isWildcard ? "bg-yellow-50 border border-yellow-300" : "bg-muted/50"
                      }`}
                    >
                      {/* Match number */}
                      <span className="text-xs text-muted-foreground w-6">
                        #{m.matchNumber}
                      </span>

                      {/* Home team */}
                      <div className="flex-1 flex items-center justify-end gap-1.5">
                        <span className="text-sm truncate">
                          {m.homeTeam?.name ?? "TBD"}
                        </span>
                        {m.homeTeam && <TeamFlag code={m.homeTeam.code} size="sm" />}
                      </div>

                      {/* Prediction score */}
                      <div className="font-bold tabular-nums text-center min-w-[50px]">
                        {pred.homeScore} - {pred.awayScore}
                      </div>

                      {/* Away team */}
                      <div className="flex-1 flex items-center gap-1.5">
                        {m.awayTeam && <TeamFlag code={m.awayTeam.code} size="sm" />}
                        <span className="text-sm truncate">
                          {m.awayTeam?.name ?? "TBD"}
                        </span>
                      </div>

                      {/* Actual result + Points */}
                      {m.status === "FINISHED" && m.homeScore != null && (
                        <span className="text-xs text-muted-foreground tabular-nums text-center">
                          Resultado ({m.homeScore}-{m.awayScore})
                        </span>
                      )}

                      {pred.points != null && (
                        <Badge
                          variant={pred.points > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {pred.points}
                        </Badge>
                      )}

                      {pred.isWildcard && (
                        <Badge className="bg-yellow-500 text-black text-[10px] px-1.5">
                          x2
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
