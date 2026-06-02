"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ExternalLink } from "lucide-react";

interface LigaRow {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  priceUsd: string;
  quinielasPerPurchase: number;
  createdAt: string;
  owner: { email: string; nickname: string | null; name: string | null };
  _count: { members: number; quinielas: number; paymentReports: number };
}

export default function AdminLigasPage() {
  const [ligas, setLigas] = useState<LigaRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    ownerEmail: "",
    priceUsd: 10,
    quinielasPerPurchase: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/ligas");
    if (r.ok) {
      const d = await r.json();
      setLigas(d.ligas);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await fetch("/api/admin/ligas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json();
      setError(d.error ?? "Error");
      return;
    }
    setCreating(false);
    setForm({ slug: "", name: "", ownerEmail: "", priceUsd: 10, quinielasPerPurchase: 1 });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/admin/ligas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ligas privadas</h1>
          <p className="text-sm text-muted-foreground">
            Grupos aislados con su propio dueno. Tu solo puedes activar/desactivar.
          </p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva liga
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crear liga</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Slug (URL)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="domino-pan-azucar"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Solo letras, numeros y guiones. quinielapanas.com/liga/{form.slug || "tu-slug"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Nombre publico</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Domino Club Pan de Azucar"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email del dueno (debe estar registrado)</Label>
                <Input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  placeholder="cliente@email.com"
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Precio inicial USD</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    value={form.priceUsd}
                    onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Quinielas por compra</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={form.quinielasPerPurchase}
                    onChange={(e) =>
                      setForm({ ...form, quinielasPerPurchase: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Los datos de pago (Pago Movil, Zelle) y premios los configura el dueno desde su panel.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!ligas ? (
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : ligas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay ligas creadas todavia.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ligas.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {l.name}
                      <a
                        href={`/liga/${l.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary"
                        title="Abrir landing publica"
                      >
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">/{l.slug}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dueno:{" "}
                      <strong>
                        {l.owner.nickname ?? l.owner.name ?? l.owner.email}
                      </strong>{" "}
                      ({l.owner.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        l.active
                          ? "bg-green-100 text-green-800 border-green-300"
                          : "bg-gray-200 text-gray-700"
                      }
                    >
                      {l.active ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(l.id, !l.active)}
                    >
                      {l.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center text-xs bg-muted/40 rounded p-2 mt-2">
                  <div>
                    <p className="text-muted-foreground">Miembros</p>
                    <p className="font-bold">{l._count.members}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quinielas</p>
                    <p className="font-bold">{l._count.quinielas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pagos</p>
                    <p className="font-bold">{l._count.paymentReports}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-bold">
                      ${l.priceUsd}/{l.quinielasPerPurchase}q
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
