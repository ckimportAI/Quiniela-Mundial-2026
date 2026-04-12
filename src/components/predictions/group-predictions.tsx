"use client";

import { useState, useEffect, useCallback } from "react";
import { MatchPredictionCard } from "./match-prediction-card";
import { MAX_WILDCARDS } from "@/lib/scoring-constants";
import type { MatchWithDetails } from "@/lib/types";

interface PredictionData {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  isWildcard: boolean;
  points: number | null;
}

interface GroupPredictionsProps {
  matches: MatchWithDetails[];
  groupName: string;
  quinielaId: string;
}

export function GroupPredictions({
  matches,
  groupName,
  quinielaId,
}: GroupPredictionsProps) {
  const [predictions, setPredictions] = useState<
    Map<string, PredictionData>
  >(new Map());
  const [wildcardCount, setWildcardCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch predictions for this group and quiniela
      const res = await fetch(
        `/api/predictions?quinielaId=${quinielaId}&groupId=${matches[0]?.groupId ?? ""}`
      );
      if (!res.ok) return;
      const data: (PredictionData & { match: { groupId: string } })[] =
        await res.json();
      const map = new Map<string, PredictionData>();
      data.forEach((p) => map.set(p.matchId, p));
      setPredictions(map);

      // Count total wildcards for this quiniela
      const wcRes = await fetch(`/api/predictions?quinielaId=${quinielaId}`);
      if (wcRes.ok) {
        const allPreds: PredictionData[] = await wcRes.json();
        setWildcardCount(allPreds.filter((p) => p.isWildcard).length);
      }
    } finally {
      setLoading(false);
    }
  }, [matches, quinielaId]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const handleSave = async (data: {
    matchId: string;
    homeScore: number;
    awayScore: number;
    isWildcard: boolean;
  }) => {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, quinielaId }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al guardar prediccion");
      return;
    }

    const saved = await res.json();
    setPredictions((prev) => {
      const next = new Map(prev);
      next.set(saved.matchId, saved);
      return next;
    });

    // Recalculate wildcard count
    const otherWc = wildcardCount - (predictions.get(data.matchId)?.isWildcard ? 1 : 0);
    setWildcardCount(otherWc + (data.isWildcard ? 1 : 0));
  };

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <div
            key={m.id}
            className="h-36 rounded-lg border animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Grupo {groupName}</h2>
        <span className="text-sm text-muted-foreground">
          Comodines: {wildcardCount}/{MAX_WILDCARDS}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <MatchPredictionCard
            key={match.id}
            match={match}
            prediction={predictions.get(match.id)}
            wildcardCount={wildcardCount}
            maxWildcards={MAX_WILDCARDS}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}
