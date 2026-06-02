"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Wallet,
  Settings,
  Loader2,
  Check,
  X,
  Trash2,
} from "lucide-react";

interface LigaData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceUsd: string;
  quinielasPerPurchase: number;
  pagoMovilPhone: string | null;
  pagoMovilCedula: string | null;
  pagoMovilBank: string | null;
  zelleEmail: string | null;
  zelleName: string | null;
  paymentNotes: string | null;
  prizesText: string | null;
  active: boolean;
}

interface Stats {
  members: number;
  quinielas: number;
  pendingPayments: number;
  approvedTotalUsd: number;
}

interface Member {
  id: string;
  email: string;
  nickname: string | null;
  name: string | null;
  createdAt: string;
  _count: { quinielas: number; paymentReports: number };
}

interface Payment {
  id: string;
  amount: string;
  amountBs: string | null;
  method: string;
  reference: string;
  notes: string | null;
  proofUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  credits: number;
  createdAt: string;
  user: {
    email: string;
    nickname: string | null;
    name: string | null;
    phone: string | null;
    cedula: string | null;
  };
}

type Tab = "miembros" | "pagos" | "config";

export default function LigaAdminClient() {
  const [tab, setTab] = useState<Tab>("pagos");
  const [liga, setLiga] = useState<LigaData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadOverview = useCallback(async () => {
    const r = await fetch("/api/liga-admin");
    if (r.ok) {
      const d = await r.json();
      setLiga(d.liga);
      setStats(d.stats);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Miembros</p>
              <p className="text-2xl font-bold">{stats.members}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Quinielas</p>
              <p className="text-2xl font-bold">{stats.quinielas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Pagos pendientes</p>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Recaudado USD</p>
              <p className="text-2xl font-bold">
                ${stats.approvedTotalUsd.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex border-b">
        <TabBtn active={tab === "pagos"} onClick={() => setTab("pagos")}>
          <Wallet className="h-4 w-4 mr-1.5" /> Pagos
        </TabBtn>
        <TabBtn active={tab === "miembros"} onClick={() => setTab("miembros")}>
          <Users className="h-4 w-4 mr-1.5" /> Miembros
        </TabBtn>
        <TabBtn active={tab === "config"} onClick={() => setTab("config")}>
          <Settings className="h-4 w-4 mr-1.5" /> Config
        </TabBtn>
      </div>

      {tab === "pagos" && <PaymentsTab onChange={loadOverview} />}
      {tab === "miembros" && <MembersTab onChange={loadOverview} />}
      {tab === "config" && liga && (
        <ConfigTab liga={liga} onSaved={loadOverview} />
      )}
    </div>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ===========================
// PAYMENTS TAB
// ===========================
function PaymentsTab({ onChange }: { onChange: () => void }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/liga-admin/payments");
    if (r.ok) {
      const d = await r.json();
      setPayments(d.payments);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    const body: { status: string; rejectionNote?: string } = { status };
    if (status === "REJECTED") {
      const reason = window.prompt("Motivo del rechazo (opcional)") ?? "";
      if (reason) body.rejectionNote = reason;
    }
    const r = await fetch(`/api/liga-admin/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (r.ok) {
      load();
      onChange();
    }
  };

  if (!payments) return <Loading />;
  if (payments.length === 0)
    return <Empty title="No hay pagos" hint="Los pagos de tus miembros apareceran aqui." />;

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="font-semibold">
                  {p.user.nickname ?? p.user.name ?? p.user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.user.email}
                  {p.user.phone && ` · ${p.user.phone}`}
                  {p.user.cedula && ` · ${p.user.cedula}`}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm bg-muted/40 rounded p-3">
              <div>
                <p className="text-xs text-muted-foreground">Monto USD</p>
                <p className="font-semibold">${p.amount}</p>
                {p.amountBs && (
                  <p className="text-xs">Bs. {p.amountBs}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {p.credits} quiniela{p.credits > 1 ? "s" : ""} a crear
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Metodo</p>
                <p className="font-semibold">{p.method}</p>
                <p className="text-xs">Ref: {p.reference}</p>
              </div>
            </div>

            {p.notes && (
              <p className="text-xs text-muted-foreground italic">
                Nota: {p.notes}
              </p>
            )}
            {p.proofUrl && (
              <a
                href={p.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                Ver comprobante
              </a>
            )}
            {p.rejectionNote && (
              <p className="text-xs text-red-700">
                Rechazo: {p.rejectionNote}
              </p>
            )}

            {p.status === "PENDING" && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => review(p.id, "APPROVED")}
                  disabled={busyId === p.id}
                >
                  <Check className="h-4 w-4 mr-1" /> Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => review(p.id, "REJECTED")}
                  disabled={busyId === p.id}
                >
                  <X className="h-4 w-4 mr-1" /> Rechazar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===========================
// MEMBERS TAB
// ===========================
function MembersTab({ onChange }: { onChange: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/liga-admin/members");
    if (r.ok) {
      const d = await r.json();
      setMembers(d.members);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const expel = async (id: string) => {
    if (!window.confirm("Expulsar este miembro? Sus quinielas se mantienen pero saldra de la liga.")) return;
    setBusyId(id);
    const r = await fetch(`/api/liga-admin/members/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (r.ok) {
      load();
      onChange();
    }
  };

  if (!members) return <Loading />;
  if (members.length === 0)
    return <Empty title="Aun no hay miembros" hint="Comparte el link de tu liga para que se inscriban." />;

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{m.nickname ?? m.name ?? m.email}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {m._count.quinielas} quiniela{m._count.quinielas !== 1 ? "s" : ""} · {m._count.paymentReports} pago{m._count.paymentReports !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => expel(m.id)}
              disabled={busyId === m.id}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Expulsar
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===========================
// CONFIG TAB
// ===========================
function ConfigTab({
  liga,
  onSaved,
}: {
  liga: LigaData;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LigaData>(liga);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const set = <K extends keyof LigaData>(k: K, v: LigaData[K]) =>
    setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/liga-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description ?? "",
        priceUsd: Number(form.priceUsd),
        quinielasPerPurchase: form.quinielasPerPurchase,
        pagoMovilPhone: form.pagoMovilPhone ?? "",
        pagoMovilCedula: form.pagoMovilCedula ?? "",
        pagoMovilBank: form.pagoMovilBank ?? "",
        zelleEmail: form.zelleEmail ?? "",
        zelleName: form.zelleName ?? "",
        paymentNotes: form.paymentNotes ?? "",
        prizesText: form.prizesText ?? "",
      }),
    });
    setSaving(false);
    if (r.ok) {
      setSavedAt(Date.now());
      onSaved();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Descripcion">
            <Input
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precio</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Precio USD">
            <Input
              type="number"
              step="0.5"
              min="1"
              value={String(form.priceUsd)}
              onChange={(e) => set("priceUsd", e.target.value as unknown as string)}
            />
          </Field>
          <Field label="Quinielas por compra">
            <Input
              type="number"
              min="1"
              max="10"
              value={form.quinielasPerPurchase}
              onChange={(e) =>
                set("quinielasPerPurchase", Number(e.target.value))
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pago Movil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Telefono">
            <Input
              value={form.pagoMovilPhone ?? ""}
              onChange={(e) => set("pagoMovilPhone", e.target.value)}
              placeholder="04141234567"
            />
          </Field>
          <Field label="Cedula">
            <Input
              value={form.pagoMovilCedula ?? ""}
              onChange={(e) => set("pagoMovilCedula", e.target.value)}
              placeholder="V-12345678"
            />
          </Field>
          <Field label="Banco">
            <Input
              value={form.pagoMovilBank ?? ""}
              onChange={(e) => set("pagoMovilBank", e.target.value)}
              placeholder="Banesco / Mercantil / etc"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zelle (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Email Zelle">
            <Input
              type="email"
              value={form.zelleEmail ?? ""}
              onChange={(e) => set("zelleEmail", e.target.value)}
            />
          </Field>
          <Field label="Nombre titular">
            <Input
              value={form.zelleName ?? ""}
              onChange={(e) => set("zelleName", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.paymentNotes ?? ""}
            onChange={(e) => set("paymentNotes", e.target.value)}
            placeholder="Instrucciones adicionales para tus miembros..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Premios (texto libre)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={form.prizesText ?? ""}
            onChange={(e) => set("prizesText", e.target.value)}
            placeholder="1er Lugar: $200&#10;2do Lugar: $100&#10;3er Lugar: $50"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Este texto aparece en la pagina publica de la liga.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
        {savedAt && (
          <span className="text-xs text-green-700">Guardado ✓</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="h-32 flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="font-medium">{title}</p>
      <p className="text-xs mt-1">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        Aprobado
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        Rechazado
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
      Pendiente
    </Badge>
  );
}
