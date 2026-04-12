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
  title: "Tabla de Posiciones | Quiniela Mundial 2026",
};

export default async function TablaPage() {
  const entries = await prisma.quinielaScore.findMany({
    include: {
      quiniela: {
        include: {
          user: {
            select: { id: true, name: true, nickname: true, image: true },
          },
        },
      },
    },
    orderBy: { totalPoints: "desc" },
    take: 100,
  });

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tabla de Posiciones
          </h1>
          <p className="text-muted-foreground">
            La tabla se actualizara cuando comiencen los partidos.
          </p>
        </div>

        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          <p className="text-lg">El torneo aun no ha comenzado</p>
          <p className="text-sm mt-2">
            La tabla de posiciones estara disponible una vez que se registren
            resultados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tabla de Posiciones
        </h1>
        <p className="text-muted-foreground">
          Clasificacion general de todas las quinielas.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="hidden sm:table-cell">Quiniela</TableHead>
              <TableHead className="text-center">Pts</TableHead>
              <TableHead className="text-center hidden sm:table-cell">
                Exactos
              </TableHead>
              <TableHead className="text-center hidden sm:table-cell">
                Aciertos
              </TableHead>
              <TableHead className="text-center hidden md:table-cell">
                Parciales
              </TableHead>
              <TableHead className="text-center hidden md:table-cell">
                Comodin
              </TableHead>
              <TableHead className="text-center hidden lg:table-cell">
                Torneo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, idx) => (
              <TableRow key={entry.id}>
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
                    entry.rank ?? idx + 1
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {entry.quiniela.user.image && (
                      <img
                        src={entry.quiniela.user.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="font-medium">
                      {entry.quiniela.user.nickname ?? entry.quiniela.user.name ?? "Sin nombre"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {entry.quiniela.name}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold">
                  {entry.totalPoints}
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {entry.exactScores}
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {entry.correctResults}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  {entry.partialScores}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  {entry.wildcardPoints}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {entry.tournamentPoints}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
