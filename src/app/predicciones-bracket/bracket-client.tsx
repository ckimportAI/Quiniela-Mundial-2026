"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

type Phase =
  | "GROUP_STAGE"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

interface TeamLite {
  id: string;
  name: string;
  code: string;
  flag: string | null;
  group?: { name: string } | null;
}

interface MatchLite {
  id: string;
  matchNumber: number;
  phase: Phase;
  dateTime: string;
  homeTeam: TeamLite | null;
  awayTeam: TeamLite | null;
  group?: { name: string } | null;
}

interface MatchPick {
  homeScore: string;
  awayScore: string;
  predictedHomeTeamId: string;
  predictedAwayTeamId: string;
}

const PHASE_LABELS: Record<Phase, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Treintaidosavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "Tercer Lugar",
  FINAL: "Final",
};

const PHASE_ORDER: Phase[] = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

interface Quiniela {
  id: string;
  name: string;
}

export default function BracketClient({
  quinielas,
}: {
  quinielas: Quiniela[];
}) {
  const [activeQuinielaId, setActiveQuinielaId] = useState(quinielas[0].id);
  const [activePhase, setActivePhase] = useState<Phase>("GROUP_STAGE");
  const [matches, setMatches] = useState<MatchLite[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [picks, setPicks] = useState<Record<string, MatchPick>>({});
  const [tournament, setTournament] = useState<Record<string, string>>({
    CHAMPION: "",
    RUNNER_UP: "",
    THIRD_PLACE: "",
    TOP_SCORER: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [canEdit, setCanEdit] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/predictions-bracket?quinielaId=${activeQuinielaId}`);
    if (r.ok) {
      const d = await r.json();
      setMatches(d.matches);
      setTeams(d.teams);
      setCanEdit(d.canEdit);

      const initial: Record<string, MatchPick> = {};
      for (const m of d.matches as MatchLite[]) {
        initial[m.id] = {
          homeScore: "",
          awayScore: "",
          predictedHomeTeamId: m.homeTeam?.id ?? "",
          predictedAwayTeamId: m.awayTeam?.id ?? "",
        };
      }
      for (const p of d.predictions ?? []) {
        if (initial[p.matchId]) {
          initial[p.matchId] = {
            homeScore: String(p.homeScore ?? ""),
            awayScore: String(p.awayScore ?? ""),
            predictedHomeTeamId: p.predictedHomeTeamId ?? initial[p.matchId].predictedHomeTeamId,
            predictedAwayTeamId: p.predictedAwayTeamId ?? initial[p.matchId].predictedAwayTeamId,
          };
        }
      }
      setPicks(initial);

      const tp: Record<string, string> = {
        CHAMPION: "",
        RUNNER_UP: "",
        THIRD_PLACE: "",
        TOP_SCORER: "",
      };
      for (const t of d.tournamentPicks ?? []) {
        if (t.type in tp) {
          tp[t.type] = t.teamId ?? t.playerName ?? "";
        }
      }
      setTournament(tp);
    }
    setLoading(false);
  }, [activeQuinielaId]);

  useEffect(() => {
    load();
  }, [load]);

  const matchesByPhase = useMemo(() => {
    const map: Record<Phase, MatchLite[]> = {
      GROUP_STAGE: [],
      ROUND_OF_32: [],
      ROUND_OF_16: [],
      QUARTER_FINALS: [],
      SEMI_FINALS: [],
      THIRD_PLACE: [],
      FINAL: [],
    };
    for (const m of matches) map[m.phase].push(m);
    return map;
  }, [matches]);

  const updatePick = (matchId: string, patch: Partial<MatchPick>) =>
    setPicks((cur) => ({ ...cur, [matchId]: { ...cur[matchId], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    const matchPicks = Object.entries(picks)
      .map(([matchId, p]) => ({
        matchId,
        homeScore: p.homeScore === "" ? null : Number(p.homeScore),
        awayScore: p.awayScore === "" ? null : Number(p.awayScore),
        predictedHomeTeamId: p.predictedHomeTeamId || null,
        predictedAwayTeamId: p.predictedAwayTeamId || null,
      }))
      .filter((p) => p.homeScore !== null && p.awayScore !== null);

    const tournamentPicks = [
      { type: "CHAMPION", teamId: tournament.CHAMPION || null },
      { type: "RUNNER_UP", teamId: tournament.RUNNER_UP || null },
      { type: "THIRD_PLACE", teamId: tournament.THIRD_PLACE || null },
      { type: "TOP_SCORER", playerName: tournament.TOP_SCORER || null },
    ];

    const r = await fetch("/api/predictions-bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quinielaId: activeQuinielaId,
        matchPicks,
        tournamentPicks,
      }),
    });
    setSaving(false);
    if (r.ok) setSavedAt(Date.now());
    else {
      const d = await r.json();
      alert(d.error ?? "Error al guardar");
    }
  };

  // Compute fill progress per phase
  const progressByPhase = useMemo(() => {
    const out: Record<Phase, { filled: number; total: number }> = {
      GROUP_STAGE: { filled: 0, total: 0 },
      ROUND_OF_32: { filled: 0, total: 0 },
      ROUND_OF_16: { filled: 0, total: 0 },
      QUARTER_FINALS: { filled: 0, total: 0 },
      SEMI_FINALS: { filled: 0, total: 0 },
      THIRD_PLACE: { filled: 0, total: 0 },
      FINAL: { filled: 0, total: 0 },
    };
    for (const m of matches) {
      out[m.phase].total++;
      const p = picks[m.id];
      if (p && p.homeScore !== "" && p.awayScore !== "") out[m.phase].filled++;
    }
    return out;
  }, [matches, picks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Bracket Completo</h1>
          <p className="text-sm text-muted-foreground">
            Llena toda tu quiniela de una vez: grupos + eliminatorias + torneo.
          </p>
        </div>
        {quinielas.length > 1 && (
          <select
            value={activeQuinielaId}
            onChange={(e) => setActiveQuinielaId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {quinielas.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          El periodo para editar predicciones ha cerrado.
        </div>
      )}

      {/* Phase tabs */}
      <div className="overflow-x-auto">
        <div className="flex border-b min-w-max">
          {PHASE_ORDER.map((ph) => {
            const prog = progressByPhase[ph];
            const isActive = activePhase === ph;
            return (
              <button
                key={ph}
                type="button"
                onClick={() => setActivePhase(ph)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {PHASE_LABELS[ph]}
                {prog.total > 0 && (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                      prog.filled === prog.total
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {prog.filled}/{prog.total}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActivePhase("TORNEO" as Phase)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              (activePhase as string) === "TORNEO"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Torneo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : (activePhase as string) === "TORNEO" ? (
        <TournamentSection
          teams={teams}
          tournament={tournament}
          setTournament={setTournament}
          disabled={!canEdit}
        />
      ) : (
        <PhaseSection
          phase={activePhase}
          matches={matchesByPhase[activePhase] ?? []}
          teams={teams}
          picks={picks}
          updatePick={updatePick}
          disabled={!canEdit}
        />
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-3 mt-6 flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !canEdit}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Guardar todo
            </>
          )}
        </Button>
        {savedAt && (
          <span className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Guardado{" "}
            {new Date(savedAt).toLocaleTimeString("es-VE")}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Tip: puedes guardar progreso en cualquier momento y volver despues.
        </span>
      </div>
    </div>
  );
}

function PhaseSection({
  phase,
  matches,
  teams,
  picks,
  updatePick,
  disabled,
}: {
  phase: Phase;
  matches: MatchLite[];
  teams: TeamLite[];
  picks: Record<string, MatchPick>;
  updatePick: (id: string, patch: Partial<MatchPick>) => void;
  disabled: boolean;
}) {
  const isGroupStage = phase === "GROUP_STAGE";

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sin partidos en esta fase.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {matches.map((m) => {
        const pick = picks[m.id] ?? {
          homeScore: "",
          awayScore: "",
          predictedHomeTeamId: "",
          predictedAwayTeamId: "",
        };
        const groupLabel = m.group?.name
          ? `Grupo ${m.group.name}`
          : `Partido ${m.matchNumber}`;
        return (
          <Card key={m.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{groupLabel}</span>
                <span>{new Date(m.dateTime).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "short",
                })}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* HOME */}
                <div>
                  {isGroupStage && m.homeTeam ? (
                    <p className="text-sm font-semibold">
                      {m.homeTeam.flag ?? ""} {m.homeTeam.name}
                    </p>
                  ) : (
                    <TeamSelect
                      value={pick.predictedHomeTeamId}
                      teams={teams}
                      onChange={(v) => updatePick(m.id, { predictedHomeTeamId: v })}
                      disabled={disabled}
                      placeholder="Local"
                    />
                  )}
                </div>

                {/* SCORES */}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    className="w-12 h-9 text-center text-sm"
                    value={pick.homeScore}
                    onChange={(e) => updatePick(m.id, { homeScore: e.target.value })}
                    disabled={disabled}
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    className="w-12 h-9 text-center text-sm"
                    value={pick.awayScore}
                    onChange={(e) => updatePick(m.id, { awayScore: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                {/* AWAY */}
                <div className="text-right">
                  {isGroupStage && m.awayTeam ? (
                    <p className="text-sm font-semibold">
                      {m.awayTeam.name} {m.awayTeam.flag ?? ""}
                    </p>
                  ) : (
                    <TeamSelect
                      value={pick.predictedAwayTeamId}
                      teams={teams}
                      onChange={(v) => updatePick(m.id, { predictedAwayTeamId: v })}
                      disabled={disabled}
                      placeholder="Visitante"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TeamSelect({
  value,
  teams,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  teams: TeamLite[];
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
    >
      <option value="">{placeholder}</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

function TournamentSection({
  teams,
  tournament,
  setTournament,
  disabled,
}: {
  teams: TeamLite[];
  tournament: Record<string, string>;
  setTournament: (
    upd: (prev: Record<string, string>) => Record<string, string>
  ) => void;
  disabled: boolean;
}) {
  const set = (k: string, v: string) =>
    setTournament((prev) => ({ ...prev, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Predicciones del torneo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>🏆 Campeon</Label>
          <select
            value={tournament.CHAMPION}
            onChange={(e) => set("CHAMPION", e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">--</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>🥈 Subcampeon</Label>
          <select
            value={tournament.RUNNER_UP}
            onChange={(e) => set("RUNNER_UP", e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">--</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>🥉 Tercer lugar</Label>
          <select
            value={tournament.THIRD_PLACE}
            onChange={(e) => set("THIRD_PLACE", e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">--</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>⚽ Goleador del torneo</Label>
          <Input
            value={tournament.TOP_SCORER}
            onChange={(e) => set("TOP_SCORER", e.target.value)}
            disabled={disabled}
            placeholder="Nombre del jugador"
          />
        </div>
      </CardContent>
    </Card>
  );
}
