"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardEntry {
  rank: number;
  member: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      nickname: string | null;
      image: string | null;
    };
    quiniela: {
      name: string;
      score: {
        totalPoints: number;
        exactScores: number;
        correctResults: number;
        partialScores: number;
      } | null;
    };
  };
}

interface SubQuinielaLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function SubQuinielaLeaderboard({
  entries,
  currentUserId,
}: SubQuinielaLeaderboardProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-black">1</Badge>;
    if (rank === 2) return <Badge variant="secondary">2</Badge>;
    if (rank === 3) return <Badge variant="outline">3</Badge>;
    return <span className="text-sm text-muted-foreground ml-2">{rank}</span>;
  };

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay miembros aun.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Jugador</TableHead>
          <TableHead className="hidden sm:table-cell">Quiniela</TableHead>
          <TableHead className="text-right">Pts</TableHead>
          <TableHead className="text-right hidden sm:table-cell">Exactos</TableHead>
          <TableHead className="text-right hidden sm:table-cell">Aciertos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(({ rank, member }) => {
          const isCurrentUser = member.userId === currentUserId;
          const score = member.quiniela.score;

          return (
            <TableRow
              key={member.id}
              className={isCurrentUser ? "bg-accent/50 font-medium" : ""}
            >
              <TableCell>{getRankBadge(rank)}</TableCell>
              <TableCell>
                <div>
                  <span className={isCurrentUser ? "font-bold" : ""}>
                    {member.user.nickname ?? member.user.name ?? "Sin nombre"}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-1">(tu)</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {member.quiniela.name}
              </TableCell>
              <TableCell className="text-right font-bold">
                {score?.totalPoints ?? 0}
              </TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                {score?.exactScores ?? 0}
              </TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                {score?.correctResults ?? 0}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
