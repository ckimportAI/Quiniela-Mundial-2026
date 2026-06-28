"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface KOPhasePredictionsProps {
  quinielaId: string;
}

const PHASE_LABELS: Record<string, string> = {
  ROUND_OF_32: "Treintaidosavos (R32)",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer Lugar",
  FINAL: "Final",
};

const PHASE_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

export function KOPhasePredictions({ quinielaId }: KOPhasePredictionsProps) {
  const [matchesByPhase, setMatchesByPhase] = useState<
    Map<string, MatchWithDetails[]>
  >(new Map());
  const [predictions, setPredictions] = useState<Map<string, PredictionData>>(
    new Map()
  );
  const [wildcardCount, setWildcardCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all KO matches (one call per phase to keep things simple)
      const phaseMatches = new Map<string, MatchWithDetails[]>();
      for (const phase of PHASE_ORDER) {
        const res = await fetch(`/api/matches?phase=${phase}`);
        if (!res.ok) continue;
        const list: MatchWithDetails[] = await res.json();
        // Only include matches with both teams resolved
        const resolved = list.filter((m) => m.homeTeam && m.awayTeam);
        if (resolved.length > 0) phaseMatches.set(phase, resolved);
      }
      setMatchesByPhase(phaseMatches);

      // Fetch all predictions for this quiniela
      const predRes = await fetch(`/api/predictions?quinielaId=${quinielaId}`);
      if (predRes.ok) {
        const allPreds: PredictionData[] = await predRes.json();
        const predMap = new Map<string, PredictionData>();
        allPreds.forEach((p) => predMap.set(p.matchId, p));
        setPredictions(predMap);
        setWildcardCount(allPreds.filter((p) => p.isWildcard).length);
      }
    } finally {
      setLoading(false);
    }
  }, [quinielaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    await fetchData();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Cargando partidos de eliminatorias...
        </CardContent>
      </Card>
    );
  }

  if (matchesByPhase.size === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Predicciones de Eliminatorias</h2>
      {PHASE_ORDER.filter((p) => matchesByPhase.has(p)).map((phase) => {
        const matches = matchesByPhase.get(phase)!;
        return (
          <Card key={phase}>
            <CardHeader>
              <CardTitle className="text-lg">{PHASE_LABELS[phase]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {matches.map((m) => (
                  <MatchPredictionCard
                    key={m.id}
                    match={m}
                    prediction={predictions.get(m.id)}
                    wildcardCount={wildcardCount}
                    maxWildcards={MAX_WILDCARDS}
                    onSave={handleSave}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
