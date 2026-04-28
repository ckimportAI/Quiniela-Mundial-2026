"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";

interface MyWinner {
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
  metodoPago: string | null;
  referenciaPago: string | null;
  tasaEurBcvPago: string | null;
  montoPagadoBs: string | null;
  comprobanteUrl: string | null;
  fechaPago: string | null;
  fechaOtorgado: string;
  fechaLimite: string;
  quiniela: { id: string; name: string };
}

const positionEmoji = (pos: number) =>
  pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏆";

const positionLabel = (pos: number) =>
  pos === 1 ? "PRIMER LUGAR" : pos === 2 ? "SEGUNDO LUGAR" : "TERCER LUGAR";

export default function MisPremiosPage() {
  const [winners, setWinners] = useState<MyWinner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/winners/me");
      if (res.ok) {
        const data = await res.json();
        setWinners(data.winners);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold">Mis Premios</h1>
        <p className="text-muted-foreground mt-2">
          Aun no tienes premios. Una vez que termine el Mundial y se cierre el torneo,
          si quedaste entre los 3 primeros, vas a verlos aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Premios</h1>
        <p className="text-muted-foreground">
          Felicidades por ganar. Sigue las instrucciones para cobrar tu premio.
        </p>
      </div>

      {winners.map((w) => (
        <WinnerView key={w.id} winner={w} onUpdate={load} />
      ))}
    </div>
  );
}

function WinnerView({
  winner,
  onUpdate,
}: {
  winner: MyWinner;
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [banco, setBanco] = useState(winner.bancoCobro ?? "");
  const [telefono, setTelefono] = useState(winner.telefonoCobro ?? "");
  const [cedula, setCedula] = useState(winner.cedulaCobro ?? "");
  const [notas, setNotas] = useState(winner.notasCobro ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = new Date() > new Date(winner.fechaLimite);
  const canSubmit =
    !expired &&
    (winner.status === "PENDIENTE_DATOS" ||
      winner.status === "DATOS_RECIBIDOS");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/winners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ganadorId: winner.id,
          bancoCobro: banco,
          telefonoCobro: telefono,
          cedulaCobro: cedula,
          notasCobro: notas || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setShowForm(false);
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{positionEmoji(winner.posicion)}</span>
            <div>
              <p className="text-xs uppercase tracking-widest text-yellow-700 font-bold">
                {positionLabel(winner.posicion)}
              </p>
              <CardTitle className="text-2xl">
                {winner.quiniela.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {winner.puntosFinales} pts
                {winner.empatadosCon > 1 &&
                  ` · empate con ${winner.empatadosCon - 1} jugador(es)`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Premio</p>
            <p className="text-3xl font-extrabold text-yellow-700">
              ${Number(winner.premioUsd).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">USD</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        {winner.status === "PAGADO" && (
          <div className="rounded-lg bg-green-100 border border-green-300 p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-5 w-5" />
              <p className="font-bold">Premio pagado</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-green-900">
              <div>Metodo: <strong>{winner.metodoPago}</strong></div>
              <div>Ref: <strong>{winner.referenciaPago}</strong></div>
              <div>Monto Bs: <strong>{Number(winner.montoPagadoBs ?? 0).toLocaleString("es-VE")}</strong></div>
              <div>Tasa: <strong>{winner.tasaEurBcvPago}</strong></div>
              {winner.fechaPago && (
                <div>Fecha: <strong>{new Date(winner.fechaPago).toLocaleString("es-VE")}</strong></div>
              )}
            </div>
            {winner.comprobanteUrl && (
              <a
                href={winner.comprobanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 underline mt-2 inline-block"
              >
                Ver comprobante de pago →
              </a>
            )}
          </div>
        )}

        {winner.status === "NO_RECLAMADO" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            Este premio fue marcado como no reclamado por exceder el plazo.
          </div>
        )}

        {(winner.status === "PENDIENTE_DATOS" || winner.status === "DATOS_RECIBIDOS") && (
          <>
            {/* Deadline notice */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>
                  Tienes hasta el{" "}
                  <strong>{new Date(winner.fechaLimite).toLocaleDateString("es-VE")}</strong>{" "}
                  para entregar tus datos de cobro.
                </p>
                {expired && (
                  <p className="text-red-700 font-medium mt-1">
                    El plazo expiro. Contacta a soporte.
                  </p>
                )}
              </div>
            </div>

            {/* Show submitted data or form */}
            {winner.status === "DATOS_RECIBIDOS" && !showForm ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                <p className="font-medium text-green-800 mb-2">
                  ✓ Datos recibidos. Te pagaremos en los proximos dias.
                </p>
                <div className="grid sm:grid-cols-2 gap-1 text-xs text-green-900">
                  <div><strong>Banco:</strong> {winner.bancoCobro}</div>
                  <div><strong>Telefono:</strong> {winner.telefonoCobro}</div>
                  <div><strong>Cedula:</strong> {winner.cedulaCobro}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setShowForm(true)}
                >
                  Editar datos
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Datos para recibir tu premio (Pago Movil)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Banco</Label>
                    <Input
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Banesco, Mercantil, Provincial..."
                    />
                  </div>
                  <div>
                    <Label>Telefono</Label>
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="0414-1234567"
                    />
                  </div>
                  <div>
                    <Label>Cedula</Label>
                    <Input
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="V-12345678"
                    />
                  </div>
                  <div>
                    <Label>Notas (opcional)</Label>
                    <Input
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder=""
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !canSubmit ||
                      submitting ||
                      banco.length < 2 ||
                      telefono.length < 7 ||
                      cedula.length < 5
                    }
                  >
                    {submitting ? "Enviando..." : "Enviar datos"}
                  </Button>
                  {winner.status === "DATOS_RECIBIDOS" && (
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
