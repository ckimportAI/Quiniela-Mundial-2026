import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLigaBySlug } from "@/lib/liga-context";
import { prisma } from "@/lib/prisma";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LigaLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const liga = await getLigaBySlug(slug);
  if (!liga || !liga.active) return notFound();

  const memberCount = await prisma.user.count({ where: { ligaId: liga.id } });

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Liga privada
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {liga.name}
        </h1>
        {liga.description && (
          <p className="text-muted-foreground">{liga.description}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{memberCount}</p>
            <p className="text-xs text-muted-foreground">Miembros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">
              ${Number(liga.priceUsd).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">
              por {liga.quinielasPerPurchase}{" "}
              quiniela{liga.quinielasPerPurchase > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold">11 Jun · 5pm</p>
            <p className="text-xs text-muted-foreground">Cierre inscripciones</p>
          </CardContent>
        </Card>
      </div>

      {liga.prizesText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Premios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {liga.prizesText}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary border-2">
        <CardHeader>
          <CardTitle className="text-lg">Como participar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>1.</strong> Crea tu cuenta en esta liga (es exclusiva, solo
            compites con miembros del grupo).
          </p>
          <p>
            <strong>2.</strong> Pagas ${Number(liga.priceUsd).toFixed(2)} USD por{" "}
            {liga.quinielasPerPurchase} quiniela
            {liga.quinielasPerPurchase > 1 ? "s" : ""} a los datos del
            administrador del grupo.
          </p>
          <p>
            <strong>3.</strong> Predices los 104 partidos del Mundial 2026 +
            campeon, subcampeon, tercer lugar y goleador.
          </p>
          <p>
            <strong>4.</strong> Compites en el leaderboard privado del grupo.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Link
              href={`/liga/${liga.slug}/registro`}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-3 font-semibold hover:bg-primary/90"
            >
              Crear cuenta en {liga.name}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent("/predicciones")}`}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-input px-5 py-3 font-medium hover:bg-accent"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Al registrarte en esta liga quedaras asignado exclusivamente a ella.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
