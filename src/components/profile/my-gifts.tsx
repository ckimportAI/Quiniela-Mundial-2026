"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Gift, Share2 } from "lucide-react";

interface GiftItem {
  id: string;
  code: string;
  redeemed: boolean;
  redeemedAt: string | null;
  redeemedBy: string | null;
  expiresAt: string;
  createdAt: string;
}

function buildMessage(code: string, link: string): string {
  return `Hola! Te regalo una quiniela del Mundial 2026 en QuinielaPanas 🏆⚽

Para canjearla:
1) Entra al link: ${link}
2) Crea tu cuenta (Google o email + contrasena)
3) Aceptas el regalo y el sistema te crea una quiniela vacia automaticamente
4) Llenas tus predicciones de los partidos y compites por los premios garantizados ($500 / $250 / $150 USD)

Tu codigo de regalo: ${code}

El codigo expira el 11 de junio a las 5pm (antes del primer partido). Suerte pana!`;
}

export default function MyGifts() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/gifts")
      .then((r) => r.json())
      .then((data) => setGifts(data.gifts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const copyMessage = (id: string, code: string) => {
    const link = `${origin}/regalo/${code}`;
    const text = buildMessage(code, link);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareNative = async (code: string) => {
    const link = `${origin}/regalo/${code}`;
    const text = buildMessage(code, link);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Te regalo una quiniela del Mundial 2026",
          text,
          url: link,
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Mensaje copiado al portapapeles");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" /> Mis Regalos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (gifts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" /> Mis Regalos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aun no has regalado quinielas.{" "}
            <a href="/regalar" className="text-primary underline font-medium">
              Regala una ahora
            </a>{" "}
            a tus panas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pending = gifts.filter((g) => !g.redeemed);
  const redeemed = gifts.filter((g) => g.redeemed);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" /> Mis Regalos
          </CardTitle>
          <a
            href="/regalar"
            className="text-xs text-primary underline font-medium"
          >
            + Regalar mas
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sin canjear ({pending.length})
            </p>
            {pending.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Codigo
                    </p>
                    <p className="text-xl font-mono font-bold tracking-widest">
                      {g.code}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Expira:{" "}
                      {new Date(g.expiresAt).toLocaleDateString("es-VE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    Pendiente
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyMessage(g.id, g.code)}
                  >
                    {copiedId === g.id ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" /> Copiar mensaje
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => shareNative(g.code)}
                  >
                    <Share2 className="h-3 w-3 mr-1" /> Compartir
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground break-all">
                  Link directo: {origin}/regalo/{g.code}
                </p>
              </div>
            ))}
          </div>
        )}

        {redeemed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canjeados ({redeemed.length})
            </p>
            {redeemed.map((g) => (
              <div
                key={g.id}
                className="rounded-md border bg-muted/30 p-2 text-sm flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-semibold">{g.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {g.redeemedBy && `por @${g.redeemedBy}`}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-300"
                >
                  Canjeado
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
