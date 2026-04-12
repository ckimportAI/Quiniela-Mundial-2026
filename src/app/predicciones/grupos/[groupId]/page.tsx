"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GroupPredictions } from "@/components/predictions/group-predictions";
import { QuinielaSelector } from "@/components/quiniela/quiniela-selector";
import type { MatchWithDetails } from "@/lib/types";

interface GroupPredictionsPageProps {
  params: Promise<{ groupId: string }>;
}

interface GroupData {
  id: string;
  name: string;
  teams: { id: string; name: string; flag: string | null }[];
  matches: MatchWithDetails[];
}

interface GroupNav {
  id: string;
  name: string;
}

function GroupPredictionsContent({
  params,
}: GroupPredictionsPageProps) {
  const searchParams = useSearchParams();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [quinielaId, setQuinielaId] = useState<string | null>(
    searchParams.get("q")
  );
  const [group, setGroup] = useState<GroupData | null>(null);
  const [allGroups, setAllGroups] = useState<GroupNav[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then(({ groupId: gId }) => setGroupId(gId));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [groupRes, allGroupsRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch("/api/groups"),
      ]);

      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroup(data);
      }
      if (allGroupsRes.ok) {
        const data = await allGroupsRes.json();
        setAllGroups(
          data.map((g: GroupNav) => ({ id: g.id, name: g.name }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !groupId) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Grupo no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/predicciones"
          className="text-muted-foreground hover:text-foreground"
        >
          Predicciones
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Grupo {group.name}</span>
      </div>

      {/* Quiniela selector */}
      <QuinielaSelector selectedId={quinielaId} onSelect={setQuinielaId} />

      {/* Group navigation tabs */}
      <div className="flex gap-2 flex-wrap">
        {allGroups.map((g) => (
          <Link
            key={g.id}
            href={`/predicciones/grupos/${g.id}${quinielaId ? `?q=${quinielaId}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              g.id === groupId
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {/* Predictions */}
      {quinielaId ? (
        <GroupPredictions
          matches={group.matches}
          groupName={group.name}
          quinielaId={quinielaId}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Selecciona o crea una quiniela para ver tus predicciones.
        </div>
      )}
    </div>
  );
}

export default function GroupPredictionsPage({
  params,
}: GroupPredictionsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-36 rounded-lg border animate-pulse bg-muted"
              />
            ))}
          </div>
        </div>
      }
    >
      <GroupPredictionsContent params={params} />
    </Suspense>
  );
}
