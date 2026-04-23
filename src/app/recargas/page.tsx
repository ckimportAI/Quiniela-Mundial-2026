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
import { Sparkles, Copy, Check, Upload, X, Loader2 } from "lucide-react";

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

interface OfferData {
  active: boolean;
  availableForUser: boolean;
  userHasUsedOffer: boolean;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

interface PackageDataExtended extends PackageData {
  bonusQuinielasOferta: number;
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

  const [pkg, setPkg] = useState<PackageDataExtended | null>(null);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("Pago Movil");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Receipt upload + OCR state
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFilename, setProofFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<{
    method: string | null;
    reference: string | null;
    amountBs: number | null;
    amountUsd: number | null;
    date: string | null;
    confidence: string | null;
    destinationPhone: string | null;
  } | null>(null);

  // Load packages list to resolve current selection
  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setOffer(data.offer);
        if (packageId) {
          const found = data.packages.find(
            (p: PackageDataExtended) => p.id === packageId
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

  const handleFileUpload = async (file: File) => {
    setOcrError(null);
    setOcrData(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload/payment-proof", {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        setOcrError(err.error ?? "Error al subir imagen");
        return;
      }
      const uploadData = await uploadRes.json();
      setProofUrl(uploadData.url);
      setProofFilename(uploadData.filename);
      setUploading(false);

      // Run OCR
      setOcrLoading(true);
      const ocrRes = await fetch("/api/ocr/payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploadData.filename }),
      });

      if (!ocrRes.ok) {
        const err = await ocrRes.json();
        setOcrError(err.error ?? "No se pudo leer el comprobante. Completa manualmente.");
        return;
      }

      const { data } = await ocrRes.json();
      setOcrData(data);

      // Pre-fill form fields from OCR
      if (data.method && ["Pago Movil", "Zelle", "Binance Pay", "Transferencia bancaria"].includes(data.method)) {
        setMethod(data.method);
      }
      if (data.reference) {
        setReference(data.reference);
      }
    } catch (err) {
      console.error(err);
      setOcrError("Error al procesar el comprobante");
    } finally {
      setUploading(false);
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;

    setSubmitting(true);
    setSuccess(false);
    setSubmitError(null);

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
          proofUrl: proofUrl || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setReference("");
        setNotes("");
        setProofUrl(null);
        setProofFilename(null);
        setOcrData(null);
        fetchPayments();
      } else {
        const data = await res.json();
        setSubmitError(data.error ?? "Error al enviar reporte de pago");
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl font-bold">{pkg.name}</h2>
                {offer?.availableForUser && pkg.bonusQuinielasOferta > 0 && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
                    <Sparkles className="h-3 w-3 mr-1" />
                    +{pkg.bonusQuinielasOferta} GRATIS
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {offer?.availableForUser && pkg.bonusQuinielasOferta > 0 ? (
                  <>
                    {pkg.quinielasCount} quinielas + {pkg.bonusQuinielasOferta}{" "}
                    bonus ={" "}
                    <strong className="text-green-600">
                      {pkg.effectiveQuinielas} quinielas
                    </strong>
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
          <p className="text-sm text-muted-foreground">
            Sube la foto del comprobante y el sistema extrae los datos automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              Reporte enviado. El administrador lo revisara pronto y se crearan
              tus quinielas automaticamente al aprobar.
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Receipt upload */}
          <div className="mb-5 space-y-2">
            <Label>Comprobante de pago</Label>
            {!proofUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed border-input hover:border-primary/50 cursor-pointer transition-colors bg-muted/20">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  disabled={uploading || ocrLoading}
                />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {uploading ? "Subiendo..." : "Haz clic o arrastra la imagen"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o WEBP &middot; max 6 MB
                </p>
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofUrl}
                    alt="Comprobante"
                    className="w-full max-h-80 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProofUrl(null);
                      setProofFilename(null);
                      setOcrData(null);
                      setOcrError(null);
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    aria-label="Quitar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {ocrLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Leyendo comprobante con IA...
                  </div>
                )}

                {ocrError && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                    {ocrError}
                  </div>
                )}

                {ocrData && !ocrLoading && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <Check className="h-4 w-4" />
                      Datos extraidos (verifica y corrige si es necesario)
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-2">
                      {ocrData.method && (
                        <><span className="text-muted-foreground">Metodo:</span><span>{ocrData.method}</span></>
                      )}
                      {ocrData.reference && (
                        <><span className="text-muted-foreground">Ref:</span><span className="font-mono">{ocrData.reference}</span></>
                      )}
                      {ocrData.amountBs != null && (
                        <><span className="text-muted-foreground">Monto Bs:</span><span>{ocrData.amountBs.toLocaleString("es-VE")}</span></>
                      )}
                      {ocrData.amountUsd != null && (
                        <><span className="text-muted-foreground">Monto USD:</span><span>${ocrData.amountUsd}</span></>
                      )}
                      {ocrData.date && (
                        <><span className="text-muted-foreground">Fecha:</span><span>{ocrData.date}</span></>
                      )}
                      {ocrData.destinationPhone && (
                        <><span className="text-muted-foreground">Tel destino:</span><span className="font-mono">{ocrData.destinationPhone}</span></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
                          Bonus bienvenida
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
