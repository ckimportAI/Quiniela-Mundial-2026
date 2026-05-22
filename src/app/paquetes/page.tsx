"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Users, UserIcon, Home, Gift } from "lucide-react";

interface PackageData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceUsd: number;
  quinielasCount: number;
  bonusQuinielasOferta: number;
  effectiveQuinielas: number;
  pricePerQuiniela: number;
  savingsVsIndividual: number;
  comboFreeQuinielas: number;
  badge: string | null;
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

interface PurchaseData {
  allowed: boolean;
  deadline: string;
}

const ICONS: Record<string, React.ElementType> = {
  INDIVIDUAL: UserIcon,
  AMIGOS: Users,
  FAMILIA: Home,
};

export default function PaquetesPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setPackages(data.packages);
        setOffer(data.offer);
        setPurchase(data.purchase);
      })
      .finally(() => setLoading(false));
  }, []);

  const endDateStr = offer
    ? new Date(offer.endsAt).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
      })
    : "";
  const deadlineStr = purchase
    ? new Date(purchase.deadline).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Elige tu paquete
        </h1>
        <p className="text-muted-foreground mt-2">
          Mientras mas quinielas, mas oportunidades de ganar
        </p>
      </div>

      {/* Purchase closed banner */}
      {!purchase?.allowed && (
        <div className="rounded-xl bg-red-100 border border-red-300 p-6 text-center text-red-800">
          <h2 className="text-xl font-bold mb-1">Compras cerradas</h2>
          <p className="text-sm">
            El periodo de compra de paquetes ha finalizado.
          </p>
        </div>
      )}

      {/* Welcome offer banner (active and available for user) */}
      {offer?.availableForUser && (
        <div className="rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-6 text-center text-white shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="h-6 w-6" />
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              OFERTA DE BIENVENIDA
            </h2>
            <Gift className="h-6 w-6" />
          </div>
          <p className="text-base sm:text-lg font-medium">
            Recibe quinielas extra GRATIS en tu primera compra
          </p>
          <p className="text-sm mt-1 opacity-90">
            Valida hasta el {endDateStr} &middot; Solo primera compra
          </p>
        </div>
      )}

      {/* Offer info if user already used it */}
      {offer?.active && offer?.userHasUsedOffer && (
        <div className="rounded-lg bg-muted border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Ya usaste tu bonus de bienvenida. Gracias por ser pionero.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-lg border animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => {
            const Icon = ICONS[pkg.code] ?? UserIcon;
            const highlight = pkg.badge === "MAS POPULAR";
            const bonusApplies =
              offer?.availableForUser && pkg.bonusQuinielasOferta > 0;

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col ${
                  highlight
                    ? "border-primary border-2 shadow-lg"
                    : "border-border"
                }`}
              >
                {pkg.badge && (
                  <Badge
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                      highlight
                        ? "bg-primary"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                    }`}
                  >
                    {pkg.badge}
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <Icon className="mx-auto h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="text-4xl font-extrabold">
                      ${pkg.priceUsd}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        USD
                      </span>
                    </div>
                    {pkg.comboFreeQuinielas > 0 && (
                      <p className="text-sm font-bold text-green-600 mt-1">
                        {`+ ${pkg.comboFreeQuinielas} GRATIS`}
                      </p>
                    )}
                    {bonusApplies && pkg.comboFreeQuinielas === 0 && (
                      <p className="text-sm font-bold text-green-600 mt-1">
                        {`+ ${pkg.bonusQuinielasOferta} GRATIS (2x1)`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      = ${pkg.pricePerQuiniela.toFixed(2)} por quiniela
                    </p>
                    {pkg.savingsVsIndividual > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Ahorras ${pkg.savingsVsIndividual.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-2 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      {bonusApplies ? (
                        <span>
                          <strong>{pkg.quinielasCount} quinielas</strong>
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[11px] font-bold">
                            <Sparkles className="h-3 w-3" />
                            +{pkg.bonusQuinielasOferta} GRATIS
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            Total:{" "}
                            <strong className="text-green-600">
                              {pkg.effectiveQuinielas} quinielas
                            </strong>
                          </span>
                        </span>
                      ) : (
                        <span>
                          <strong>{pkg.quinielasCount} quinielas</strong>
                        </span>
                      )}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      2 comodines por quiniela
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      Acceso a grupos privados
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      Predicciones de torneo
                    </li>
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild={purchase?.allowed}
                    className="w-full"
                    variant={highlight ? "default" : "outline"}
                    size="lg"
                    disabled={!purchase?.allowed}
                  >
                    {purchase?.allowed ? (
                      <Link href={`/recargas?pkg=${pkg.id}`}>Seleccionar</Link>
                    ) : (
                      <span>Compras cerradas</span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deadline info */}
      {purchase?.allowed && (
        <div className="text-center text-sm text-muted-foreground">
          Compras disponibles hasta el <strong>{deadlineStr}</strong>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground mt-4">
        Al comprar aceptas los{" "}
        <Link href="/terminos" className="text-primary underline">
          Terminos y Condiciones
        </Link>
        . El pago se confirma con comprobante; los premios se pagan en Bs.
      </div>
    </div>
  );
}
