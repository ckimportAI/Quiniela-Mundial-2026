import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLigaBySlug } from "@/lib/liga-context";
import LigaSignupForm from "./signup-form";

export const dynamic = "force-dynamic";

export default async function LigaSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const liga = await getLigaBySlug(slug);
  if (!liga || !liga.active) return notFound();

  return (
    <div className="max-w-md mx-auto py-8 space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Crear cuenta en
        </p>
        <h1 className="text-2xl font-bold">{liga.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tus datos</CardTitle>
        </CardHeader>
        <CardContent>
          <LigaSignupForm ligaSlug={liga.slug} ligaName={liga.name} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary underline">
          Iniciar sesion
        </Link>
      </p>
    </div>
  );
}
