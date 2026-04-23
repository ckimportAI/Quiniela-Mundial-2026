"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QuinielaSelector } from "@/components/quiniela/quiniela-selector";
import Link from "next/link";
import { TeamFlag } from "@/components/ui/team-flag";
import { TeamSelect } from "@/components/ui/team-select";

interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
}

interface TournamentPrediction {
  id: string;
  type: string;
  teamId: string | null;
  playerName: string | null;
  points: number | null;
  team: Team | null;
}

const TOP_SCORER_OPTIONS = [
  { name: "Kylian Mbappé", country: "FRA" },
  { name: "Harry Kane", country: "ENG" },
  { name: "Erling Haaland", country: "NOR" },
  { name: "Lionel Messi", country: "ARG" },
  { name: "Lamine Yamal", country: "ESP" },
  { name: "Cristiano Ronaldo", country: "POR" },
];

const predictionTypes = [
  {
    type: "CHAMPION",
    label: "Campeon",
    points: 20,
    needsTeam: true,
    needsPlayer: false,
  },
  {
    type: "RUNNER_UP",
    label: "Subcampeon",
    points: 10,
    needsTeam: true,
    needsPlayer: false,
  },
  {
    type: "THIRD_PLACE",
    label: "Tercer Lugar",
    points: 5,
    needsTeam: true,
    needsPlayer: false,
  },
  {
    type: "TOP_SCORER",
    label: "Goleador del Torneo",
    points: 5,
    needsTeam: false,
    needsPlayer: true,
  },
];

