"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";

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
  resolvedHomeTeam?: TeamLite | null;
  resolvedAwayTeam?: TeamLite | null;
  slotLabel?: { home: string; away: string } | null;
}

interface MatchPick {
  homeScore: string;
  awayScore: string;
  predictedHomeTeamId: string;
  predictedAwayTeamId: string;
  winnerOnPenaltiesTeamId: string;
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

interface CompletenessData {
  percent: number;
  isComplete: boolean;
  totalRequired: number;
  totalFilled: number;
  phases: Array<{ phase: string; total: number; filled: number; fillable: number }>;
  openTiesCount: number;
  topScorerFilled: boolean;
}

interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamFlag: string | null;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  isBestThird: boolean;
}

interface GroupStandings {
  groupName: string;
  teams: StandingRow[];
}

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
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [derived, setDerived] = useState<{
    championTeamId: string | null;
    runnerUpTeamId: string | null;
    thirdPlaceTeamId: string | null;
  }>({ championTeamId: null, runnerUpTeamId: null, thirdPlaceTeamId: null });
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [phaseDeadlines, setPhaseDeadlines] = useState<Record<string, string>>({});
  const [phaseLocks, setPhaseLocks] = useState<Record<string, boolean>>({});
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
          winnerOnPenaltiesTeamId: "",
        };
      }
      for (const p of d.predictions ?? []) {
        if (initial[p.matchId]) {
          initial[p.matchId] = {
            homeScore: String(p.homeScore ?? ""),
            awayScore: String(p.awayScore ?? ""),
            predictedHomeTeamId: p.predictedHomeTeamId ?? initial[p.matchId].predictedHomeTeamId,
            predictedAwayTeamId: p.predictedAwayTeamId ?? initial[p.matchId].predictedAwayTeamId,
            winnerOnPenaltiesTeamId: p.winnerOnPenaltiesTeamId ?? "",
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
      setStandings(d.standings ?? []);
      setDerived(
        d.derived ?? { championTeamId: null, runnerUpTeamId: null, thirdPlaceTeamId: null }
      );
      setCompleteness(d.completeness ?? null);
      setPhaseDeadlines(d.phaseDeadlines ?? {});
      setPhaseLocks(d.phaseLocks ?? {});
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
        winnerOnPenaltiesTeamId: p.winnerOnPenaltiesTeamId || null,
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
    if (r.ok) {
      setSavedAt(Date.now());
      // Reload bracket so KO matches reflect updated group standings
      load();
    } else {
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
            Llena los grupos primero. Los equipos de Octavos, Cuartos, Semis y
            Final se llenan <strong>automaticamente</strong> segun tus
            predicciones (guarda para refrescar el bracket).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/predicciones-bracket/liga"
            className="text-sm px-3 py-2 rounded-md border border-input bg-background hover:bg-muted transition-colors"
          >
            👥 Ver predicciones de la liga
          </a>
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
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          El periodo para editar predicciones ha cerrado.
        </div>
      )}

      {completeness && <CompletenessBanner data={completeness} />}

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
            onClick={() => setActivePhase("STANDINGS" as Phase)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              (activePhase as string) === "STANDINGS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tabla
          </button>
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
          derived={derived}
          disabled={!canEdit}
        />
      ) : (activePhase as string) === "STANDINGS" ? (
        <StandingsSection standings={standings} />
      ) : (
        <PhaseSection
          phase={activePhase}
          matches={matchesByPhase[activePhase] ?? []}
          picks={picks}
          updatePick={updatePick}
          disabled={!canEdit || !!phaseLocks[activePhase]}
          phaseLocked={!!phaseLocks[activePhase]}
          phaseDeadline={phaseDeadlines[activePhase] ?? null}
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
  picks,
  updatePick,
  disabled,
  phaseLocked,
  phaseDeadline,
}: {
  phase: Phase;
  matches: MatchLite[];
  picks: Record<string, MatchPick>;
  updatePick: (id: string, patch: Partial<MatchPick>) => void;
  disabled: boolean;
  phaseLocked?: boolean;
  phaseDeadline?: string | null;
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
    <div className="space-y-3">
      {phaseLocked && (
        <div className="rounded-lg bg-red-50 border-2 border-red-300 p-3 text-sm text-red-900 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Fase cerrada</p>
            <p className="text-xs">
              Esta fase ya esta bloqueada — o los enfrentamientos aun no
              estan definidos, o el deadline para llenarla ya paso.
            </p>
          </div>
        </div>
      )}
      {!phaseLocked && phaseDeadline && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
          ⚠ Debes completar TODOS los partidos de esta fase antes de{" "}
          <strong>
            {new Intl.DateTimeFormat("es-VE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "America/Caracas",
            }).format(new Date(phaseDeadline))}
          </strong>
          . Después ya no podrás editarlos.
        </div>
      )}
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
                <span>{new Intl.DateTimeFormat("es-VE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Caracas",
                }).format(new Date(m.dateTime))}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* HOME */}
                <div>
                  {isGroupStage && m.homeTeam ? (
                    <p className="text-sm font-semibold">
                      {m.homeTeam.flag ?? ""} {m.homeTeam.name}
                    </p>
                  ) : m.resolvedHomeTeam ? (
                    <p className="text-sm font-semibold">
                      {m.resolvedHomeTeam.flag ?? ""} {m.resolvedHomeTeam.name}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {m.slotLabel?.home ?? "TBD"}
                    </p>
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
                  ) : m.resolvedAwayTeam ? (
                    <p className="text-sm font-semibold">
                      {m.resolvedAwayTeam.name} {m.resolvedAwayTeam.flag ?? ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {m.slotLabel?.away ?? "TBD"}
                    </p>
                  )}
                </div>
              </div>

              {/* Penalty winner picker (KO only, only when scores are a tie and both teams known) */}
              {!isGroupStage &&
                pick.homeScore !== "" &&
                pick.awayScore !== "" &&
                pick.homeScore === pick.awayScore &&
                m.resolvedHomeTeam &&
                m.resolvedAwayTeam && (
                  <div className="pt-2 border-t flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">
                      Pasa por penales:
                    </span>
                    <select
                      value={pick.winnerOnPenaltiesTeamId}
                      onChange={(e) =>
                        updatePick(m.id, { winnerOnPenaltiesTeamId: e.target.value })
                      }
                      disabled={disabled}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="">-- elegir --</option>
                      <option value={m.resolvedHomeTeam.id}>
                        {m.resolvedHomeTeam.name}
                      </option>
                      <option value={m.resolvedAwayTeam.id}>
                        {m.resolvedAwayTeam.name}
                      </option>
                    </select>
                  </div>
                )}
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

const PHASE_NAMES_FOR_BANNER: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  ROUND_OF_32: "Treintaidosavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "Tercer Lugar",
  FINAL: "Final",
};

