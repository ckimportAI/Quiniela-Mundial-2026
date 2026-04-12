"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Debounced availability check
  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setAvailable(null);
      return;
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setAvailable(null);
      setError("Solo letras, numeros y guion bajo");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const res = await fetch(
        `/api/users/check-nickname?nickname=${encodeURIComponent(value)}`
      );
      const data = await res.json();
      setAvailable(data.available);
      if (!data.available) {
        setError("Ese pseudonimo ya esta en uso");
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(nickname);
    }, 400);
    return () => clearTimeout(timer);
  }, [nickname, checkAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!available || nickname.length < 3) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        return;
      }

      // Redirect to main page - middleware will let them through now
      router.push("/predicciones");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    nickname.length >= 3 &&
    nickname.length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(nickname);

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bienvenido a la Quiniela</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Elige tu pseudonimo. Este sera tu identidad en la quiniela y{" "}
            <strong>no se puede cambiar despues</strong>.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Pseudonimo</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value.toLowerCase());
                  setError("");
                }}
                placeholder="ej: ckpaz27"
                maxLength={20}
                autoFocus
              />
              <div className="min-h-5">
                {checking && (
                  <p className="text-xs text-muted-foreground">
                    Verificando disponibilidad...
                  </p>
                )}
                {!checking && isValid && available === true && (
                  <p className="text-xs text-green-600">
                    ✓ Disponible
                  </p>
                )}
                {!checking && error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                {nickname.length > 0 && nickname.length < 3 && (
                  <p className="text-xs text-muted-foreground">
                    Minimo 3 caracteres
                  </p>
                )}
              </div>
            </div>

            {isValid && available && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  Tus quinielas se llamaran:{" "}
                  <span className="font-medium text-foreground">
                    {nickname}-1
                  </span>
                  ,{" "}
                  <span className="font-medium text-foreground">
                    {nickname}-2
                  </span>
                  , etc.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || !available || saving}
            >
              {saving ? "Guardando..." : "Continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
