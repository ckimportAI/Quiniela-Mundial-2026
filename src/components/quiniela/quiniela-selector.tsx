"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateQuinielaDialog } from "./create-quiniela-dialog";

interface QuinielaData {
  id: string;
  name: string;
  score: {
    totalPoints: number;
    rank: number | null;
  } | null;
  _count?: {
    predictions: number;
    tournamentPredictions: number;
  };
}

interface QuinielaSelectorProps {
  selectedId: string | null;
  onSelect: (quinielaId: string) => void;
}

export function QuinielaSelector({
  selectedId,
  onSelect,
}: QuinielaSelectorProps) {
  const router = useRouter();
  const [quinielas, setQuinielas] = useState<QuinielaData[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchQuinielas = useCallback(async () => {
    try {
      const res = await fetch("/api/quinielas");
      if (res.ok) {
        const data = await res.json();
        setQuinielas(data.quinielas);
        setCredits(data.credits);

        // Auto-select first quiniela if none selected
        if (!selectedId && data.quinielas.length > 0) {
          onSelect(data.quinielas[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId, onSelect]);

  useEffect(() => {
    fetchQuinielas();
  }, [fetchQuinielas]);

  const handleCreate = async () => {
    const res = await fetch("/api/quinielas", {
      method: "POST",
    });

    if (res.ok) {
      const newQuiniela: QuinielaData = await res.json();
      setQuinielas((prev) => [...prev, newQuiniela]);
      setCredits((prev) => prev - 1);
      onSelect(newQuiniela.id);
      setShowCreate(false);
    } else {
      const err = await res.json();
      if (res.status === 402) {
        // No credits - redirect to recargas
        alert("No tienes creditos. Redirigiendo a la pagina de recargas...");
        router.push("/paquetes");
      } else {
        alert(err.error ?? "Error al crear quiniela");
      }
    }
  };

  if (loading) {
    return (
      <div className="h-10 w-64 rounded-md border animate-pulse bg-muted" />
    );
  }

  // No quinielas - show creation CTA
  if (quinielas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-muted-foreground mb-1">
          Crea tu primera quiniela para comenzar a predecir.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Creditos disponibles: <span className="font-semibold">{credits}</span>
        </p>
        {credits > 0 ? (
          <>
            <Button onClick={() => setShowCreate(true)}>
              Crear mi primera quiniela (1 credito)
            </Button>
            <CreateQuinielaDialog
              open={showCreate}
              onOpenChange={setShowCreate}
              onConfirm={handleCreate}
              credits={credits}
            />
          </>
        ) : (
          <Button onClick={() => router.push("/paquetes")}>
            Recargar creditos
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">
        Quiniela:
      </span>
      <div className="flex gap-2 flex-wrap">
        {quinielas.map((q) => (
          <button
            key={q.id}
            onClick={() => onSelect(q.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              q.id === selectedId
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {q.name}
            {q.score && (
              <span className="ml-1.5 text-xs opacity-75">
                ({q.score.totalPoints} pts)
              </span>
            )}
          </button>
        ))}
      </div>
      {credits > 0 ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          + Nueva ({credits} creditos)
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/paquetes")}
        >
          Recargar creditos
        </Button>
      )}
      <CreateQuinielaDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onConfirm={handleCreate}
        credits={credits}
      />
    </div>
  );
}
