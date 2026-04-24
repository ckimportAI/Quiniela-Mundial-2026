"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Radio, Zap } from "lucide-react";

interface SyncResultItem {
  skipped?: boolean;
  updated?: boolean;
  reason?: string;
  matchNumber?: number;
  homeScore?: number;
  awayScore?: number;
  home?: string;
  away?: string;
  affectedQuinielas?: number;
}

interface SyncResponse {
  mode: string;
  fixturesChecked: number;
  updated: number;
  results: SyncResultItem[];
}

export function SyncResultsPanel() {
  const [apiStatus, setApiStatus] = useState<{
    requestsToday: number;
    limitDay: number;
    remaining: number;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/api-football-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setApiStatus)
      .catch(() => {});
  }, []);

  const handleSync = async (mode: "live" | "all") => {
    setSyncing(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch(`/api/cron/sync-results?mode=${mode}`);
      if (!res.ok) {
        const e = await res.json();
        setError(e.error ?? "Error al sincronizar");
        return;
      }
      const data: SyncResponse = await res.json();
      setLastResult(data);
      // Refresh status
      const s = await fetch("/api/admin/api-football-status").then((r) =>
        r.ok ? r.json() : null
      );
      if (s) setApiStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Sincronizacion de Resultados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {apiStatus ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                API-Football (api-sports.io)
              </span>
              <span className="font-mono">
                {apiStatus.requestsToday}/{apiStatus.limitDay} hoy
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${Math.min(100, (apiStatus.requestsToday / apiStatus.limitDay) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Cargando estado API...</p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={syncing}
            onClick={() => handleSync("live")}
            className="flex-1"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Sync partidos en vivo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={syncing}
            onClick={() => handleSync("all")}
            className="flex-1"
          >
            Sync todos
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {lastResult && (
          <div className="rounded-lg border p-3 text-xs space-y-1">
            <p className="font-medium">
              {lastResult.updated} partido{lastResult.updated !== 1 ? "s" : ""}{" "}
              actualizado{lastResult.updated !== 1 ? "s" : ""}{" "}
              <span className="text-muted-foreground">
                ({lastResult.fixturesChecked} revisados en modo {lastResult.mode})
              </span>
            </p>
            {lastResult.updated > 0 && (
              <ul className="mt-2 space-y-1">
                {lastResult.results
                  .filter((r) => r.updated)
                  .map((r, idx) => (
                    <li key={idx} className="text-green-700">
                      #{r.matchNumber}: {r.homeScore}-{r.awayScore} ({r.affectedQuinielas} quinielas)
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Los partidos se sincronizan automaticamente cuando estan en vivo. Usa
          estos botones para forzar la sincronizacion manualmente.
        </p>
      </CardContent>
    </Card>
  );
}
