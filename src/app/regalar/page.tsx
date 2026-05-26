"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Minus, Plus, ArrowRight } from "lucide-react";

const UNIT_PRICE_USD = 10;
const MAX_QTY = 10;

export default function RegalarPage() {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState<{ eur: number } | null>(null);
  const [purchaseAllowed, setPurchaseAllowed] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRate({ eur: d.eur }))
      .catch(() => {});
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => setPurchaseAllowed(d.purchase?.allowed ?? true))
      .catch(() => {});
  }, []);

  const totalUsd = qty * UNIT_PRICE_USD;
  const totalBs = rate ? totalUsd * rate.eur : null;

  const handleContinue = () => {
    router.push(`/recargas?gift=1&qty=${qty}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white mb-3">
          <Gift className="h-8 w-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Regala una Quiniela
        </h1>
        <p className="text-muted-foreground mt-2">
          Compra codigos de regalo para tus panas. Tu pagas, ellos juegan.
        </p>
      </div>

      {!purchaseAllowed && (
        <div className="rounded-xl bg-red-100 border border-red-300 p-4 text-center text-red-800">
          <h2 className="font-bold">Compras cerradas</h2>
          <p className="text-sm">
            El periodo de compra ha finalizado. Ya no se pueden regalar quinielas.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1.</strong> Elige cuantas quinielas regalar (1 a {MAX_QTY}).
          </p>
          <p>
            <strong>2.</strong> Pagas el total ($10 USD por cada quiniela).
          </p>
          <p>
            <strong>3.</strong> Cuando el admin apruebe el pago, recibiras{" "}
            <strong>N codigos unicos</strong> en tu perfil.
          </p>
          <p>
            <strong>4.</strong> Compartes cada codigo con la persona que quieras.
            Cada persona se registra y canjea su codigo: el sistema le crea una
            quiniela vacia automaticamente para que la llene.
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            Los regalos <strong>no incluyen</strong> el bono 2x1 de bienvenida.
            Los codigos expiran el <strong>11 de junio a las 5:00 pm</strong>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary border-2">
        <CardHeader>
          <CardTitle className="text-lg">Cuantas quinielas regalas?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Disminuir"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-6xl font-extrabold tabular-nums w-24 text-center">
              {qty}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
              disabled={qty >= MAX_QTY}
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Maximo {MAX_QTY} por compra
          </p>

          <div className="rounded-lg bg-primary/5 border-2 border-primary p-5 text-center space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total a pagar
            </p>
            <p className="text-4xl font-extrabold text-primary">
              ${totalUsd}
              <span className="text-base font-normal text-muted-foreground ml-1">
                USD
              </span>
            </p>
            {totalBs && (
              <p className="text-sm font-semibold tabular-nums">
                ~ Bs.{" "}
                {totalBs.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (tasa Euro BCV)
                </span>
              </p>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={!purchaseAllowed}
          >
            Continuar al pago
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/paquetes" className="underline">
              O compra un paquete para ti
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
