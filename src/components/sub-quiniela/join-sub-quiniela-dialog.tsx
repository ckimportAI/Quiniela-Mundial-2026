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

interface JoinSubQuinielaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
  quinielas: QuinielaOption[];
  prefillCode?: string;
}

export function JoinSubQuinielaDialog({
  open,
  onOpenChange,
  onJoined,
  quinielas,
  prefillCode = "",
}: JoinSubQuinielaDialogProps) {
  const [inviteCode, setInviteCode] = useState(prefillCode);
  const [quinielaId, setQuinielaId] = useState(quinielas[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!inviteCode.trim() || !quinielaId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sub-quinielas/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          quinielaId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al unirse");
        return;
      }

      setInviteCode("");
      onOpenChange(false);
      onJoined();
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
          <DialogTitle>Unirse a un grupo</DialogTitle>
          <DialogDescription>
            Ingresa el codigo de invitacion que te compartieron.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Codigo de invitacion</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              maxLength={8}
              className="font-mono tracking-widest text-center text-lg uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-quiniela">Quiniela a usar en este grupo</Label>
            <select
              id="join-quiniela"
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
            disabled={loading || !inviteCode.trim() || !quinielaId}
          >
            {loading ? "Uniendose..." : "Unirse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
