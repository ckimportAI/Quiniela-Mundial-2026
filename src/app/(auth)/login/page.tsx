"use client";

import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      await signOut({ redirect: false });
      const result = await signIn("credentials-password", {
        email,
        password,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setError("Email o contrasena incorrectos");
        setLoading(false);
        return;
      }

      // Routing priority:
      // 1. Liga owner -> their admin panel (skip onboarding; they don't play)
      // 2. Liga member -> bracket page (full-quiniela single-page form)
      // 3. No nickname -> onboarding
      // 4. Otherwise -> predicciones
      const checkRes = await fetch(
        `/api/users/check-profile?email=${encodeURIComponent(email)}`
      );
      if (checkRes.ok) {
        const profile = await checkRes.json();
        if (profile.isLigaOwner) {
          window.location.href = "/liga-admin";
          return;
        }
        if (profile.isLigaMember) {
          window.location.href = "/predicciones-bracket";
          return;
        }
        if (!profile.hasNickname) {
          window.location.href = "/onboarding";
          return;
        }
      }
      window.location.href = "/predicciones";
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
      setLoading(false);
    }
  };

  // Dev-only: legacy email-only login for local testing
  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await signOut({ redirect: false });
      const result = await signIn("credentials", {
        email,
        redirect: false,
      });
      if (result?.error) {
        setError("Error al iniciar sesion: " + result.error);
        setLoading(false);
        return;
      }
      const checkRes = await fetch(
        `/api/users/check-profile?email=${encodeURIComponent(email)}`
      );
      if (checkRes.ok) {
        const profile = await checkRes.json();
        if (!profile.hasNickname) {
          window.location.href = "/onboarding";
          return;
        }
      }
      window.location.href = callbackUrl;
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesion</CardTitle>
          <CardDescription>
            Accede con Google o tu email y contrasena
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground uppercase">
              O
            </span>
          </div>

          {/* Email + Password */}
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar con email"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link href="/register" className="text-primary underline font-medium">
              Registrate
            </Link>
          </div>

          {/* Dev login (solo en desarrollo) */}
          {process.env.NODE_ENV === "development" && (
            <>
              <Separator />
              <form onSubmit={handleDevLogin} className="space-y-2">
                <Label className="text-xs">Login de desarrollo (solo local)</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="dev@test.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={loading}>
                    Dev
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
