import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Quiniela Mundial 2026
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Predice los resultados del Mundial FIFA 2026 y compite contra tus
          amigos. 48 equipos, 104 partidos, un solo campeon.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/login">Participar</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/tabla">Ver Tabla</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 w-full max-w-4xl mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Predice</CardTitle>
            <CardDescription>
              Ingresa tus predicciones para cada partido del Mundial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Resultado exacto: 5 pts | Ganador: 3 pts | Parcial: 1 pt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compite</CardTitle>
            <CardDescription>
              Sube en la tabla de posiciones con cada acierto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Usa tus 2 comodines para duplicar puntos en partidos clave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gana</CardTitle>
            <CardDescription>
              Acumula puntos extra prediciendo campeon y goleador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Campeon: 20 pts | Subcampeon: 10 pts | Goleador: 5 pts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
