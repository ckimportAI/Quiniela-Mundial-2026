"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Users, UserIcon, Home } from "lucide-react";

interface PackageData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceUsd: number;
  quinielasCount: number;
  effectiveQuinielas: number;
  pricePerQuiniela: number;
}

interface PromoData {
  active: boolean;
  name: string;
  startsAt: string;
  endsAt: string;
  multiplier: number;
}

const ICONS: Record<string, React.ElementType> = {
  INDIVIDUAL: UserIcon,
  AMIGOS: Users,
  FAMILIA: Home,
};

export default function PaquetesPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setPackages(data.packages);
        setPromo(data.promo);
      })
      .finally(() => setLoading(false));
  }, []);

  const promoEndDate = promo
    ? new Date(promo.endsAt).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
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

      {/* Promo banner */}
      {promo?.active && (
        <div className="rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-6 text-center text-white shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" />
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              OFERTA 2x1 DE LANZAMIENTO
            </h2>
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-base sm:text-lg font-medium">
            Recibe <strong>el doble</strong> de quinielas en cualquier paquete
          </p>
          <p className="text-sm mt-1 opacity-90">
            Valida hasta el {promoEndDate}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-lg border animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg, idx) => {
            const Icon = ICONS[pkg.code] ?? UserIcon;
            const highlight = idx === 1; // Middle (Amigos) highlighted as recommended

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col ${
                  highlight
                    ? "border-primary border-2 shadow-lg"
                    : "border-border"
                }`}
              >
                {highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Mas popular
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
                    {promo?.active && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        = ${pkg.pricePerQuiniela.toFixed(2)} por quiniela
                      </p>
                    )}
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-2 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      {promo?.active ? (
                        <span>
                          <span className="line-through text-muted-foreground mr-1">
                            {pkg.quinielasCount} quinielas
                          </span>
                          <strong className="text-green-600">
                            {pkg.effectiveQuinielas} quinielas
                          </strong>{" "}
                          (con 2x1)
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
                    asChild
                    className="w-full"
                    variant={highlight ? "default" : "outline"}
                    size="lg"
                  >
                    <Link href={`/recargas?pkg=${pkg.id}`}>
                      Seleccionar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground mt-8">
        Al comprar aceptas los{" "}
        <Link href="/terminos" className="text-primary underline">
          Terminos y Condiciones
        </Link>
        . El pago se confirma con comprobante; los premios se pagan en Bs.
      </div>
    </div>
  );
}
