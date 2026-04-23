"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, CheckCircle, XCircle, Sparkles } from "lucide-react";

interface PaymentWithDetails {
  id: string;
  credits: number;
  amount: string;
  amountBs: string | null;
  paymentDate: string | null;
  bcvRateUsd: string | null;
  bcvRateEur: string | null;
  method: string;
  reference: string;
  notes: string | null;
  proofUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  promoApplied: boolean;
  quinielasGranted: number;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string | null;
    nickname: string | null;
    email: string;
    phone: string | null;
    cedula: string | null;
  };
  package: {
    id: string;
    code: string;
    name: string;
    priceUsd: string;
    quinielasCount: number;
  } | null;
}

export default function AdminPagosPage() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/payments?status=${filter}`
        : "/api/admin/payments";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPendingCount(data.pendingCount);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleReview = async (
    paymentId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejectionNote:
            status === "REJECTED" ? rejectionNotes[paymentId] : undefined,
        }),
      });

      if (res.ok) {
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al procesar");
      }
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatBs = (val: string | null) => {
    if (!val) return null;
    return Number(val).toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion de Pagos</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba los reportes de pago.
          {pendingCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "PENDING", label: "Pendientes" },
          { value: "APPROVED", label: "Aprobados" },
          { value: "REJECTED", label: "Rechazados" },
          { value: "", label: "Todos" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Payments cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay pagos {filter === "PENDING" ? "pendientes" : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="grid md:grid-cols-[200px_1fr] gap-4">
                  {/* Proof image */}
                  <div className="w-full">
                    {p.proofUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(p.proofUrl)}
                        className="block w-full rounded-lg overflow-hidden border hover:border-primary transition-colors cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.proofUrl}
                          alt="Comprobante"
                          className="w-full h-40 object-cover"
                        />
                        <div className="text-xs text-center py-1 bg-muted">Ver comprobante</div>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 rounded-lg border border-dashed text-muted-foreground text-xs">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        Sin comprobante
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium">
                          {p.user.nickname ?? p.user.name ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.user.email}
                          {p.user.phone && ` · ${p.user.phone}`}
                          {p.user.cedula && ` · ${p.user.cedula}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.promoApplied && (
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Bonus
                          </Badge>
                        )}
                        {statusBadge(p.status)}
                      </div>
                    </div>

                    {/* Package + Amounts */}
                    <div className="grid sm:grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Paquete</p>
                        <p className="font-medium">
                          {p.package ? `${p.package.name} ($${p.package.priceUsd})` : "Legacy"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.credits} quiniela{p.credits > 1 ? "s" : ""} a crear
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monto reportado</p>
                        <p className="font-medium">
                          ${p.amount} USD
                          {p.amountBs && (
                            <span className="text-sm"> · Bs. {formatBs(p.amountBs)}</span>
                          )}
                        </p>
                        {p.bcvRateEur && (
                          <p className="text-xs text-muted-foreground">
                            Tasa Euro BCV: {Number(p.bcvRateEur).toLocaleString("es-VE", { maximumFractionDigits: 4 })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Payment details */}
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Metodo: </span>
                        <span>{p.method}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Ref: </span>
                        <span className="font-mono text-xs">{p.reference}</span>
                      </div>
                      {p.paymentDate && (
                        <div>
                          <span className="text-xs text-muted-foreground">Fecha pago: </span>
                          <span>{new Date(p.paymentDate).toLocaleDateString("es-VE")}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground">Reportado: </span>
                        <span>{new Date(p.createdAt).toLocaleString("es-VE")}</span>
                      </div>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                        Notas: {p.notes}
                      </p>
                    )}

                    {p.rejectionNote && (
                      <p className="text-xs text-destructive italic border-l-2 border-destructive pl-2">
                        Motivo rechazo: {p.rejectionNote}
                      </p>
                    )}

                    {/* Actions */}
                    {p.status === "PENDING" && (
                      <div className="flex flex-col gap-2 pt-2 border-t">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            disabled={processing === p.id}
                            onClick={() => handleReview(p.id, "APPROVED")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={processing === p.id}
                            onClick={() => handleReview(p.id, "REJECTED")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                        <Input
                          placeholder="Motivo de rechazo (opcional)"
                          className="text-xs h-8"
                          value={rejectionNotes[p.id] ?? ""}
                          onChange={(e) =>
                            setRejectionNotes((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {p.status === "APPROVED" && p.quinielasGranted > 0 && (
                      <p className="text-xs text-green-700 pt-2 border-t">
                        {p.quinielasGranted} quiniela{p.quinielasGranted > 1 ? "s" : ""} creada{p.quinielasGranted > 1 ? "s" : ""} automaticamente
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Comprobante ampliado"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
