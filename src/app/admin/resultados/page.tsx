"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Match {
  id: string;
  matchNumber: number;
  phase: string;
  dateTime: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeTeam: { name: string; code: string; flag: string } | null;
  awayTeam: { name: string; code: string; flag: string } | null;
  group: { name: string } | null;
  venue: { city: string } | null;
}

const phaseLabels: Record<string, string> = {
  GROUP_STAGE: "Grupos",
  ROUND_OF_32: "R32",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "4tos",
  SEMI_FINALS: "Semis",
  THIRD_PLACE: "3er",
  FINAL: "Final",
};

export default function AdminResultadosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [filter, setFilter] = useState<"all" | "scheduled" | "finished">(
    "scheduled"
  );

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/matches");
      if (res.ok) {
        setMatches(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredMatches = matches.filter((m) => {
    if (filter === "scheduled") return m.status === "SCHEDULED";
    if (filter === "finished") return m.status === "FINISHED";
    return true;
  });

  const handleEdit = (match: Match) => {
    setEditingId(match.id);
    setHomeScore(match.homeScore?.toString() ?? "");
    setAwayScore(match.awayScore?.toString() ?? "");
  };

  const handleSave = async (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, homeScore: h, awayScore: a }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al guardar resultado");
        return;
      }

      const data = await res.json();
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                homeScore: h,
                awayScore: a,
                status: "FINISHED",
              }
            : m
        )
      );
      setEditingId(null);
      alert(`Resultado guardado. ${data.predictionsUpdated} predicciones actualizadas.`);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm("Recalcular todos los puntos?")) return;
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(
          `Recalculado: ${data.matchesProcessed} partidos, ${data.predictionsUpdated} predicciones, ${data.quinielasUpdated ?? data.usersUpdated ?? 0} quinielas`
        );
      } else {
        alert("Error al recalcular");
      }
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Cargar Resultados</h1>
        <div className="h-96 rounded-lg border animate-pulse bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground"
        >
          Admin
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Resultados</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Cargar Resultados
        </h1>
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={recalculating}
        >
          {recalculating ? "Recalculando..." : "Recalcular Todo"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["scheduled", "finished", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "scheduled"
              ? "Pendientes"
              : f === "finished"
                ? "Finalizados"
                : "Todos"}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground self-center ml-2">
          {filteredMatches.length} partidos
        </span>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {filteredMatches.map((match) => (
          <Card key={match.id}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Match info */}
                <div className="w-16 text-xs text-muted-foreground">
                  <div>#{match.matchNumber}</div>
                  <div>
                    {match.group
                      ? `G${match.group.name}`
                      : phaseLabels[match.phase]}
                  </div>
                </div>

                {/* Teams */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {match.homeTeam
                        ? `${match.homeTeam.flag} ${match.homeTeam.name}`
                        : "TBD"}
                    </span>
                    <span className="text-sm font-medium">
                      {match.awayTeam
                        ? `${match.awayTeam.name} ${match.awayTeam.flag}`
                        : "TBD"}
                    </span>
                  </div>
                </div>

                {/* Score / Edit */}
                <div className="flex items-center gap-2 min-w-[180px] justify-end">
                  {editingId === match.id ? (
                    <>
                      <Input
                        type="number"
                        min={0}
                        value={homeScore}
                        onChange={(e) => setHomeScore(e.target.value)}
                        className="w-14 h-8 text-center text-sm"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        min={0}
                        value={awayScore}
                        onChange={(e) => setAwayScore(e.target.value)}
                        className="w-14 h-8 text-center text-sm"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={saving}
                        onClick={() => handleSave(match.id)}
                      >
                        {saving ? "..." : "OK"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setEditingId(null)}
                      >
                        X
                      </Button>
                    </>
                  ) : (
                    <>
                      {match.status === "FINISHED" ? (
                        <Badge variant="secondary">
                          {match.homeScore} - {match.awayScore}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(match)}
                      >
                        {match.status === "FINISHED" ? "Editar" : "Resultado"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
