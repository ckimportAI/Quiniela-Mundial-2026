"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CreateQuinielaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  credits: number;
}

export function CreateQuinielaDialog({
  open,
  onOpenChange,
  onConfirm,
  credits,
}: CreateQuinielaDialogProps) {
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-1">Nueva Quiniela</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Se creara una nueva quiniela automaticamente con tu pseudonimo.
          Esto consume <strong>1 credito</strong>.
        </p>

        <div className="rounded-lg bg-muted p-3 mb-4 text-sm">
          <p>
            Creditos disponibles:{" "}
            <span className="font-semibold">{credits}</span>
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Despues de crear: {credits - 1} credito{credits - 1 !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || credits < 1}
          >
            {saving ? "Creando..." : "Crear quiniela (1 credito)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
