"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function JoinByLinkPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quinielas, setQuinielas] = useState<{ id: string; name: string }[]>([]);
  const [selectedQuiniela, setSelectedQuiniela] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchingQuinielas, setFetchingQuinielas] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/sub-quinielas/unirse/${inviteCode}`);
    }
  }, [status, router, inviteCode]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/quinielas")
        .then((r) => r.json())
        .then((data) => {
          const qs = data.quinielas?.map((q: { id: string; name: string }) => ({
            id: q.id,
            name: q.name,
          })) ?? [];
          setQuinielas(qs);
          if (qs.length > 0) setSelectedQuiniela(qs[0].id);
        })
        .catch(() => {})
        .finally(() => setFetchingQuinielas(false));
    }
  }, [session]);

  const handleJoin = async () => {
    if (!selectedQuiniela) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sub-quinielas/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.toUpperCase(),
          quinielaId: selectedQuiniela,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Ya eres miembro de esta sub-quiniela") {
          // Already a member, redirect to the group
          router.push("/sub-quinielas");
          return;
        }
        setError(data.error ?? "Error al unirse");
        return;
      }

      // Redirect to the sub-quiniela detail
      router.push(`/sub-quinielas/${data.subQuiniela?.id ?? ""}`);
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || fetchingQuinielas) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-40 w-80 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Unirse a un grupo</CardTitle>
          <CardDescription>
            Te han invitado a unirte con el codigo{" "}
            <code className="font-mono font-bold">{inviteCode.toUpperCase()}</code>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {quinielas.length === 0 ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Necesitas al menos una quiniela para unirte.
              </p>
              <Button onClick={() => router.push("/predicciones")}>
                Crear mi primera quiniela
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Quiniela a usar en este grupo</Label>
                <select
                  value={selectedQuiniela}
                  onChange={(e) => setSelectedQuiniela(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {quinielas.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={handleJoin}
                disabled={loading || !selectedQuiniela}
                className="w-full"
              >
                {loading ? "Uniendose..." : "Unirse al grupo"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
