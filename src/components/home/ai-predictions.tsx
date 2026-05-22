"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { TeamFlag } from "@/components/ui/team-flag";

interface AiItem {
  provider: string;
  quinielaId: string;
  championName: string | null;
  championCode: string | null;
}

const AI_DISPLAY: Record<string, { label: string; emoji: string; color: string }> = {
  claude: { label: "Claude", emoji: "🤖", color: "bg-orange-100 border-orange-300 text-orange-900" },
  chatgpt: { label: "ChatGPT", emoji: "🤖", color: "bg-emerald-100 border-emerald-300 text-emerald-900" },
  gemini: { label: "Gemini", emoji: "🤖", color: "bg-blue-100 border-blue-300 text-blue-900" },
  grok: { label: "Grok", emoji: "🤖", color: "bg-zinc-100 border-zinc-400 text-zinc-900" },
  deepseek: { label: "DeepSeek", emoji: "🤖", color: "bg-indigo-100 border-indigo-300 text-indigo-900" },
};

export function AiPredictionsSection() {
  const [items, setItems] = useState<AiItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/ai-predictions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) setItems(data.items);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-purple-200">
      <CardContent className="p-5 sm:p-6">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Exclusivo
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            {items.length} AIs ya hicieron su quiniela
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Las AIs mas famosas del mundo predicen el Mundial 2026 — competiran contra ti en el leaderboard
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {items.map((ai) => {
            const cfg = AI_DISPLAY[ai.provider] ?? {
              label: ai.provider,
              emoji: "🤖",
              color: "bg-gray-100 border-gray-300",
            };
            return (
              <Link
                key={ai.quinielaId}
                href={`/quiniela/${ai.quinielaId}`}
                className={`block rounded-xl border-2 p-3 text-center hover:scale-105 transition-transform ${cfg.color}`}
              >
                <div className="text-xl mb-1">{cfg.emoji}</div>
                <div className="font-bold text-sm">{cfg.label}</div>
                <div className="mt-2 pt-2 border-t border-current/20">
                  {ai.championCode ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <TeamFlag code={ai.championCode} size="sm" />
                      <span className="text-xs font-semibold">{ai.championName}</span>
                    </div>
                  ) : (
                    <span className="text-xs">Sin pick</span>
                  )}
                </div>
                <div className="text-[10px] opacity-70 mt-1">campeon</div>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/tabla"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          >
            Ver predicciones completas
          </Link>
          <Link
            href="/paquetes"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-primary text-primary hover:bg-primary/10 h-9 px-4"
          >
            Vence a las AIs - Participa
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
