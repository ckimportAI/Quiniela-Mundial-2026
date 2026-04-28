"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trophy,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
} from "lucide-react";

interface PreviewWinner {
  quinielaId: string;
  userId: string;
  posicion: 1 | 2 | 3;
  puntosFinales: number;
  empatadosCon: number;
  premioUsd: number;
  quinielaName: string;
  userNickname: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface Preview {
  totalRecaudadoUsd: number;
  poolUsd: number;
  poolPercentage: number;
  winners: PreviewWinner[];
  tournamentClosed: boolean;
}

interface Ganador {
  id: string;
  posicion: number;
  puntosFinales: number;
  empatadosCon: number;
  premioUsd: string;
  status: "PENDIENTE_DATOS" | "DATOS_RECIBIDOS" | "PAGADO" | "NO_RECLAMADO";
  bancoCobro: string | null;
  telefonoCobro: string | null;
  cedulaCobro: string | null;
  notasCobro: string | null;
  fechaDatosCobro: string | null;
  metodoPago: string | null;
  referenciaPago: string | null;
  tasaEurBcvPago: string | null;
  montoPagadoBs: string | null;
  comprobanteUrl: string | null;
  notasAdmin: string | null;
  fechaPago: string | null;
  fechaOtorgado: string;
  fechaLimite: string;
  user: {
    id: string;
    nickname: string | null;
    name: string | null;
    email: string;
    phone: string | null;
    cedula: string | null;
  };
  quiniela: { id: string; name: string };
}

export default function AdminGanadoresPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [winners, setWinners] = useState<Ganador[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmInput, setConfirmInput] = useState("");
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, wRes] = await Promise.all([
        fetch("/api/admin/winners/preview"),
        fetch("/api/admin/winners"),
      ]);
      if (pRes.ok) setPreview(await pRes.json());
      if (wRes.ok) {
        const data = await wRes.json();
        setWinners(data.winners);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = async () => {
    if (confirmInput !== "CERRAR_TORNEO") return;
    if (
      !confirm(
        "¿Cerrar el torneo y crear registros de ganadores? Esta accion es irreversible."
      )
    ) {
      return;
    }
    setClosing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/winners/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CERRAR_TORNEO" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setConfirmInput("");
      load();
    } finally {
      setClosing(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE_DATOS":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Esperando datos</Badge>;
      case "DATOS_RECIBIDOS":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Listo para pagar</Badge>;
      case "PAGADO":
        return <Badge className="bg-green-600">Pagado</Badge>;
      case "NO_RECLAMADO":
        return <Badge variant="destructive">No reclamado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const positionEmoji = (pos: number) =>
    pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏆";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Ganadores del Mundial
        </h1>
        <p className="text-muted-foreground">
          Cierre del torneo, calculo de premios y pagos en Bs.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <>
          {/* Preview / Status */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pool de premios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Recaudado USD</p>
                    <p className="text-2xl font-bold">${preview.totalRecaudadoUsd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pool ({(preview.poolPercentage * 100).toFixed(0)}%)</p>
                    <p className="text-2xl font-bold text-yellow-700">${preview.poolUsd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ganadores calculados</p>
                    <p className="text-2xl font-bold">{preview.winners.length}</p>
                  </div>
                </div>

                {preview.tournamentClosed ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                    El torneo ya fue cerrado. Los ganadores estan registrados abajo.
                  </div>
                ) : (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      Torneo abierto
                    </div>
                    <p className="text-xs text-yellow-800">
                      Antes de cerrar, asegurate que TODOS los partidos esten cargados con sus resultados.
                      Una vez cerrado, los ganadores tendran 30 dias para reclamar el premio.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-yellow-800 text-xs">
                        Escribe <code className="font-mono bg-yellow-100 px-1 rounded">CERRAR_TORNEO</code> para confirmar
                      </Label>
                      <Input
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder="CERRAR_TORNEO"
                        className="bg-white"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    <Button
                      onClick={handleClose}
                      disabled={confirmInput !== "CERRAR_TORNEO" || closing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {closing ? "Cerrando..." : "Cerrar torneo y crear ganadores"}
                    </Button>
                  </div>
                )}

                {/* Preview list */}
                {!preview.tournamentClosed && preview.winners.length > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Vista previa (esta sera la lista de ganadores al cerrar)
                    </p>
                    {preview.winners.map((w, idx) => (
                      <div
                        key={`${w.quinielaId}-${idx}`}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{positionEmoji(w.posicion)}</span>
                          <div>
                            <p className="font-medium">
                              {w.userNickname ?? w.userName ?? "?"} ({w.quinielaName})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {w.puntosFinales} pts
                              {w.empatadosCon > 1 && ` · empatado con ${w.empatadosCon - 1} mas`}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold">${w.premioUsd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active winners list */}
          {winners.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Ganadores registrados ({winners.length})
              </h2>
              {winners.map((g) => (
                <WinnerCard key={g.id} ganador={g} onUpdate={load} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  function WinnerCard({
    ganador,
    onUpdate,
  }: {
    ganador: Ganador;
    onUpdate: () => void;
  }) {
    const [showPayForm, setShowPayForm] = useState(false);
    const [metodoPago, setMetodoPago] = useState("Pago Movil");
    const [referencia, setReferencia] = useState("");
    const [tasaEur, setTasaEur] = useState("");
    const [montoBs, setMontoBs] = useState("");
    const [comprobanteUrl, setComprobanteUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Auto-calc montoBs when tasa changes
    useEffect(() => {
      if (tasaEur && Number(tasaEur) > 0) {
        const calc = Number(ganador.premioUsd) * Number(tasaEur);
        setMontoBs(calc.toFixed(2));
      }
    }, []);

    const handleMarkPaid = async () => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/admin/winners/${ganador.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_paid",
            metodoPago,
            referenciaPago: referencia,
            tasaEurBcvPago: Number(tasaEur),
            montoPagadoBs: Number(montoBs),
            comprobanteUrl: comprobanteUrl || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error);
          return;
        }
        setShowPayForm(false);
        onUpdate();
      } finally {
        setSubmitting(false);
      }
    };

    const handleMarkUnclaimed = async () => {
      if (!confirm("Marcar este premio como no reclamado?")) return;
      const res = await fetch(`/api/admin/winners/${ganador.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_unclaimed" }),
      });
      if (res.ok) onUpdate();
    };

    const canPay = ganador.status === "DATOS_RECIBIDOS";

    return (
      <Card className={ganador.status === "PAGADO" ? "opacity-75" : ""}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{positionEmoji(ganador.posicion)}</span>
                <div>
                  <p className="font-bold">
                    {ganador.user.nickname ?? ganador.user.name ?? "?"} ({ganador.quiniela.name})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ganador.user.email}
                    {ganador.user.phone && ` · ${ganador.user.phone}`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Posicion {ganador.posicion} · {ganador.puntosFinales} pts
                {ganador.empatadosCon > 1 && ` · empate con ${ganador.empatadosCon - 1} mas`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">${Number(ganador.premioUsd).toFixed(2)}</p>
              <div className="mt-1">{statusBadge(ganador.status)}</div>
            </div>
          </div>

          {/* Cobro data */}
          {ganador.bancoCobro ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="font-medium text-blue-800 mb-1">Datos de cobro</p>
              <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-blue-900">
                <div><strong>Banco:</strong> {ganador.bancoCobro}</div>
                <div><strong>Telefono:</strong> {ganador.telefonoCobro}</div>
                <div><strong>Cedula:</strong> {ganador.cedulaCobro}</div>
                {ganador.notasCobro && <div><strong>Notas:</strong> {ganador.notasCobro}</div>}
              </div>
            </div>
          ) : ganador.status !== "PAGADO" && ganador.status !== "NO_RECLAMADO" && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
              Esperando que el ganador entregue sus datos de cobro. Plazo hasta:{" "}
              {new Date(ganador.fechaLimite).toLocaleDateString("es-VE")}
            </div>
          )}

          {/* Payment data */}
          {ganador.status === "PAGADO" && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
              <p className="font-medium text-green-800 mb-1">Pagado</p>
              <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-green-900">
                <div><strong>Metodo:</strong> {ganador.metodoPago}</div>
                <div><strong>Ref:</strong> {ganador.referenciaPago}</div>
                <div><strong>Tasa Euro BCV:</strong> {ganador.tasaEurBcvPago}</div>
                <div><strong>Monto Bs:</strong> {Number(ganador.montoPagadoBs ?? 0).toLocaleString("es-VE")}</div>
                <div><strong>Fecha:</strong> {ganador.fechaPago && new Date(ganador.fechaPago).toLocaleString("es-VE")}</div>
              </div>
              {ganador.comprobanteUrl && (
                <a
                  href={ganador.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 underline mt-2 inline-block"
                >
                  Ver comprobante →
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          {ganador.status !== "PAGADO" && ganador.status !== "NO_RECLAMADO" && (
            <div className="flex gap-2 flex-wrap">
              {canPay && !showPayForm && (
                <Button size="sm" onClick={() => setShowPayForm(true)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Marcar pagado
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleMarkUnclaimed}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                No reclamado
              </Button>
            </div>
          )}

          {showPayForm && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
              <p className="text-sm font-medium">Confirmar pago</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Metodo</Label>
                  <Input
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Referencia</Label>
                  <Input
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tasa Euro BCV del dia</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={tasaEur}
                    onChange={(e) => {
                      setTasaEur(e.target.value);
                      if (e.target.value && Number(e.target.value) > 0) {
                        setMontoBs((Number(ganador.premioUsd) * Number(e.target.value)).toFixed(2));
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Monto pagado Bs</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={montoBs}
                    onChange={(e) => setMontoBs(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Comprobante URL (opcional)</Label>
                  <Input
                    value={comprobanteUrl}
                    onChange={(e) => setComprobanteUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleMarkPaid}
                  disabled={
                    submitting ||
                    !metodoPago ||
                    referencia.length < 3 ||
                    !tasaEur ||
                    !montoBs
                  }
                >
                  {submitting ? "Guardando..." : "Confirmar pago"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPayForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
