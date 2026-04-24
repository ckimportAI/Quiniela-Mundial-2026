import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard | Quiniela Mundial 2026",
};

export default async function LeaderboardPage() {
  // Fetch all non-test quinielas with their scores and prediction count
  const quinielas = await prisma.quiniela.findMany({
    where: { isTest: false },
    include: {
      user: {
        select: { id: true, name: true, nickname: true, image: true },
      },
      score: true,
      _count: { select: { predictions: true } },
    },
    orderBy: [
      { score: { totalPoints: "desc" } },
      { createdAt: "asc" },
    ],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Clasificacion general de todas las quinielas.{" "}
          <span className="font-medium">{quinielas.length} participantes</span>
        </p>
      </div>

      {quinielas.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          <p className="text-lg">No hay quinielas registradas aun</p>
          <p className="text-sm mt-2">
            El ranking aparecera cuando los participantes creen sus quinielas.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="hidden sm:table-cell">Quiniela</TableHead>
                <TableHead className="text-center hidden sm:table-cell">
                  Pred.
                </TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead className="text-center w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quinielas.map((q, idx) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    {idx < 3 ? (
                      <Badge
                        variant={
                          idx === 0
                            ? "default"
                            : idx === 1
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {idx + 1}
                      </Badge>
                    ) : (
                      q.score?.rank ?? idx + 1
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {q.user.image && (
                        <img
                          src={q.user.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {q.user.nickname ?? q.user.name ?? "Sin nombre"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {q.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {q._count.predictions}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {q.score?.totalPoints ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <a
                      href={`/quiniela/${q.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
