import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Quiniela Mundial 2026",
};

export default async function AdminPage() {
  // Count pending payments for badge
  const pendingPayments = await prisma.paymentReport.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Panel de Administracion
        </h1>
        <p className="text-muted-foreground">
          Gestiona pagos, resultados y configuracion del torneo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/pagos">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Gestion de Pagos
                {pendingPayments > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                    {pendingPayments}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Revisa y aprueba los reportes de pago de los participantes para
                acreditar creditos.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/resultados">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Cargar Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ingresa los resultados de los partidos finalizados. Los puntos
                se calculan automaticamente.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">Resultados de Torneo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define campeon, subcampeon, tercer lugar y goleador.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
