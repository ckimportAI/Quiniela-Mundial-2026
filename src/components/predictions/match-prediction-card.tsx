"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TeamFlag } from "@/components/ui/team-flag";
import type { MatchWithDetails } from "@/lib/types";

interface MatchPredictionCardProps {
  match: MatchWithDetails;
  prediction?: {
    homeScore: number;
    awayScore: number;
    isWildcard: boolean;
    points?: number | null;
  };
  wildcardCount: number;
  maxWildcards: number;
  onSave: (data: {
    matchId: string;
    homeScore: number;
    awayScore: number;
    isWildcard: boolean;
  }) => Promise<void>;
}

export function MatchPredictionCard({
  match,
  prediction,
  wildcardCount,
  maxWildcards,
  onSave,
}: MatchPredictionCardProps) {
  const [homeScore, setHomeScore] = useState<string>(
    prediction?.homeScore?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState<string>(
    prediction?.awayScore?.toString() ?? ""
  );
  const [isWildcard, setIsWildcard] = useState(
    prediction?.isWildcard ?? false
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const lockTime = new Date(match.dateTime);
  lockTime.setMinutes(lockTime.getMinutes() - 5);
  const isLocked = new Date() >= lockTime;
  const isFinished = match.status === "FINISHED";
  const canUseWildcard =
    !isWildcard && wildcardCount < maxWildcards && !isLocked;

  const hasChanges =
    homeScore !== (prediction?.homeScore?.toString() ?? "") ||
    awayScore !== (prediction?.awayScore?.toString() ?? "") ||
    isWildcard !== (prediction?.isWildcard ?? false);

  const handleSave = async () => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setSaving(true);
    try {
      await onSave({
        matchId: match.id,
        homeScore: h,
        awayScore: a,
        isWildcard,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className={
        isWildcard
          ? "border-yellow-500 border-2"
          : isFinished && prediction?.points != null
            ? prediction.points > 0
              ? "border-green-500/50"
              : "border-red-500/30"
            : ""
      }
    >
      <CardContent className="px-3 py-2.5">
        {/* Row 1: match info + badges + date */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              #{match.matchNumber} &middot;{" "}
              {match.group ? `Grupo ${match.group.name}` : match.phase}
            </span>
            {isWildcard && (
              <Badge variant="default" className="bg-yellow-500 text-black text-[10px] px-1.5 py-0">
                Comodin
              </Badge>
            )}
            {isFinished && prediction?.points != null && (
              <Badge
                variant={prediction.points > 0 ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {prediction.points} pts
              </Badge>
            )}
            {isLocked && !isFinished && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Cerrado</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(match.dateTime), "d MMM HH:mm", { locale: es })}
          </span>
        </div>

        {/* Row 2: Teams & score inputs */}
        <div className="flex items-center gap-1.5">
          {/* Home */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-sm font-medium truncate">
                {match.homeTeam?.name ?? "TBD"}
              </span>
              {match.homeTeam && (
                <TeamFlag code={match.homeTeam.code} size="md" />
              )}
            </div>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-1 px-0.5">
            <Input
              type="number"
              min={0}
              max={99}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={isLocked || isFinished}
              className="w-10 h-8 text-center text-sm font-bold p-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground text-xs">-</span>
            <Input
              type="number"
              min={0}
              max={99}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={isLocked || isFinished}
              className="w-10 h-8 text-center text-sm font-bold p-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Away */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              {match.awayTeam && (
                <TeamFlag code={match.awayTeam.code} size="md" />
              )}
              <span className="text-sm font-medium truncate">
                {match.awayTeam?.name ?? "TBD"}
              </span>
            </div>
          </div>
        </div>

        {/* Actual result if finished */}
        {isFinished && match.homeScore != null && match.awayScore != null && (
          <div className="text-center text-xs text-muted-foreground mt-1">
            Resultado: {match.homeScore} - {match.awayScore}
          </div>
        )}

        {/* Row 3: Wildcard + Save centered */}
        {!isLocked && !isFinished && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border/40">
            <Button
              variant={isWildcard ? "default" : "outline"}
              size="sm"
              className={
                isWildcard
                  ? "bg-yellow-500 hover:bg-yellow-600 text-black h-7 text-xs"
                  : "h-7 text-xs"
              }
              disabled={!canUseWildcard && !isWildcard}
              onClick={() => setIsWildcard(!isWildcard)}
            >
              {isWildcard ? "Quitar Comodin" : "Comodin"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={
                saving ||
                homeScore === "" ||
                awayScore === "" ||
                !hasChanges
              }
              onClick={handleSave}
            >
              {saving ? "..." : saved ? "Guardado" : "Guardar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
