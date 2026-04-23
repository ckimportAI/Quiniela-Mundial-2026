"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export function PoolCard() {
  const [show, setShow] = useState(false);
  const [poolUsd, setPoolUsd] = useState(0);
  const [rateEur, setRateEur] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/pool").then((r) => r.json()).catch(() => null),
      fetch("/api/exchange-rate").then((r) => r.json()).catch(() => null),
    ]).then(([pool, rate]) => {
      if (!mounted) return;
      if (pool) {
        setShow(!!pool.showOnHome && pool.poolUsd > 0);
        setPoolUsd(pool.poolUsd);
      }
      if (rate?.eur) setRateEur(rate.eur);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!show) return null;

  const bs = rateEur ? poolUsd * rateEur : null;

  return (
    <Card className="w-full border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-yellow-700">
          <Trophy className="h-5 w-5" />
          <p className="text-xs uppercase tracking-widest font-semibold">
            Pool de premios actual
          </p>
          <Trophy className="h-5 w-5" />
        </div>
        <p className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 tabular-nums">
          ${poolUsd.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          USD
        </p>
        {bs != null && (
          <p className="text-sm text-muted-foreground mt-2">
            {"\u2248 "}Bs.{" "}
            {bs.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Crece con cada quiniela vendida
        </p>
      </CardContent>
    </Card>
  );
}
