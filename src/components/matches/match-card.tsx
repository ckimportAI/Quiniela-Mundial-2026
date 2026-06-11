import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamFlag } from "@/components/ui/team-flag";
import type { MatchWithDetails } from "@/lib/types";

const phaseLabels: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Final",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "outline",
  LIVE: "destructive",
  FINISHED: "secondary",
  POSTPONED: "default",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Programado",
  LIVE: "En Vivo",
  FINISHED: "Finalizado",
  POSTPONED: "Pospuesto",
};

const ET_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Caracas",
});

const ET_DATE_TIME = new Intl.DateTimeFormat("es-VE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Caracas",
});

interface MatchCardProps {
  match: MatchWithDetails;
  compact?: boolean;
}

export function MatchCard({ match, compact = false }: MatchCardProps) {
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";

  return (
    <Card className={isLive ? "border-red-500 border-2" : ""}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        {/* Header: match info */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            #{match.matchNumber} &middot;{" "}
            {match.group
              ? `Grupo ${match.group.name}`
              : phaseLabels[match.phase] ?? match.phase}
          </span>
          <Badge variant={statusVariants[match.status]}>
            {statusLabels[match.status]}
          </Badge>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className={`text-sm font-medium ${!match.homeTeam ? "text-muted-foreground italic" : ""}`}>
                {match.homeTeam?.name ?? "Por definir"}
              </span>
              {match.homeTeam && (
                <TeamFlag code={match.homeTeam.code} size="lg" />
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 px-3 min-w-[80px] justify-center">
            {isFinished || isLive ? (
              <span className="text-xl font-bold tabular-nums">
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {ET_TIME.format(new Date(match.dateTime))}              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {match.awayTeam && (
                <TeamFlag code={match.awayTeam.code} size="lg" />
              )}
              <span className={`text-sm font-medium ${!match.awayTeam ? "text-muted-foreground italic" : ""}`}>
                {match.awayTeam?.name ?? "Por definir"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: date & venue */}
        {!compact && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {ET_DATE_TIME.format(new Date(match.dateTime))}            </span>
            {match.venue && (
              <span>
                {match.venue.city}
              </span>
            )}
          </div>
        )}

        {/* Penalties if applicable */}
        {isFinished &&
          match.homePenalty != null &&
          match.awayPenalty != null && (
            <div className="text-center text-xs text-muted-foreground mt-1">
              Penales: {match.homePenalty} - {match.awayPenalty}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
