"use client";

import Link from "next/link";
import { Users, Crown, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubQuinielaCardProps {
  membership: {
    id: string;
    role: string;
    quinielaId: string;
    quiniela: {
      name: string;
      score: { totalPoints: number; rank: number | null } | null;
    };
    subQuiniela: {
      id: string;
      name: string;
      description: string | null;
      inviteCode: string;
      createdBy: { nickname: string | null };
      _count: { members: number };
    };
  };
}

export function SubQuinielaCard({ membership }: SubQuinielaCardProps) {
  const { subQuiniela, quiniela, role } = membership;

  return (
    <Link href={`/sub-quinielas/${subQuiniela.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{subQuiniela.name}</CardTitle>
            {role === "ADMIN" && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          {subQuiniela.description && (
            <CardDescription>{subQuiniela.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {subQuiniela._count.members} miembros
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {quiniela.score?.totalPoints ?? 0} pts
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Mi quiniela: <span className="font-medium">{quiniela.name}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
