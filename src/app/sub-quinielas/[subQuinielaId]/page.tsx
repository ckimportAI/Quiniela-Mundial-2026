"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Trash2, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeDisplay } from "@/components/sub-quiniela/invite-code-display";
import { SubQuinielaLeaderboard } from "@/components/sub-quiniela/sub-quiniela-leaderboard";
import { ManageMembers } from "@/components/sub-quiniela/manage-members";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubQuinielaData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeaderboardEntry = any;
type CurrentMember = {
  id: string;
  role: string;
  quinielaId: string;
};

export default function SubQuinielaDetailPage({
  params,
}: {
  params: Promise<{ subQuinielaId: string }>;
}) {
  const { subQuinielaId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subQuiniela, setSubQuiniela] = useState<SubQuinielaData>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentMember, setCurrentMember] = useState<CurrentMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [quinielas, setQuinielas] = useState<{ id: string; name: string }[]>([]);
  const [changingQuiniela, setChangingQuiniela] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/sub-quinielas/${subQuinielaId}`);
      if (!res.ok) {
        router.push("/sub-quinielas");
        return;
      }
      const data = await res.json();
      setSubQuiniela(data.subQuiniela);
      setLeaderboard(data.leaderboard);
      setCurrentMember(data.currentUserMember);
    } catch {
      router.push("/sub-quinielas");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuinielas = async () => {
    try {
      const res = await fetch("/api/quinielas");
      if (res.ok) {
        const data = await res.json();
        setQuinielas(data.quinielas.map((q: { id: string; name: string }) => ({ id: q.id, name: q.name })));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
      fetchQuinielas();
    }
  }, [session, subQuinielaId]);

  const handleDelete = async () => {
    if (!confirm("Eliminar este grupo? Se eliminara para todos los miembros.")) return;
    const res = await fetch(`/api/sub-quinielas/${subQuinielaId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/sub-quinielas");
    } else {
      const data = await res.json();
      alert(data.error ?? "Error al eliminar");
    }
  };

  const handleLeave = async () => {
    if (!currentMember) return;
    if (!confirm("Abandonar este grupo?")) return;
    const res = await fetch(
      `/api/sub-quinielas/${subQuinielaId}/members/${currentMember.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      router.push("/sub-quinielas");
    } else {
      const data = await res.json();
      alert(data.error ?? "Error al salir");
    }
  };

  const handleChangeQuiniela = async (newQuinielaId: string) => {
    if (!currentMember) return;
    setChangingQuiniela(true);
    try {
      const res = await fetch(
        `/api/sub-quinielas/${subQuinielaId}/members/${currentMember.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quinielaId: newQuinielaId }),
        }
      );
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al cambiar quiniela");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setChangingQuiniela(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!subQuiniela || !currentMember) return null;

  const isAdmin = currentMember.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sub-quinielas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{subQuiniela.name}</h1>
            {subQuiniela.description && (
              <p className="text-sm text-muted-foreground">{subQuiniela.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManage(!showManage)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gestionar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLeave}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          )}
        </div>
      </div>

      {/* Invite Code + Change Quiniela */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Codigo de invitacion</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteCodeDisplay code={subQuiniela.inviteCode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mi quiniela en este grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={currentMember.quinielaId}
              onChange={(e) => handleChangeQuiniela(e.target.value)}
              disabled={changingQuiniela}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {quinielas.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
            {changingQuiniela && (
              <p className="text-xs text-muted-foreground mt-1">Cambiando...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Members (admin only) */}
      {isAdmin && showManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestionar miembros</CardTitle>
          </CardHeader>
          <CardContent>
            <ManageMembers
              members={leaderboard.map((e: LeaderboardEntry) => e.member)}
              subQuinielaId={subQuinielaId}
              onMemberRemoved={fetchData}
            />
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla de posiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <SubQuinielaLeaderboard
            entries={leaderboard}
            currentUserId={session?.user?.id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
