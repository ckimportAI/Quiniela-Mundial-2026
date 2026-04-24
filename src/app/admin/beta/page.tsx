"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Gift, AlertTriangle, User as UserIcon, Loader2 } from "lucide-react";

interface SearchUser {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  _count: { quinielas: number };
}

interface TestQuiniela {
  id: string;
  name: string;
  isTest: boolean;
  createdAt: string;
  user: { nickname: string | null; email: string };
}

export default function AdminBetaPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [count, setCount] = useState(1);
  const [granting, setGranting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [testQuinielas, setTestQuinielas] = useState<TestQuiniela[]>([]);

  const [confirmInput, setConfirmInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const loadTestQuinielas = useCallback(async () => {
    const res = await fetch("/api/admin/beta/list");
    if (res.ok) {
      const data = await res.json();
      setTestQuinielas(data.quinielas);
    }
  }, []);

  useEffect(() => {
    loadTestQuinielas();
  }, [loadTestQuinielas]);

  useEffect(() => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleGrant = async () => {
    if (!selected) return;
    setGranting(true);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/beta/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, count }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(
          `Otorgadas ${data.granted} quinielas de prueba a ${selected.nickname ?? selected.email}`
        );
        setSelected(null);
        setQuery("");
        setCount(1);
        loadTestQuinielas();
      } else {
        const e = await res.json();
        alert(e.error ?? "Error al otorgar");
      }
    } finally {
      setGranting(false);
    }
  };

  const handleReset = async () => {
    if (confirmInput !== "BORRAR_DATOS_BETA") return;
    if (
      !confirm(
        "¿Estás seguro de borrar TODOS los datos de prueba? Esta accion es irreversible."
      )
    ) {
      return;
    }
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/admin/beta/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "BORRAR_DATOS_BETA" }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetResult(
          `Eliminadas ${data.deletedQuinielas} quinielas, ${data.deletedPredictions} predicciones, ${data.deletedTournamentPredictions} predicciones de torneo`
        );
        setConfirmInput("");
        loadTestQuinielas();
      } else {
        alert(data.error);
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Beta Testers
        </h1>
        <p className="text-muted-foreground">
          Regala quinielas gratis a usuarios de prueba. Borra los datos cuando termines.
        </p>
      </div>

      {/* Grant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Otorgar quinielas de prueba
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar usuario (email, nickname o nombre)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Escribe al menos 2 caracteres..."
                className="pl-9"
              />
            </div>
          </div>

          {searching && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
            </p>
          )}

          {users.length > 0 && !selected && (
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u)}
                  className="w-full flex items-center justify-between rounded-lg border p-3 hover:border-primary text-left transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {u.nickname ?? u.name ?? "Sin nombre"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.email}
                      {u.phone && ` · ${u.phone}`}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {u._count.quinielas} quiniela{u._count.quinielas !== 1 ? "s" : ""}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Seleccionado
                </p>
                <p className="font-bold">
                  {selected.nickname ?? selected.name ?? "Sin nombre"}
                </p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </div>
                <Button onClick={handleGrant} disabled={granting}>
                  {granting ? "Otorgando..." : `Otorgar ${count} quiniela${count > 1 ? "s" : ""}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List of test quinielas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Quinielas de prueba activas ({testQuinielas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testQuinielas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay quinielas de prueba.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {testQuinielas.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div>
                    <span className="font-mono">{q.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {q.user.nickname ?? q.user.email}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {new Date(q.createdAt).toLocaleDateString("es-VE")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-300 bg-red-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Zona peligrosa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-red-800">
            Borra todas las quinielas de prueba, sus predicciones y scores asociados. Esta accion es irreversible.
          </p>
          <div className="space-y-2">
            <Label className="text-red-800">
              Escribe <code className="font-mono bg-red-100 px-1 rounded">BORRAR_DATOS_BETA</code> para confirmar
            </Label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="BORRAR_DATOS_BETA"
              className="bg-white"
            />
          </div>
          <Button
            variant="destructive"
            disabled={confirmInput !== "BORRAR_DATOS_BETA" || resetting}
            onClick={handleReset}
          >
            {resetting ? "Borrando..." : "Borrar datos de prueba"}
          </Button>
          {resetResult && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {resetResult}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
