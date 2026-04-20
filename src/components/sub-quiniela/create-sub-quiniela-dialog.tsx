"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuinielaOption {
  id: string;
  name: string;
}

interface CreateSubQuinielaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  quinielas: QuinielaOption[];
}

export function CreateSubQuinielaDialog({
  open,
  onOpenChange,
  onCreated,
  quinielas,
}: CreateSubQuinielaDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quinielaId, setQuinielaId] = useState(quinielas[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !quinielaId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sub-quinielas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          quinielaId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al crear grupo");
        return;
      }

      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear grupo privado</DialogTitle>
          <DialogDescription>
            Crea un grupo para competir con tus amigos. Es gratis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nombre del grupo</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Amigos FC"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-desc">Descripcion (opcional)</Label>
            <Input
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Grupo del trabajo"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-quiniela">Quiniela a usar en este grupo</Label>
            <select
              id="group-quiniela"
              value={quinielaId}
              onChange={(e) => setQuinielaId(e.target.value)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !quinielaId}
          >
            {loading ? "Creando..." : "Crear grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