function CompletenessBanner({ data }: { data: CompletenessData }) {
  if (data.isComplete) {
    return (
      <div className="rounded-lg bg-green-50 border-2 border-green-300 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-700 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900">Tu quiniela esta completa!</p>
            <p className="text-xs text-green-800">
              {data.totalFilled} de {data.totalRequired} predicciones cargadas.
              Puedes seguir editando hasta el cierre.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const missing: string[] = [];
  for (const ph of data.phases) {
    if (ph.fillable === 0) continue;
    const remaining = ph.fillable - ph.filled;
    if (remaining > 0) {
      missing.push(
        `${PHASE_NAMES_FOR_BANNER[ph.phase] ?? ph.phase}: faltan ${remaining}/${ph.fillable}`
      );
    }
  }
  if (data.openTiesCount > 0) {
    missing.push(
      `${data.openTiesCount} empate${data.openTiesCount > 1 ? "s" : ""} sin ganador por penales`
    );
  }
  if (!data.topScorerFilled) {
    missing.push("Goleador del torneo");
  }

  // Hint about future phases that can't yet be filled
  const phaseLocked: string[] = [];
  for (const ph of data.phases) {
    if (ph.total > 0 && ph.fillable < ph.total) {
      const locked = ph.total - ph.fillable;
      phaseLocked.push(
        `${PHASE_NAMES_FOR_BANNER[ph.phase] ?? ph.phase} (${locked} partido${locked > 1 ? "s" : ""})`
      );
    }
  }

  return (
    <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-bold text-amber-900">
              Tu quiniela no esta completa
            </p>
            <span className="text-xs font-semibold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
              {data.percent}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-amber-200 overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all"
              style={{ width: `${data.percent}%` }}
            />
          </div>
          <p className="text-xs text-amber-800 mt-2">
            {data.totalFilled}/{data.totalRequired} predicciones cargadas
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded bg-white/70 p-3 text-xs space-y-1">
          <p className="font-semibold text-amber-900">Te falta:</p>
          <ul className="list-disc list-inside text-amber-900 space-y-0.5">
            {missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {phaseLocked.length > 0 && (
        <p className="text-[11px] text-amber-700/80 italic">
          Tip: {phaseLocked.join(", ")} se desbloquean cuando termines la fase anterior.
        </p>
      )}
    </div>
  );
}

function StandingsSection({ standings }: { standings: GroupStandings[] }) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Llena los partidos de la fase de grupos y guarda</p>
        <p className="text-xs mt-2">
          Aqui veras las tablas calculadas automaticamente segun tus predicciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Ranking calculado segun tus predicciones (puntos → diferencia de gol → goles a favor).
        Los <strong className="text-yellow-600">3ros marcados</strong> son los 8 mejores
        terceros que avanzan a Octavos.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {standings.map((g) => (
          <Card key={g.groupName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Grupo {g.groupName}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left font-normal w-4">#</th>
                    <th className="text-left font-normal">Equipo</th>
                    <th className="text-center font-normal w-7">PJ</th>
                    <th className="text-center font-normal w-7">DG</th>
                    <th className="text-center font-normal w-7">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {g.teams.map((t) => {
                    const isTop2 = t.rank <= 2;
                    const isThird = t.rank === 3;
                    const rowClass = isTop2
                      ? "bg-green-50 border-l-2 border-green-500"
                      : isThird && t.isBestThird
                        ? "bg-yellow-50 border-l-2 border-yellow-500"
                        : "";
                    return (
                      <tr key={t.teamId} className={rowClass}>
                        <td className="font-bold py-1 pl-1">{t.rank}</td>
                        <td className="py-1">
                          {t.teamFlag ?? ""} {t.teamName}
                          {isThird && t.isBestThird && (
                            <span className="ml-1 text-[9px] text-yellow-700 font-semibold">
                              ★
                            </span>
                          )}
                        </td>
                        <td className="text-center text-muted-foreground">{t.played}</td>
                        <td className="text-center tabular-nums">
                          {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                        </td>
                        <td className="text-center font-bold">{t.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TournamentSection({
  teams,
  tournament,
  setTournament,
  derived,
  disabled,
}: {
  teams: TeamLite[];
  tournament: Record<string, string>;
  setTournament: (
    upd: (prev: Record<string, string>) => Record<string, string>
  ) => void;
  derived: {
    championTeamId: string | null;
    runnerUpTeamId: string | null;
    thirdPlaceTeamId: string | null;
  };
  disabled: boolean;
}) {
  const set = (k: string, v: string) =>
    setTournament((prev) => ({ ...prev, [k]: v }));

  const teamLabel = (id: string | null) => {
    if (!id) return null;
    const t = teams.find((tt) => tt.id === id);
    if (!t) return null;
    return `${t.flag ?? ""} ${t.name}`.trim();
  };

  const TBD = (
    <p className="text-xs text-muted-foreground italic">
      Llena las eliminatorias para que se calcule
    </p>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Predicciones del torneo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Campeon, subcampeon y tercer lugar se <strong>calculan automaticamente</strong>{" "}
          segun tus predicciones de las fases finales.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>🏆 Campeon</Label>
          {teamLabel(derived.championTeamId) ? (
            <p className="text-base font-semibold text-yellow-700">
              {teamLabel(derived.championTeamId)}
            </p>
          ) : (
            TBD
          )}
        </div>
        <div className="space-y-1">
          <Label>🥈 Subcampeon</Label>
          {teamLabel(derived.runnerUpTeamId) ? (
            <p className="text-base font-semibold">
              {teamLabel(derived.runnerUpTeamId)}
            </p>
          ) : (
            TBD
          )}
        </div>
        <div className="space-y-1">
          <Label>🥉 Tercer lugar</Label>
          {teamLabel(derived.thirdPlaceTeamId) ? (
            <p className="text-base font-semibold">
              {teamLabel(derived.thirdPlaceTeamId)}
            </p>
          ) : (
            TBD
          )}
        </div>
        <div className="space-y-1 pt-3 border-t">
          <Label>⚽ Goleador del torneo</Label>
          <Input
            value={tournament.TOP_SCORER}
            onChange={(e) => set("TOP_SCORER", e.target.value)}
            disabled={disabled}
            placeholder="Nombre del jugador"
          />
          <p className="text-xs text-muted-foreground">
            Este si lo eliges tu (no se puede derivar de los marcadores).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
