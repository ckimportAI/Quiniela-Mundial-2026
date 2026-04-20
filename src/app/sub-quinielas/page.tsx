"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubQuinielaCard } from "@/components/sub-quiniela/sub-quiniela-card";
import { CreateSubQuinielaDialog } from "@/components/sub-quiniela/create-sub-quiniela-dialog";
import { JoinSubQuinielaDialog } from "@/components/sub-quiniela/join-sub-quiniela-dialog";

interface QuinielaOption {
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Membership = any;

export default function SubQuinielasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [quinielas, setQuinielas] = useState<QuinielaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, qRes] = await Promise.all([
        fetch("/api/sub-quinielas"),
        fetch("/api/quinielas"),
      ]);
      if (subRes.ok) {
        const data = await subRes.json();
        setMemberships(data.memberships);
      }
      if (qRes.ok) {
        const data = await qRes.json();
        setQuinielas(
          data.quinielas.map((q: { id: string; name: string }) => ({
            id: q.id,
            name: q.name,
          }))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasQuinielas = quinielas.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis Grupos</h1>
          <p className="text-sm text-muted-foreground">
            Compite con tus amigos en grupos privados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowJoin(true)}
            variant="outline"
            disabled={!hasQuinielas}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Unirse
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            disabled={!hasQuinielas}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear grupo
          </Button>
        </div>
      </div>

      {!hasQuinielas && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Necesitas al menos una quiniela para crear o unirte a un grupo.
          </p>
          <Button onClick={() => router.push("/predicciones")}>
            Crear mi primera quiniela
          </Button>
        </div>
      )}

      {hasQuinielas && memberships.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No estas en ningun grupo aun. Crea uno o unete con un codigo de invitacion.
          </p>
        </div>
      )}

      {memberships.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m: Membership) => (
            <SubQuinielaCard key={m.id} membership={m} />
          ))}
        </div>
      )}

      <CreateSubQuinielaDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={fetchData}
        quinielas={quinielas}
      />

      <JoinSubQuinielaDialog
        open={showJoin}
        onOpenChange={setShowJoin}
        onJoined={fetchData}
        quinielas={quinielas}
      />
    </div>
  );
}
