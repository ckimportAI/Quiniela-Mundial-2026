"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Configurable credit price
const CREDIT_PRICE = 5; // USD per credit

interface PaymentData {
  id: string;
  credits: number;
  amount: string;
  method: string;
  reference: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
}

const PAYMENT_METHODS = [
  "Zelle",
  "Transferencia bancaria",
  "Pago movil",
  "Binance Pay",
  "PayPal",
  "Efectivo",
  "Otro",
];

export default function RecargasPage() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState(0);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formCredits, setFormCredits] = useState(1);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setCredits(data.credits);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: formCredits,
          amount: formCredits * CREDIT_PRICE,
          method,
          reference,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setReference("");
        setNotes("");
        setFormCredits(1);
        setMethod("");
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al enviar reporte de pago");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobado</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recargar Creditos</h1>
        <p className="text-muted-foreground">
          Compra creditos para crear quinielas. Cada credito = 1 quiniela.
        </p>
      </div>

      {/* Credits balance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Creditos disponibles</p>
              <p className="text-4xl font-bold">{credits}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Precio por credito</p>
              <p className="text-2xl font-semibold">${CREDIT_PRICE}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment form */}
      <Card>
        <CardHeader>
          <CardTitle>Reportar Pago</CardTitle>
          <p className="text-sm text-muted-foreground">
            Realiza tu pago y luego completa este formulario con los datos de la
            transferencia. El administrador revisara y aprobara tu pago.
          </p>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✓ Reporte de pago enviado. El administrador lo revisara pronto.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="credits">Cantidad de creditos</Label>
                <Input
                  id="credits"
                  type="number"
                  min={1}
                  max={50}
                  value={formCredits}
                  onChange={(e) => setFormCredits(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto a pagar</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm">
                  ${formCredits * CREDIT_PRICE}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Metodo de pago</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el metodo" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Numero de referencia</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nro de confirmacion o referencia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informacion adicional"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                submitting ||
                !method ||
                reference.length < 3 ||
                formCredits < 1
              }
            >
              {submitting ? "Enviando..." : "Enviar Reporte de Pago"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border animate-pulse bg-muted"
                />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tienes pagos reportados aun.
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {payment.credits} credito{payment.credits > 1 ? "s" : ""}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${payment.amount}
                      </span>
                      {statusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payment.method} - Ref: {payment.reference}
                    </p>
                    {payment.rejectionNote && (
                      <p className="text-xs text-destructive">
                        Motivo: {payment.rejectionNote}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString("es")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
