import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi Perfil | Quiniela Mundial 2026",
};

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Fetch all quinielas with their scores
  const quinielas = await prisma.quiniela.findMany({
    where: { userId: session.user.id },
    include: {
      score: true,
      _count: { select: { predictions: true, tournamentPredictions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch recent predictions across all quinielas
  const recentPredictions = await prisma.prediction.findMany({
    where: {
      userId: session.user.id,
      points: { not: null },
    },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
      quiniela: { select: { name: true } },
    },
    orderBy: { match: { dateTime: "desc" } },
    take: 20,
  });

  // Fetch tournament predictions across all quinielas
  const tournamentPreds = await prisma.tournamentPrediction.findMany({
    where: { userId: session.user.id },
    include: {
      team: true,
      quiniela: { select: { name: true } },
    },
  });

  // Aggregate stats across all quinielas
  const totalPoints = quinielas.reduce(
    (sum, q) => sum + (q.score?.totalPoints ?? 0),
    0
  );
  const bestRank = quinielas
    .filter((q) => q.score?.rank != null)
    .sort((a, b) => (a.score!.rank! - b.score!.rank!))
    [0]?.score?.rank;
  const totalPredictions = quinielas.reduce(
    (sum, q) => sum + q._count.predictions,
    0
  );

  // Fetch user details for nickname, credits, saldo
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, credits: true, saldoBs: true },
  });
  const saldoBs = Number(user?.saldoBs ?? 0);

  // Check if user has any winner record
  const winnersCount = await prisma.ganador.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          {user?.nickname && (
            <span className="font-semibold text-foreground">{user.nickname}</span>
          )}
          {user?.nickname && " · "}
          {session.user.name} · {session.user.email}
        </p>
      </div>

      {/* Winner banner */}
      {winnersCount > 0 && (
        <a
          href="/mis-premios"
          className="block rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-4 text-white shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-bold">Felicidades, has ganado!</p>
                <p className="text-sm opacity-90">
                  Click aqui para ver tus premios y entregar tus datos de cobro
                </p>
              </div>
            </div>
            <span className="text-sm font-medium">Ver premios →</span>
          </div>
        </a>
      )}

      {/* Credits + saldo */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Creditos disponibles</p>
                <p className="text-2xl font-bold">{user?.credits ?? 0}</p>
              </div>
              <a
                href="/paquetes"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
              >
                Comprar
              </a>
            </div>
          </CardContent>
        </Card>

        {saldoBs > 0 && (
          <Card className="border-green-400 border-2 bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-green-700 uppercase font-semibold tracking-wide">
                Saldo a favor
              </p>
              <p className="text-2xl font-bold text-green-700 tabular-nums">
                Bs. {saldoBs.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-green-700/80 mt-1">
                Aplicalo en tu proxima compra
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Global stats overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Quinielas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{quinielas.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Puntos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPoints}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Mejor Posicion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {bestRank ? `#${bestRank}` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Predicciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPredictions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-quiniela stats */}
      {quinielas.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Mis Quinielas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quinielas.map((q) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{q.name}</CardTitle>
                    {q.score?.rank && (
                      <Badge variant="outline">#{q.score.rank}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Puntos</p>
                      <p className="text-lg font-bold">
                        {q.score?.totalPoints ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Exactos</p>
                      <p className="text-lg font-bold">
                        {q.score?.exactScores ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Aciertos</p>
                      <p className="text-lg font-bold">
                        {q.score?.correctResults ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Predicciones</p>
                      <p className="text-lg font-bold">
                        {q._count.predictions}
                      </p>
                    </div>
                  </div>
                  {q.score && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p>Grupos</p>
                        <p className="font-medium text-foreground">
                          {q.score.groupPoints}
                        </p>
                      </div>
                      <div>
                        <p>Elim.</p>
                        <p className="font-medium text-foreground">
                          {q.score.knockoutPoints}
                        </p>
                      </div>
                      <div>
                        <p>Comodin</p>
                        <p className="font-medium text-foreground">
                          {q.score.wildcardPoints}
                        </p>
                      </div>
                      <div>
                        <p>Torneo</p>
                        <p className="font-medium text-foreground">
                          {q.score.tournamentPoints}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tournament predictions */}
      {tournamentPreds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Predicciones de Torneo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tournamentPreds.map((tp) => (
                <div
                  key={tp.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      [{tp.quiniela.name}]
                    </span>
                    <span>{tp.type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tp.team && (
                      <span>
                        {tp.team.flag} {tp.team.name}
                      </span>
                    )}
                    {tp.playerName && <span>{tp.playerName}</span>}
                    {tp.points != null && (
                      <Badge
                        variant={tp.points > 0 ? "default" : "secondary"}
                      >
                        {tp.points} pts
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent predictions */}
      {recentPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Ultimas Predicciones Evaluadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPredictions.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      [{p.quiniela.name}]
                    </span>
                    <span>
                      {p.match.homeTeam?.flag} {p.match.homeTeam?.code}
                    </span>
                    <span className="text-muted-foreground">
                      {p.homeScore}-{p.awayScore}
                    </span>
                    <span>
                      {p.match.awayTeam?.code} {p.match.awayTeam?.flag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Real: {p.match.homeScore}-{p.match.awayScore}
                    </span>
                    <Badge
                      variant={
                        (p.points ?? 0) > 0 ? "default" : "secondary"
                      }
                    >
                      {p.points} pts
                    </Badge>
                    {p.isWildcard && (
                      <Badge
                        variant="default"
                        className="bg-yellow-500 text-black"
                      >
                        x2
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No quinielas state */}
      {quinielas.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-lg">Aun no tienes quinielas</p>
          <p className="text-sm mt-2">
            Recarga creditos en la seccion de{" "}
            <a href="/recargas" className="text-primary underline">recargas</a>{" "}
            y luego crea tu primera quiniela en{" "}
            <a href="/predicciones" className="text-primary underline">predicciones</a>.
          </p>
        </div>
      )}
    </div>
  );
}
