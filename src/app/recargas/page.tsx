"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { Sparkles, Copy, Check } from "lucide-react";

interface PaymentData {
  id: string;
  credits: number;
  amount: string;
  method: string;
  reference: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  promoApplied: boolean;
  createdAt: string;
}

interface PackageData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceUsd: number;
  quinielasCount: number;
  effectiveQuinielas: number;
}

interface PromoData {
  active: boolean;
  name: string;
  startsAt: string;
  endsAt: string;
  multiplier: number;
}

const PAYMENT_METHODS = [
  "Pago Movil",
  "Zelle",
  "Binance Pay",
  "Transferencia bancaria",
];

const PAGO_MOVIL = {
  phone: "0414-234-3406",
  cedula: "V-11.037.269",
  bank: "Banesco",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function RecargasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get("pkg");

  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("Pago Movil");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load packages list to resolve current selection
  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setPromo(data.promo);
        if (packageId) {
          const found = data.packages.find(
            (p: PackageData) => p.id === packageId
          );
          setPkg(found ?? null);
        }
      });
  }, [packageId]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // If no package selected, redirect to packages page
  useEffect(() => {
    if (!packageId) {
      router.replace("/paquetes");
    }
  }, [packageId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;

    setSubmitting(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          amount: pkg.priceUsd,
          method,
          reference,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setReference("");
        setNotes("");
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
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!pkg) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando paquete...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/paquetes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Cambiar paquete
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Reportar Pago
        </h1>
      </div>

      {/* Package summary */}
      <Card className="border-primary border-2">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{pkg.name}</h2>
                {promo?.active && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
                    <Sparkles className="h-3 w-3 mr-1" />
                    2x1
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {promo?.active ? (
                  <>
                    <span className="line-through mr-1">
                      {pkg.quinielasCount} quinielas
                    </span>
                    <strong className="text-green-600">
                      {pkg.effectiveQuinielas} quinielas
                    </strong>{" "}
                    con 2x1
                  </>
                ) : (
                  <>{pkg.quinielasCount} quinielas</>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold">${pkg.priceUsd}</div>
              <p className="text-xs text-muted-foreground">USD</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pago Movil Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos para pagar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Realiza el pago con cualquiera de estos metodos y luego reporta abajo.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-semibold mb-2">Pago Movil (Bs)</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Telefono:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{PAGO_MOVIL.phone}</span>
                  <CopyBtn text={PAGO_MOVIL.phone.replace(/-/g, "")} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Cedula:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{PAGO_MOVIL.cedula}</span>
                  <CopyBtn text={PAGO_MOVIL.cedula} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Banco:</span>
                <span className="font-mono">{PAGO_MOVIL.bank}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              El monto en Bs se calcula con la tasa Euro BCV del dia.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Tambien aceptamos Zelle y Binance Pay (consulta por WhatsApp).
          </p>
        </CardContent>
      </Card>

      {/* Payment report form */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del pago</CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              Reporte enviado. El administrador lo revisara pronto y se crearan
              tus quinielas automaticamente al aprobar.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Nro de confirmacion del banco"
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
              size="lg"
              disabled={submitting || !method || reference.length < 3}
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
            <div className="h-16 rounded-lg border animate-pulse bg-muted" />
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tienes pagos reportados aun.
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {p.credits} quiniela{p.credits > 1 ? "s" : ""}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${p.amount}
                      </span>
                      {p.promoApplied && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[10px]">
                          2x1
                        </Badge>
                      )}
                      {statusBadge(p.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.method} - Ref: {p.reference}
                    </p>
                    {p.rejectionNote && (
                      <p className="text-xs text-destructive">
                        Motivo: {p.rejectionNote}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("es")}
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

export default function RecargasPage() {
  return (
    <Suspense>
      <RecargasContent />
    </Suspense>
  );
}
