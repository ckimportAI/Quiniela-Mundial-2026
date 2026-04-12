"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuinielaSelector } from "@/components/quiniela/quiniela-selector";

interface GroupData {
  id: string;
  name: string;
  teams: { id: string; name: string; flag: string | null }[];
}

export default function PrediccionesPage() {
  const [quinielaId, setQuinielaId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predicciones</h1>
        <p className="text-muted-foreground">
          Ingresa tus predicciones para cada partido del Mundial.
        </p>
      </div>

      {/* Quiniela selector */}
      <QuinielaSelector selectedId={quinielaId} onSelect={setQuinielaId} />

      {quinielaId && (
        <>
          {/* Tournament predictions */}
          <Card>
            <CardHeader>
              <CardTitle>Predicciones de Torneo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Predice el campeon (20 pts), subcampeon (10 pts), tercer lugar (5
                pts) y goleador (5 pts). Disponible hasta que termine la fase de
                grupos.
              </p>
              <Button asChild>
                <Link href={`/predicciones/torneo?q=${quinielaId}`}>
                  Hacer predicciones de torneo
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Group predictions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Predicciones por Grupo
            </h2>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-lg border animate-pulse bg-muted"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/predicciones/grupos/${group.id}?q=${quinielaId}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <p className="font-semibold mb-2">
                          Grupo {group.name}
                        </p>
                        <div className="space-y-1">
                          {group.teams.map((team) => (
                            <div
                              key={team.id}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <span>{team.flag}</span>
                              <span>{team.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
