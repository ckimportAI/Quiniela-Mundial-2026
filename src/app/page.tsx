"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOURNAMENT_START_DATE } from "@/lib/constants";
import { Trophy, Target, Star, Users, BarChart3, Zap } from "lucide-react";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown-box rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center min-w-[70px] sm:min-w-[90px]">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const countdown = useCountdown(TOURNAMENT_START_DATE);
  const [stats, setStats] = useState({ users: 0, quinielas: 0, predictions: 0 });
  const [redirecting, setRedirecting] = useState(false);

  // Fetch stats (must be before any early return)
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  // Logged-in users: check nickname then redirect
  useEffect(() => {
    if (status === "authenticated" && !redirecting) {
      setRedirecting(true);
      if (!session?.user?.nickname) {
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/predicciones";
      }
    }
  }, [status, session, redirecting]);

  // Show loading only while actively redirecting an authenticated user
  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse-glow">⚽</div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Target,
      title: "Predice",
      description: "Ingresa tus predicciones para cada partido del Mundial",
      detail: "Resultado exacto: 5 pts | Ganador: 3 pts | Parcial: 1 pt",
    },
    {
      icon: Trophy,
      title: "Compite",
      description: "Sube en la tabla de posiciones con cada acierto",
      detail: "Usa tus 2 comodines para duplicar puntos en partidos clave",
    },
    {
      icon: Star,
      title: "Gana",
      description: "Acumula puntos extra prediciendo campeon y goleador",
      detail: "Campeon: 20 pts | Subcampeon: 10 pts | Goleador: 5 pts",
    },
  ];

  const statItems = [
    { icon: Users, value: stats.users, label: "Participantes" },
    { icon: Zap, value: stats.quinielas, label: "Quinielas" },
    { icon: BarChart3, value: stats.predictions, label: "Predicciones" },
  ];

  return (
    <div className="flex flex-col items-center -mx-4 -mt-6">
      {/* Hero Section - full bleed via negative margin from container */}
      <section className="gradient-hero w-full px-4 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="animate-pulse-glow text-5xl sm:text-6xl mb-6">
          ⚽
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Quiniela Mundial
          <span className="block text-yellow-300">2026</span>
        </h1>

        <p className="text-base sm:text-lg text-white/80 max-w-2xl mt-4 px-4">
          Predice los resultados del Mundial FIFA 2026 y compite contra tus
          amigos. 48 equipos, 104 partidos, un solo campeon.
        </p>

        <div className="flex gap-3 sm:gap-4 mt-8">
          <Button
            asChild
            size="lg"
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-bold text-base px-8"
          >
            <Link href="/login">Participar</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 font-bold text-base px-8 backdrop-blur-sm"
          >
            <Link href="/tabla">Ver Leaderboard</Link>
          </Button>
        </div>

        {/* Countdown */}
        <div className="mt-12">
          <p className="text-sm text-white/60 uppercase tracking-widest mb-4">
            Faltan para el inicio
          </p>
          <div className="flex gap-3 sm:gap-4">
            <CountdownUnit value={countdown.days} label="Dias" />
            <CountdownUnit value={countdown.hours} label="Horas" />
            <CountdownUnit value={countdown.minutes} label="Min" />
            <CountdownUnit value={countdown.seconds} label="Seg" />
          </div>
        </div>

        {/* Host countries */}
        <div className="mt-10 flex items-center gap-2 text-white/60 text-sm font-medium">
          <span className="bg-white/15 rounded px-2 py-0.5">USA</span>
          <span className="text-white/30">|</span>
          <span className="bg-white/15 rounded px-2 py-0.5">MEX</span>
          <span className="text-white/30">|</span>
          <span className="bg-white/15 rounded px-2 py-0.5">CAN</span>
          <span className="ml-2 text-white/40">FIFA World Cup 2026</span>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full max-w-4xl px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="stat-card rounded-xl p-4 sm:p-6 text-center"
            >
              <item.icon className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-teal-600 mb-2" />
              <div className="text-2xl sm:text-3xl font-bold">{item.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-4xl px-4 mt-12 mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Como funciona
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="feature-card">
              <CardHeader>
                <feature.icon className="h-8 w-8 mb-2 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
