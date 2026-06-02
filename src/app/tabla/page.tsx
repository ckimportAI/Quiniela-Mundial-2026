import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  // Determine scoping based on viewer's liga context
  // - Liga members or owners -> their liga's leaderboard
  // - Everyone else -> general (ligaId IS NULL OR alsoInGeneral = true)
  const session = await getServerSession(authOptions);
  let viewingLigaId: string | null = null;
  let viewingLigaName: string | null = null;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        ligaId: true,
        liga: { select: { name: true } },
        ownedLigas: {
          where: { active: true },
          select: { id: true, name: true },
          take: 1,
        },
      },
    });
    viewingLigaId = u?.ligaId ?? u?.ownedLigas?.[0]?.id ?? null;
    viewingLigaName = u?.liga?.name ?? u?.ownedLigas?.[0]?.name ?? null;
  }

  const where = viewingLigaId
    ? { ligaId: viewingLigaId }
    : { OR: [{ ligaId: null }, { alsoInGeneral: true }] };

  const quinielas = await prisma.quiniela.findMany({
    where,
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

  const aiLogos: Record<string, string> = {
    claude: "/ai-logos/claude.svg",
    chatgpt: "/ai-logos/chatgpt.svg",
    gemini: "/ai-logos/gemini.svg",
    grok: "/ai-logos/grok.svg",
    deepseek: "/ai-logos/deepseek.svg",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {viewingLigaName ? `Leaderboard · ${viewingLigaName}` : "Leaderboard"}
        </h1>
        <p className="text-muted-foreground">
          {viewingLigaName
            ? "Clasificacion privada de tu liga."
            : "Clasificacion general de todas las quinielas."}{" "}
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
                      {q.isAi && q.aiProvider && aiLogos[q.aiProvider] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={aiLogos[q.aiProvider]}
                          alt={q.user.name ?? "AI"}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        q.user.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.user.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )
                      )}
                      <span className="font-medium">
                        {q.isAi
                          ? q.user.name ?? q.user.nickname ?? "AI"
                          : q.user.nickname ?? q.user.name ?? "Sin nombre"}
                      </span>
                      {q.isAi && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] px-1.5 py-0">
                          AI
                        </Badge>
                      )}
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
