import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Referrals | Admin",
};

interface ReferralRow {
  code: string;
  totalUsers: number;
  paidUsers: number;
  totalUsd: number;
  paidPct: number;
}

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Aggregate users by referralCode (only non-null)
  const rows = await prisma.$queryRaw<
    Array<{ code: string; total: bigint; paid: bigint; total_usd: number | null }>
  >`
    SELECT
      u."referralCode" AS code,
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM payment_reports p
          WHERE p."userId" = u.id AND p.status = 'APPROVED'
        )
      )::bigint AS paid,
      COALESCE(
        (
          SELECT SUM(p.amount)
          FROM payment_reports p
          JOIN users u2 ON u2.id = p."userId"
          WHERE u2."referralCode" = u."referralCode" AND p.status = 'APPROVED'
        ),
        0
      )::float AS total_usd
    FROM users u
    WHERE u."referralCode" IS NOT NULL AND u.role = 'PARTICIPANT'
    GROUP BY u."referralCode"
    ORDER BY total DESC
  `;

  const referrals: ReferralRow[] = rows.map((r) => ({
    code: r.code,
    totalUsers: Number(r.total),
    paidUsers: Number(r.paid),
    totalUsd: Number(r.total_usd ?? 0),
    paidPct:
      Number(r.total) > 0
        ? Math.round((Number(r.paid) / Number(r.total)) * 100)
        : 0,
  }));

  const overall = referrals.reduce(
    (acc, r) => {
      acc.users += r.totalUsers;
      acc.paid += r.paidUsers;
      acc.usd += r.totalUsd;
      return acc;
    },
    { users: 0, paid: 0, usd: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Codigos de Referido</h1>
        <p className="text-sm text-muted-foreground">
          Atribucion de marketing por <code>?ref=</code> en signup.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Registrados con codigo</p>
            <p className="text-2xl font-bold">{overall.users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pagaron</p>
            <p className="text-2xl font-bold">{overall.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Recaudado USD</p>
            <p className="text-2xl font-bold">${overall.usd.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por codigo</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Aun no hay registros con codigo de referido.
              <br />
              <span className="text-xs">
                Comparte un link tipo{" "}
                <code>quinielapanas.com/register?ref=TUCODIGO</code> y aqui veras las stats.
              </span>
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 text-xs text-muted-foreground border-b pb-2">
                <span>Codigo</span>
                <span className="text-center w-16">Total</span>
                <span className="text-center w-16">Pagaron</span>
                <span className="text-center w-16">% conv.</span>
                <span className="text-right w-20">USD</span>
              </div>
              {referrals.map((r) => (
                <div
                  key={r.code}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center py-2 border-b last:border-b-0"
                >
                  <Badge variant="outline" className="font-mono justify-self-start">
                    {r.code}
                  </Badge>
                  <span className="text-center w-16 font-semibold">{r.totalUsers}</span>
                  <span className="text-center w-16 font-semibold text-green-700">
                    {r.paidUsers}
                  </span>
                  <span className="text-center w-16 text-xs">{r.paidPct}%</span>
                  <span className="text-right w-20 font-bold tabular-nums">
                    ${r.totalUsd.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1.</strong> Comparte un link con <code>?ref=CODIGO</code>:
            por ejemplo <code>https://quinielapanas.com/register?ref=PROMO2026</code>
          </p>
          <p>
            <strong>2.</strong> El campo &quot;Codigo de invitacion&quot; en el
            registro se autocompleta con ese codigo.
          </p>
          <p>
            <strong>3.</strong> Tambien aparece visible en el formulario por si
            alguien lo escribe a mano.
          </p>
          <p>
            <strong>4.</strong> El codigo se guarda en{" "}
            <code>User.referralCode</code> y aparece aqui agregado por codigo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
