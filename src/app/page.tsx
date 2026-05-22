"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { TOURNAMENT_START_DATE, GUARANTEED_PRIZES } from "@/lib/constants";
import {
  Users,
  BarChart3,
  Zap,
  UserPlus,
  ShoppingCart,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { DeadlineBanner, OfferBanner } from "@/components/home/deadline-banner";
import { PoolCard } from "@/components/home/pool-card";
import { AiPredictionsSection } from "@/components/home/ai-predictions";

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

  const steps = [
    {
      num: 1,
      icon: UserPlus,
      title: "Registrate",
      description:
        "Crea tu cuenta con Google en segundos y completa tus datos.",
    },
    {
      num: 2,
      icon: ShoppingCart,
      title: "Compra tu paquete",
      description:
        "Elige entre Individual, Amigos o Familia. Paga por Pago Movil, Zelle o Binance.",
    },
    {
      num: 3,
      icon: Trophy,
      title: "Predice y gana",
      description:
        "Pronostica los 104 partidos del Mundial y sube en el leaderboard para ganar.",
    },
  ];

  const statItems = [
    { icon: Users, value: stats.users, label: "Participantes" },
    { icon: Zap, value: stats.quinielas, label: "Quinielas" },
    { icon: BarChart3, value: stats.predictions, label: "Predicciones" },
  ];

  const faqs = [
    {
      q: "Cuanto cuesta participar?",
      a: "Un Individual cuesta $5 USD. Tenemos paquetes Amigos ($10 por 3 quinielas) y Familia ($15 por 5 quinielas). En tu PRIMERA compra recibes 2x1 (el doble de quinielas gratis). Pagas en Bs a la tasa Euro BCV del dia.",
    },
    {
      q: "Como se calculan los puntos?",
      a: "Resultado exacto: 5 pts. Ganador correcto: 3 pts. Un marcador acertado: 1 pt. Los puntos se multiplican en eliminatorias (x1.5 a x3 segun la fase). Ademas tienes 2 comodines por quiniela que duplican los puntos del partido elegido.",
    },
    {
      q: "Que son los premios garantizados?",
      a: "Son los montos minimos que recibiran los 3 primeros lugares: $500 / $250 / $150 USD, sin importar cuanto se recaude. Si el pool real (70% del total recaudado) supera estos montos, los ganadores reciben el monto mayor. Los premios se pagan en Bs a la tasa Euro BCV del dia del pago.",
    },
    {
      q: "Como se pagan los premios?",
      a: "El pool se forma con el 70% del total recaudado. Distribucion: 55% primer lugar, 28% segundo, 17% tercero. Los premios se anuncian en USD pero se pagan siempre en Bolivares a la tasa Euro BCV del dia del pago.",
    },
    {
      q: "Hasta cuando puedo comprar?",
      a: "Las compras de paquetes cierran el 11 de junio de 2026 a las 5:00 PM hora Venezuela. Las predicciones se bloquean 5 minutos antes de cada partido.",
    },
    {
      q: "Puedo tener varias quinielas?",
      a: "Si. Cada paquete te da N quinielas independientes, puedes usar estrategias distintas en cada una. Tambien puedes crear grupos privados con amigos.",
    },
    {
      q: "Las AIs participan del pool?",
      a: "No. Las 5 quinielas hechas por AIs (Claude, ChatGPT, Gemini, Grok, DeepSeek) son solo para diversion y marketing. NO compiten por el dinero — los premios son solo para participantes humanos. Apareceran en el leaderboard como referencia pero estan excluidas del calculo de ganadores.",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Contextual banner: welcome offer OR deadline reminder OR tournament */}
      <OfferBanner />
      <DeadlineBanner />

      {/* Pool card (admin-gated) */}
      <PoolCard />

      {/* Guaranteed prize banner */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-1 shadow-lg">
        <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-amber-700" />
            <p className="text-xs uppercase tracking-widest font-bold text-amber-700">
              Premios Garantizados
            </p>
            <Trophy className="h-5 w-5 text-amber-700" />
          </div>
          <p className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600 tabular-nums">
            ${GUARANTEED_PRIZES.first.toLocaleString("en-US")} USD
          </p>
          <p className="text-xs text-amber-800/80">primer lugar</p>

          <div className="mt-3 flex items-center justify-center gap-4 text-sm font-semibold text-amber-800">
            <div>
              <span className="text-base">${GUARANTEED_PRIZES.second}</span>
              <span className="text-xs font-normal text-amber-800/70 ml-1">2&deg;</span>
            </div>
            <span className="text-amber-800/40">|</span>
            <div>
              <span className="text-base">${GUARANTEED_PRIZES.third}</span>
              <span className="text-xs font-normal text-amber-800/70 ml-1">3&deg;</span>
            </div>
          </div>

          <p className="text-xs text-amber-800/70 mt-3">
            Premios minimos garantizados (si el pool real es mayor, recibes el monto mayor)
          </p>
          <p className="text-[10px] text-amber-800/60 mt-1">
            Los premios se pagan en Bs a la tasa Euro BCV del dia
          </p>
        </div>
      </div>

      {/* AI Predictions */}
      <AiPredictionsSection />

      {/* Hero Section */}
      <section className="gradient-hero w-full rounded-2xl px-6 py-12 sm:py-16 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wc-emblem.png"
          alt="FIFA World Cup 2026"
          className="h-32 sm:h-40 w-auto mb-4 drop-shadow-2xl"
        />

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
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
            <Link href="/paquetes">Participar</Link>
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

      {/* Stats Section - hidden when all values are 0 */}
      {(stats.users > 0 || stats.quinielas > 0 || stats.predictions > 0) && (
      <section className="w-full max-w-4xl">
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
      )}

      {/* How it works - 3 steps */}
      <section className="w-full max-w-4xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Como funciona
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          En 3 pasos simples estas compitiendo por el pozo
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.num} className="relative">
              <Card className="h-full">
                <CardContent className="p-5 text-center">
                  <div className="relative mx-auto w-14 h-14 mb-3">
                    <div className="absolute inset-0 rounded-full bg-primary/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-primary/30 -translate-y-1/2" />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Button asChild variant="outline">
            <Link href="/paquetes">Ver paquetes</Link>
          </Button>
        </div>
      </section>

      {/* Scoring preview */}
      <section className="w-full max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 text-center">
              Sistema de Puntuacion
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-2xl font-extrabold text-primary">5</div>
                <div className="text-xs text-muted-foreground">Exacto</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-primary">3</div>
                <div className="text-xs text-muted-foreground">Ganador</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-primary">1</div>
                <div className="text-xs text-muted-foreground">Parcial</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-yellow-500">x2</div>
                <div className="text-xs text-muted-foreground">Comodin</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
              Predicciones de torneo: Campeon 20 pts &middot; Subcampeon 10 pts &middot; Tercero 5 pts &middot; Goleador 10 pts
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="w-full max-w-4xl pb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Preguntas Frecuentes
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-lg border bg-card px-4 py-3 open:shadow-sm"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-sm sm:text-base">
                <span>{faq.q}</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
