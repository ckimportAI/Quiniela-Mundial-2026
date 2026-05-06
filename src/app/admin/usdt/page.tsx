"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, Plus, Trash2, Loader2 } from "lucide-react";

interface Summary {
  totalBsRecaudado: number;
  totalUsdRecaudado: number;
  totalBsConvertido: number;
  totalUsdt: number;
  pendingBs: number;
  avgRate: number;
  poolUsd: number;
}

interface Conversion {
  id: string;
  bsAmount: number;
  usdtAmount: number;
  rate: number;
  conversionDate: string;
  notes: string | null;
  createdAt: string;
}

const fmtBs = (n: number) =>
  n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AdminUsdtPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [bsAmount, setBsAmount] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [conversionDate, setConversionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usdt");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setConversions(data.conversions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const computedRate =
    bsAmount && usdtAmount && Number(usdtAmount) > 0
      ? Number(bsAmount) / Number(usdtAmount)
      : null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const bs = Number(bsAmount);
      const usdt = Number(usdtAmount);
      if (!bs || !usdt) {
        setError("Ingresa montos validos");
        return;
      }
      const res = await fetch("/api/admin/usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bsAmount: bs,
          usdtAmount: usdt,
          conversionDate: new Date(conversionDate + "T12:00:00Z").toISOString(),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }
      // Reset form
      setBsAmount("");
      setUsdtAmount("");
      setNotes("");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta conversion?")) return;
    const res = await fetch(`/api/admin/usdt/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Pool USDT Tracking
        </h1>
        <p className="text-muted-foreground">
          Registra cuando conviertes Bs a USDT para llevar la contabilidad del pool de premios.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <>
          {/* Summary */}
          {summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Recaudado total
                    </p>
                    <p className="text-xl font-bold tabular-nums">
                      Bs. {fmtBs(summary.totalBsRecaudado)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${fmtUsd(summary.totalUsdRecaudado)} USD
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Convertido a USDT</p>
                    <p className="text-xl font-bold tabular-nums text-green-700">
                      {fmtUsd(summary.totalUsdt)} USDT
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bs. {fmtBs(summary.totalBsConvertido)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Pendiente de convertir
                    </p>
                    <p
                      className={`text-xl font-bold tabular-nums ${summary.pendingBs > 0 ? "text-yellow-700" : "text-muted-foreground"}`}
                    >
                      Bs. {fmtBs(summary.pendingBs)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-sm grid sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Tasa promedio:</span>{" "}
                    <strong>{summary.avgRate > 0 ? summary.avgRate.toFixed(4) : "-"} Bs/USDT</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pool de premios:</span>{" "}
                    <strong>${fmtUsd(summary.poolUsd)}</strong>{" "}
                    <span className="text-xs text-muted-foreground">(70% del recaudado)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New conversion form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Nueva conversion</span>
                {!showForm && (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Registrar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            {showForm && (
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Monto Bs convertido</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bsAmount}
                      onChange={(e) => setBsAmount(e.target.value)}
                      placeholder="100000.00"
                    />
                  </div>
                  <div>
                    <Label>USDT recibido</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(e.target.value)}
                      placeholder="185.50"
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={conversionDate}
                      onChange={(e) => setConversionDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Notas (opcional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Binance P2P, etc"
                    />
                  </div>
                </div>

                {computedRate !== null && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                    Tasa calculada:{" "}
                    <strong>{computedRate.toFixed(4)} Bs/USDT</strong>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !bsAmount || !usdtAmount}
                  >
                    {submitting ? "Guardando..." : "Guardar conversion"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Historial */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Historial de conversiones ({conversions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aun no hay conversiones registradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {conversions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            Bs. {fmtBs(c.bsAmount)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium text-green-700">
                            {fmtUsd(c.usdtAmount)} USDT
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({c.rate.toFixed(4)} Bs/USDT)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(c.conversionDate).toLocaleDateString("es-VE")}
                          {c.notes && ` · ${c.notes}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
