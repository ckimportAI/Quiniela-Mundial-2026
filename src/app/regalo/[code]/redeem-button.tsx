"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function RedeemButton({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo canjear el codigo");
        setLoading(false);
        return;
      }
      // Redirect to predicciones with the new quiniela selected
      router.push(`/quiniela/${data.quinielaId}`);
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <Button
        onClick={handleRedeem}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Canjeando...
          </>
        ) : (
          "Aceptar regalo y crear quiniela"
        )}
      </Button>
    </div>
  );
}