function TorneoPredictionsContent() {
  const searchParams = useSearchParams();
  const [quinielaId, setQuinielaId] = useState<string | null>(
    searchParams.get("q")
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [predictions, setPredictions] = useState<Map<string, TournamentPrediction>>(new Map());
  const [selections, setSelections] = useState<
    Record<string, { teamId?: string; playerName?: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch teams (only once)
  useEffect(() => {
    async function loadTeams() {
      const groupsRes = await fetch("/api/groups");
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        const allTeams: Team[] = groups.flatMap(
          (g: { teams: Team[] }) => g.teams
        );
        setTeams(allTeams.sort((a, b) => a.name.localeCompare(b.name)));
      }
    }
    loadTeams();
  }, []);

  // Fetch predictions when quinielaId changes
  useEffect(() => {
    if (!quinielaId) {
      setLoading(false);
      return;
    }

    async function loadPredictions() {
      setLoading(true);
      try {
        const predRes = await fetch(
          `/api/tournament-predictions?quinielaId=${quinielaId}`
        );
        if (predRes.ok) {
          const preds: TournamentPrediction[] = await predRes.json();
          const map = new Map<string, TournamentPrediction>();
          const sels: Record<
            string,
            { teamId?: string; playerName?: string }
          > = {};
          preds.forEach((p) => {
            map.set(p.type, p);
            sels[p.type] = {
              teamId: p.teamId ?? undefined,
              playerName: p.playerName ?? undefined,
            };
          });
          setPredictions(map);
          setSelections(sels);
        }
      } finally {
        setLoading(false);
      }
    }
    loadPredictions();
  }, [quinielaId]);

  const handleSave = async (type: string) => {
    if (!quinielaId) return;
    const sel = selections[type];
    if (!sel) return;

    setSaving(type);
    try {
      const res = await fetch("/api/tournament-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quinielaId,
          type,
          teamId: sel.teamId,
          playerName: sel.playerName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al guardar");
        return;
      }

      const saved: TournamentPrediction = await res.json();
      setPredictions((prev) => {
        const next = new Map(prev);
        next.set(type, saved);
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/predicciones"
          className="text-muted-foreground hover:text-foreground"
        >
          Predicciones
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Torneo</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Predicciones de Torneo
        </h1>
        <p className="text-muted-foreground">
          Predice campeon, subcampeon, tercer lugar y goleador antes de que
          termine la fase de grupos.
        </p>
      </div>

      {/* Quiniela selector */}
      <QuinielaSelector selectedId={quinielaId} onSelect={setQuinielaId} />

      {!quinielaId ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Selecciona o crea una quiniela para ver tus predicciones de torneo.
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg border animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {predictionTypes.map((pt) => {
            const existing = predictions.get(pt.type);
            const sel = selections[pt.type] ?? {};
            const hasChanged =
              (pt.needsTeam && sel.teamId !== existing?.teamId) ||
              (pt.needsPlayer && sel.playerName !== existing?.playerName);

            return (
              <Card key={pt.type}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{pt.label}</CardTitle>
                    <Badge variant="outline">{pt.points} pts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pt.needsTeam && (
                    <div className="space-y-1.5">
                      <Label>Equipo</Label>
                      <TeamSelect
                        teams={teams}
                        value={sel.teamId ?? ""}
                        onChange={(teamId) =>
                          setSelections((prev) => ({
                            ...prev,
                            [pt.type]: { ...prev[pt.type], teamId },
                          }))
                        }
                      />
                    </div>
                  )}

                  {pt.needsPlayer && (
                    <div className="space-y-1.5">
                      <Label>Goleador</Label>
                      <div className="space-y-2">
                        {TOP_SCORER_OPTIONS.map((player) => (
                          <button
                            key={player.name}
                            type="button"
                            onClick={() =>
                              setSelections((prev) => ({
                                ...prev,
                                [pt.type]: { ...prev[pt.type], playerName: player.name },
                              }))
                            }
                            className={`flex items-center gap-2 w-full rounded-md border px-3 py-2 text-sm transition-colors ${
                              sel.playerName === player.name
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-accent/50"
                            }`}
                          >
                            <TeamFlag code={player.country} size="sm" />
                            <span>{player.name}</span>
                          </button>
                        ))}
                        {/* Otro jugador */}
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelections((prev) => ({
                                ...prev,
                                [pt.type]: { ...prev[pt.type], playerName: "" },
                              }))
                            }
                            className={`flex items-center gap-2 w-full rounded-md border px-3 py-2 text-sm transition-colors ${
                              sel.playerName != null && !TOP_SCORER_OPTIONS.some((p) => p.name === sel.playerName)
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-accent/50"
                            }`}
                          >
                            Otro jugador
                          </button>
                          {sel.playerName != null && !TOP_SCORER_OPTIONS.some((p) => p.name === sel.playerName) && (
                            <Input
                              placeholder="Nombre del jugador"
                              value={sel.playerName ?? ""}
                              onChange={(e) =>
                                setSelections((prev) => ({
                                  ...prev,
                                  [pt.type]: { ...prev[pt.type], playerName: e.target.value },
                                }))
                              }
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {existing?.team && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      Prediccion actual: <TeamFlag code={existing.team.code} size="sm" />{" "}
                      {existing.team.name}
                      {existing.points != null && (
                        <Badge variant="secondary" className="ml-2">
                          {existing.points} pts
                        </Badge>
                      )}
                    </p>
                  )}

                  {existing?.playerName && !existing?.team && (
                    <p className="text-sm text-muted-foreground">
                      Prediccion actual: {existing.playerName}
                      {existing.points != null && (
                        <Badge variant="secondary" className="ml-2">
                          {existing.points} pts
                        </Badge>
                      )}
                    </p>
                  )}

                  <Button
                    size="sm"
                    className="w-full"
                    disabled={
                      saving === pt.type ||
                      !hasChanged ||
                      (pt.needsTeam && !sel.teamId) ||
                      (pt.needsPlayer && !sel.playerName)
                    }
                    onClick={() => handleSave(pt.type)}
                  >
                    {saving === pt.type
                      ? "Guardando..."
                      : existing
                        ? "Actualizar"
                        : "Guardar"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TorneoPredictionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 rounded-lg border animate-pulse bg-muted"
              />
            ))}
          </div>
        </div>
      }
    >
      <TorneoPredictionsContent />
    </Suspense>
  );
}
