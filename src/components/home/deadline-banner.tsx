"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Clock, AlertTriangle, Trophy } from "lucide-react";
import {
  OFERTA_BIENVENIDA_END,
  FIN_COMPRA_PAQUETES,
  PRIMER_PARTIDO,
  isOfertaBienvenidaActive,
  puedeComprarPaquete,
} from "@/lib/constants";

type Phase = "offer" | "last-days" | "closing-day" | "tournament" | "closed";

function getPhase(now: Date): { phase: Phase; target: Date; fresh: boolean } {
  if (isOfertaBienvenidaActive(now)) {
    return { phase: "offer", target: OFERTA_BIENVENIDA_END, fresh: true };
  }
  if (puedeComprarPaquete(now)) {
    // Last day: within 24h of deadline
    const diffMs = FIN_COMPRA_PAQUETES.getTime() - now.getTime();
    if (diffMs <= 24 * 60 * 60 * 1000) {
      return { phase: "closing-day", target: FIN_COMPRA_PAQUETES, fresh: true };
    }
    return { phase: "last-days", target: FIN_COMPRA_PAQUETES, fresh: true };
  }
  if (now < PRIMER_PARTIDO) {
    return { phase: "tournament", target: PRIMER_PARTIDO, fresh: false };
  }
  return { phase: "closed", target: PRIMER_PARTIDO, fresh: false };
}

function formatDiff(target: Date, now: Date) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function DeadlineBanner() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { phase, target } = getPhase(now);
  const diff = formatDiff(target, now);

  // Don't render a duplicate banner for offer if it's shown elsewhere
  if (phase === "offer") return null;

  if (phase === "last-days") {
    return (
      <Link
        href="/paquetes"
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 p-4 text-center text-white shadow hover:shadow-lg transition-shadow block"
      >
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Clock className="h-5 w-5" />
          <span className="font-bold">ULTIMOS DIAS</span>
          <span className="text-sm">
            Compra tus quinielas antes del 11 jun 5pm
          </span>
          <span className="text-sm font-mono bg-white/20 rounded px-2 py-0.5">
            {diff.days}d {diff.hours}h {diff.minutes}m
          </span>
        </div>
      </Link>
    );
  }

  if (phase === "closing-day") {
    return (
      <Link
        href="/paquetes"
        className="w-full rounded-xl bg-gradient-to-r from-red-500 to-pink-600 p-4 text-center text-white shadow hover:shadow-lg transition-shadow block animate-pulse"
      >
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-bold">HOY CIERRA</span>
          <span className="text-sm">
            Ultimas horas para comprar quinielas
          </span>
          <span className="text-sm font-mono bg-white/20 rounded px-2 py-0.5">
            {diff.hours}h {diff.minutes}m {diff.seconds}s
          </span>
        </div>
      </Link>
    );
  }

  if (phase === "tournament") {
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-center text-white shadow">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Trophy className="h-5 w-5" />
          <span className="font-bold">MUNDIAL EN MARCHA</span>
          <span className="text-sm">
            Proximo partido en {diff.days}d {diff.hours}h {diff.minutes}m
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export function OfferBanner() {
  const [active, setActive] = useState(false);
  const [endsAt, setEndsAt] = useState<Date | null>(null);

  useEffect(() => {
    setActive(isOfertaBienvenidaActive());
    setEndsAt(OFERTA_BIENVENIDA_END);
  }, []);

  if (!active || !endsAt) return null;

  const endStr = endsAt.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
  });

  return (
    <Link
      href="/paquetes"
      className="w-full rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-4 text-center text-white shadow hover:shadow-lg transition-shadow block"
    >
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Gift className="h-5 w-5" />
        <span className="font-bold">OFERTA DE BIENVENIDA</span>
        <span className="hidden sm:inline">-</span>
        <span className="text-sm">
          Quinielas extra GRATIS hasta el {endStr}
        </span>
      </div>
    </Link>
  );
}
