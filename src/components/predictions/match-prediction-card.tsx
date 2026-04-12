"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            #{match.matchNumber} &middot;{" "}
            {match.group ? `Grupo ${match.group.name}` : match.phase}
          </span>
          <div className="flex items-center gap-1">
            {isWildcard && (
              <Badge variant="default" className="bg-yellow-500 text-black">
                Comodin
              </Badge>
            )}
            {isFinished && prediction?.points != null && (
              <Badge
                variant={prediction.points > 0 ? "default" : "secondary"}
              >
                {prediction.points} pts
              </Badge>
            )}
            {isLocked && !isFinished && (
              <Badge variant="outline">Cerrado</Badge>
            )}
          </div>
        </div>

        {/* Teams & prediction inputs */}
        <div className="flex items-center gap-2">
          {/* Home */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-sm font-medium truncate">
                {match.homeTeam?.name ?? "TBD"}
              </span>
              {match.homeTeam?.flag && (
                <span className="text-base">{match.homeTeam.flag}</span>
              )}
            </div>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-1 px-1">
            <Input
              type="number"
              min={0}
              max={99}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={isLocked || isFinished}
              className="w-12 h-9 text-center text-sm font-bold p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground text-sm">-</span>
            <Input
              type="number"
              min={0}
              max={99}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={isLocked || isFinished}
              className="w-12 h-9 text-center text-sm font-bold p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Away */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              {match.awayTeam?.flag && (
                <span className="text-base">{match.awayTeam.flag}</span>
              )}
              <span className="text-sm font-medium truncate">
                {match.awayTeam?.name ?? "TBD"}
              </span>
            </div>
          </div>
        </div>

        {/* Actual result if finished */}
        {isFinished && match.homeScore != null && match.awayScore != null && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            Resultado: {match.homeScore} - {match.awayScore}
          </div>
        )}

        {/* Footer: date, wildcard toggle, save */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {format(new Date(match.dateTime), "EEE d MMM, HH:mm", {
              locale: es,
            })}
          </span>

          <div className="flex items-center gap-2">
            {!isLocked && !isFinished && (
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
            )}

            {!isLocked && !isFinished && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
