import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift } from "lucide-react";
import RedeemButton from "./redeem-button";

export const dynamic = "force-dynamic";

export default async function RedeemGiftPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().trim();

  const session = await getServerSession(authOptions);

  // Look up gift code (public lookup OK - we expose minimal info)
  const gift = await prisma.giftCode.findUnique({
    where: { code },
    include: {
      purchaser: { select: { nickname: true, name: true } },
      redeemedBy: { select: { nickname: true, name: true } },
    },
  });

  if (!gift) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Codigo no valido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              El codigo <strong>{code}</strong> no existe. Verifica que lo hayas
              escrito correctamente.
            </p>
            <Link href="/" className="text-primary underline">
              Ir al inicio
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const purchaserName =
    gift.purchaser.nickname ?? gift.purchaser.name ?? "Tu amigo";

  // Not logged in: prompt to register/login
  if (!session?.user?.id) {
    const callbackUrl = `/regalo/${code}`;
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <Card className="border-primary border-2">
          <CardHeader className="text-center">
            <div className="mx-auto inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white mb-3">
              <Gift className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Tienes un regalo!</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              De parte de <strong>{purchaserName}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 border p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Codigo
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest">
                {code}
              </p>
            </div>

            <p className="text-sm">
              Para canjear tu regalo necesitas crear una cuenta o iniciar sesion.
              El sistema te creara una <strong>quiniela vacia</strong>{" "}
              automaticamente.
            </p>

            <div className="space-y-2">
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-3 font-semibold hover:bg-primary/90"
              >
                Crear cuenta
              </Link>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="block w-full text-center border border-input rounded-md px-4 py-3 font-medium hover:bg-accent"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Despues de iniciar sesion volveras aqui para canjear tu codigo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already redeemed
  if (gift.redeemedById) {
    const isMine = gift.redeemedById === session.user.id;
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>
              {isMine ? "Ya canjeaste este regalo" : "Codigo ya canjeado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {isMine
                ? "Este codigo ya lo canjeaste antes. Tu quiniela esta lista en tu perfil."
                : "Este codigo ya fue canjeado por otra persona."}
            </p>
            {isMine && (
              <Link href="/predicciones" className="text-primary underline">
                Ir a mis predicciones
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired
  if (gift.expiresAt < new Date()) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Codigo expirado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Este codigo expiro el{" "}
              {gift.expiresAt.toLocaleDateString("es-VE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Contacta a quien te regalo para que solicite un reembolso o un
              nuevo codigo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cannot redeem own gift
  if (gift.purchaserId === session.user.id) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>No puedes canjear tu propio regalo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Este codigo lo compraste tu. Comparte el codigo{" "}
              <strong className="font-mono">{code}</strong> con un amigo para que
              lo canjee.
            </p>
            <Link href="/perfil" className="text-primary underline">
              Ver mis regalos
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready to redeem
  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="border-primary border-2">
        <CardHeader className="text-center">
          <div className="mx-auto inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white mb-3">
            <Gift className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Listo para canjear!</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{purchaserName}</strong> te regalo una quiniela del Mundial
            2026
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 border p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Codigo
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest">
              {code}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 space-y-1">
            <p className="font-medium">Que recibes al canjear:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>Una quiniela vacia lista para que la llenes</li>
              <li>2 comodines para duplicar puntos</li>
              <li>Compites por los premios garantizados $500 / $250 / $150</li>
            </ul>
          </div>

          <RedeemButton code={code} />

          <p className="text-xs text-muted-foreground text-center">
            El codigo expira el{" "}
            {gift.expiresAt.toLocaleDateString("es-VE", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
