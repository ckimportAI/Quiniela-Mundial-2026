"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Debounced nickname availability check
  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setAvailable(null);
      return;
    }

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
    if (!available || !isFormValid) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          name: fullName.trim(),
          cedula: cedula.trim(),
          phone: phone.trim(),
          aceptaTerminos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        return;
      }

      // Redirect to home (not protected by middleware)
      // JWT will refresh with nickname on next protected route visit
      window.location.href = "/";
    } finally {
      setSaving(false);
    }
  };

  const isNicknameValid =
    nickname.length >= 3 &&
    nickname.length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(nickname);

  const isFormValid =
    isNicknameValid &&
    available === true &&
    fullName.trim().length >= 2 &&
    cedula.trim().length >= 5 &&
    phone.trim().length >= 7 &&
    aceptaTerminos;

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bienvenido a la Quiniela</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Completa tus datos para participar. El pseudonimo{" "}
            <strong>no se puede cambiar despues</strong>.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Carlos Perez"
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Cedula */}
            <div className="space-y-1.5">
              <Label htmlFor="cedula">Cedula de identidad</Label>
              <Input
                id="cedula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: V-12345678"
                maxLength={20}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 0412-1234567"
                maxLength={20}
              />
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <Label htmlFor="nickname">Pseudonimo</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value.toLowerCase());
                  setError("");
                }}
                placeholder="Ej: ckpaz27"
                maxLength={20}
              />
              <div className="min-h-5">
                {checking && (
                  <p className="text-xs text-muted-foreground">
                    Verificando disponibilidad...
                  </p>
                )}
                {!checking && isNicknameValid && available === true && (
                  <p className="text-xs text-green-600">
                    Disponible
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

            {isFormValid && (
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

            {/* Terms acceptance */}
            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-muted-foreground">
                He leido y acepto los{" "}
                <a
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Terminos y Condiciones
                </a>{" "}
                y la{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Politica de Privacidad
                </a>
              </span>
            </label>

            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || saving}
            >
              {saving ? "Guardando..." : "Crear Cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
