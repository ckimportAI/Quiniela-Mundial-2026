import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { SiteConfigPanel } from "@/components/admin/site-config-panel";
import {
  DollarSign,
  Users,
  Ticket,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Wallet,
  Package as PackageIcon,
  FileText,
  ClipboardList,
  Trophy,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Quiniela Mundial 2026",
};

const POOL_PERCENTAGE = 0.7;

function formatUsd(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBs(n: number) {
  return n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function AdminPage() {
  // --- Aggregated metrics ---
  const [
    paymentsByStatus,
    approvedSum,
    approvedBsSum,
    usersCount,
    usersWithNicknameCount,
    quinielasCount,
    quinielasWithPredictionsCount,
    salesByPackage,
    welcomeOfferStats,
    welcomeOfferBonusSum,
    latestRate,
    saldoAgg,
  ] = await Promise.all([
    prisma.paymentReport.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.paymentReport.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.paymentReport.aggregate({
      where: { status: "APPROVED", amountBs: { not: null } },
      _sum: { amountBs: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { NOT: { nickname: null } } }),
    prisma.quiniela.count(),
    prisma.quiniela.count({
      where: { predictions: { some: {} } },
    }),
    prisma.paymentReport.groupBy({
      by: ["packageId"],
      where: { status: "APPROVED" },
      _count: { _all: true },
      _sum: { amount: true, credits: true },
    }),
    prisma.paymentReport.aggregate({
      where: {
        promoApplied: true,
        status: { in: ["PENDING", "APPROVED"] },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ bonus: number }>>`
      SELECT COALESCE(SUM(pkg."bonusQuinielasOferta"), 0)::int AS bonus
      FROM payment_reports pr
      JOIN packages pkg ON pr."packageId" = pkg.id
      WHERE pr."promoApplied" = true AND pr.status IN ('PENDING', 'APPROVED')
    `,
    prisma.exchangeRate.findFirst({ orderBy: { fetchedAt: "desc" } }),
    prisma.saldoFavor.aggregate({
      where: { isUsed: false },
      _sum: { montoUsd: true, montoBs: true },
      _count: { _all: true },
    }),
  ]);

  const saldoPendienteUsd = Number(saldoAgg._sum.montoUsd ?? 0);
  const saldoPendienteBs = Number(saldoAgg._sum.montoBs ?? 0);
  const saldoPendienteCount = saldoAgg._count._all;

  // Load package details for breakdown
  const packagesDetails = await prisma.package.findMany({
    where: { id: { in: salesByPackage.map((s) => s.packageId).filter(Boolean) as string[] } },
  });
  const pkgMap = new Map(packagesDetails.map((p) => [p.id, p]));

  // Counts by status (with defaults)
  const statusMap = new Map(paymentsByStatus.map((s) => [s.status, s._count._all]));
  const pendingCount = statusMap.get("PENDING") ?? 0;
  const approvedCount = statusMap.get("APPROVED") ?? 0;
  const rejectedCount = statusMap.get("REJECTED") ?? 0;

  const totalUsd = Number(approvedSum._sum.amount ?? 0);
  const totalBs = Number(approvedBsSum._sum.amountBs ?? 0);
  const poolUsd = totalUsd * POOL_PERCENTAGE;
  const bonusQuinielasGiven = welcomeOfferBonusSum[0]?.bonus ?? 0;
  const welcomeOfferAppliedCount = welcomeOfferStats._count._all;

  // Approximate value of bonus given (at $12/quiniela reference)
  const bonusValueUsd = bonusQuinielasGiven * 12;

  const eurRate = latestRate ? Number(latestRate.eurRate) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Panel de Administracion
        </h1>
        <p className="text-muted-foreground">
          Metricas en vivo, gestion de pagos y configuracion del sitio.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Recaudado (USD)"
          value={`$${formatUsd(totalUsd)}`}
          subtitle={totalBs > 0 ? `Bs. ${formatBs(totalBs)}` : undefined}
          color="green"
        />
        <KpiCard
          icon={Trophy}
          label="Pool de premios"
          value={`$${formatUsd(poolUsd)}`}
          subtitle={
            eurRate
              ? `≈ Bs. ${formatBs(poolUsd * eurRate)}`
              : undefined
          }
          color="yellow"
        />
        <KpiCard
          icon={Users}
          label="Usuarios"
          value={usersCount.toString()}
          subtitle={`${usersWithNicknameCount} registrados`}
          color="blue"
        />
        <KpiCard
          icon={Ticket}
          label="Quinielas"
          value={quinielasCount.toString()}
          subtitle={`${quinielasWithPredictionsCount} con predicciones`}
          color="teal"
        />
      </div>

      {/* Payment status summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estado de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <StatusStat
              icon={Clock}
              label="Pendientes"
              count={pendingCount}
              color="yellow"
              href="/admin/pagos?status=PENDING"
            />
            <StatusStat
              icon={CheckCircle}
              label="Aprobados"
              count={approvedCount}
              color="green"
              href="/admin/pagos?status=APPROVED"
            />
            <StatusStat
              icon={XCircle}
              label="Rechazados"
              count={rejectedCount}
              color="red"
              href="/admin/pagos?status=REJECTED"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales by package + Welcome offer */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              Ventas por paquete
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesByPackage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay ventas aprobadas.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {salesByPackage.map((s) => {
                  const pkg = s.packageId ? pkgMap.get(s.packageId) : null;
                  const name = pkg?.name ?? "Legacy";
                  const count = s._count._all;
                  const total = Number(s._sum.amount ?? 0);
                  const quinielas = s._sum.credits ?? 0;
                  return (
                    <div
                      key={s.packageId ?? "legacy"}
                      className="flex items-center justify-between gap-2 rounded border p-2"
                    >
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} compra{count > 1 ? "s" : ""} &middot;{" "}
                          {quinielas} quiniela{quinielas !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${formatUsd(total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Oferta de bienvenida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border p-2">
                <p className="text-2xl font-bold">{welcomeOfferAppliedCount}</p>
                <p className="text-xs text-muted-foreground">Aplicadas</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-2xl font-bold">{bonusQuinielasGiven}</p>
                <p className="text-xs text-muted-foreground">Quinielas bonus</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-2xl font-bold text-green-600">
                  ${bonusValueUsd}
                </p>
                <p className="text-xs text-muted-foreground">Valor regalado</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Valor regalado estimado a razon de $12 por quiniela.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saldos a favor */}
      {saldoPendienteCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldos a favor pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border p-2">
                <p className="text-2xl font-bold">{saldoPendienteCount}</p>
                <p className="text-xs text-muted-foreground">Saldos</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-2xl font-bold text-green-600">
                  ${formatUsd(saldoPendienteUsd)}
                </p>
                <p className="text-xs text-muted-foreground">Total USD</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-2xl font-bold">
                  Bs. {formatBs(saldoPendienteBs)}
                </p>
                <p className="text-xs text-muted-foreground">Total Bs</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Excedentes de pagos que quedan a favor de usuarios para usarse en proximas compras.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exchange rate status */}
      {latestRate && eurRate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tasas BCV
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm grid sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Euro BCV</p>
              <p className="text-xl font-bold font-mono">
                {eurRate.toLocaleString("es-VE", { maximumFractionDigits: 4 })}{" "}
                <span className="text-xs text-muted-foreground">Bs/€</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">USD BCV</p>
              <p className="text-xl font-bold font-mono">
                {Number(latestRate.usdRate).toLocaleString("es-VE", { maximumFractionDigits: 4 })}{" "}
                <span className="text-xs text-muted-foreground">Bs/$</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actualizada</p>
              <p className="text-sm">
                {new Date(latestRate.fetchedAt).toLocaleString("es-VE")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Acciones</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/pagos"
            icon={Wallet}
            title="Gestion de Pagos"
            description="Revisa y aprueba reportes."
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <ActionCard
            href="/admin/resultados"
            icon={ClipboardList}
            title="Cargar Resultados"
            description="Ingresa scores de partidos."
          />
          <ActionCard
            href="/tabla"
            icon={FileText}
            title="Ver Leaderboard"
            description="Tabla completa de posiciones."
          />
        </div>
      </div>

      {/* Site config toggle */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuracion
        </h2>
        <SiteConfigPanel />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  color: "green" | "yellow" | "blue" | "teal";
}) {
  const bgMap = {
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal-50 text-teal-700",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`rounded-md p-1.5 ${bgMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
        </div>
        <p className="text-2xl font-extrabold tabular-nums">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusStat({
  icon: Icon,
  label,
  count,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: "yellow" | "green" | "red";
  href: string;
}) {
  const colorMap = {
    yellow: "text-yellow-700",
    green: "text-green-700",
    red: "text-red-700",
  };
  return (
    <Link
      href={href}
      className="rounded border p-3 text-center hover:bg-accent transition-colors"
    >
      <Icon className={`mx-auto h-5 w-5 mb-1 ${colorMap[color]}`} />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
            {badge != null && (
              <Badge variant="destructive" className="ml-auto">
                {badge}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
