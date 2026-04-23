"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PoolSummary {
  poolUsd: number;
  totalUsd: number;
}

export function SiteConfigPanel() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [pool, setPool] = useState<PoolSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/config").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pool").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cfg, pool]) => {
        if (cfg?.config) setConfig(cfg.config);
        if (pool) setPool({ poolUsd: pool.poolUsd, totalUsd: pool.totalUsd });
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string) => {
    const current = config[key] === "true";
    const next = !current;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: String(next) }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, [key]: String(next) }));
      } else {
        alert("No se pudo actualizar");
      }
    } finally {
      setSaving(false);
    }
  };

  const showPoolHome = config.show_pool_home === "true";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuracion del sitio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Mostrar pool en Home</p>
                <p className="text-xs text-muted-foreground">
                  Visible para todos los visitantes
                </p>
                {pool && (
                  <p className="text-xs mt-1">
                    Pool actual:{" "}
                    <strong>
                      ${pool.poolUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      (de ${pool.totalUsd.toFixed(2)} recaudados)
                    </span>
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={showPoolHome ? "default" : "outline"}
                disabled={saving}
                onClick={() => toggle("show_pool_home")}
              >
                {showPoolHome ? "Activado" : "Desactivado"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
