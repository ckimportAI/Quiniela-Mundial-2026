// API-Football (api-sports.io) client for live World Cup 2026 scores
// Docs: https://www.api-football.com/documentation-v3

const API_BASE = "https://v3.football.api-sports.io";

function getKey(): string | null {
  return process.env.API_FOOTBALL_KEY ?? null;
}

function getLeagueId(): number {
  return Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
}

function getSeason(): number {
  return Number(process.env.API_FOOTBALL_SEASON ?? 2026);
}

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { long: string; short: string; elapsed: number | null };
    venue: { id: number | null; name: string | null; city: string | null };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

// Status codes that mean the match finished normally (count for predictions)
// https://www.api-football.com/documentation-v3#section/Authentication/fixtures-status
export const FINISHED_STATUSES = new Set([
  "FT", // Full time
  "AET", // After Extra Time
  "PEN", // After Penalty Shootout
]);

export const LIVE_STATUSES = new Set([
  "1H", // First Half
  "2H", // Second Half
  "HT", // Half Time
  "ET", // Extra Time
  "BT", // Break Time (pre-extra)
  "P", // Penalty Shootout
  "LIVE",
  "INT", // Interrupted
]);

export function isFinished(f: ApiFootballFixture): boolean {
  return FINISHED_STATUSES.has(f.fixture.status.short);
}

export function isLive(f: ApiFootballFixture): boolean {
  return LIVE_STATUSES.has(f.fixture.status.short);
}

async function apiFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T | null> {
  const key = getKey();
  if (!key) {
    console.warn("API_FOOTBALL_KEY not configured");
    return null;
  }

  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`API-Football ${res.status}: ${url.pathname}`);
      return null;
    }
    const body = await res.json();
    return body as T;
  } catch (err) {
    console.error("API-Football fetch error:", err);
    return null;
  }
}

export async function getApiStatus(): Promise<{
  requestsToday: number;
  limitDay: number;
} | null> {
  const data = await apiFetch<{
    response: {
      requests: { current: number; limit_day: number };
      subscription: { plan: string; end: string };
    };
  }>("/status");
  if (!data) return null;
  return {
    requestsToday: data.response.requests.current,
    limitDay: data.response.requests.limit_day,
  };
}

/**
 * Get all fixtures for the configured league + season.
 * Returns up to 104 matches for the full WC 2026.
 */
export async function getSeasonFixtures(): Promise<ApiFootballFixture[]> {
  const data = await apiFetch<{ response: ApiFootballFixture[] }>(
    "/fixtures",
    { league: getLeagueId(), season: getSeason() }
  );
  return data?.response ?? [];
}

/**
 * Get live fixtures for the configured league.
 * More efficient for cron polling during matches.
 */
export async function getLiveFixtures(): Promise<ApiFootballFixture[]> {
  const data = await apiFetch<{ response: ApiFootballFixture[] }>(
    "/fixtures",
    { league: getLeagueId(), season: getSeason(), live: "all" }
  );
  return data?.response ?? [];
}

/**
 * Get fixtures by date (YYYY-MM-DD).
 * Useful for daily sync.
 */
export async function getFixturesByDate(
  date: string
): Promise<ApiFootballFixture[]> {
  const data = await apiFetch<{ response: ApiFootballFixture[] }>(
    "/fixtures",
    { league: getLeagueId(), season: getSeason(), date }
  );
  return data?.response ?? [];
}

/**
 * Normalize a team name for matching against DB.
 * Handles common variations (Korea Republic ↔ South Korea, USA ↔ United States).
 */
// Bidirectional English <-> Spanish mapping for DB lookups.
// API-Football returns English names; DB stores Spanish names.
const ES_EN_PAIRS: Array<[string, string]> = [
  ["czech republic", "república checa"],
  ["korea republic", "corea del sur"],
  ["south korea", "corea del sur"],
  ["mexico", "méxico"],
  ["south africa", "sudáfrica"],
  ["bosnia and herzegovina", "bosnia y herzegovina"],
  ["bosnia-herzegovina", "bosnia y herzegovina"],
  ["canada", "canadá"],
  ["qatar", "catar"],
  ["switzerland", "suiza"],
  ["brazil", "brasil"],
  ["haiti", "haití"],
  ["morocco", "marruecos"],
  ["scotland", "escocia"],
  ["turkey", "turquía"],
  ["turkiye", "turquía"],
  ["united states", "estados unidos"],
  ["usa", "estados unidos"],
  ["curacao", "curazao"],
  ["cape verde", "cabo verde"],
  ["germany", "alemania"],
  ["ivory coast", "costa de marfil"],
  ["cote d'ivoire", "costa de marfil"],
  ["japan", "japón"],
  ["netherlands", "países bajos"],
  ["sweden", "suecia"],
  ["tunisia", "túnez"],
  ["belgium", "bélgica"],
  ["egypt", "egipto"],
  ["iran", "irán"],
  ["new zealand", "nueva zelanda"],
  ["saudi arabia", "arabia saudita"],
  ["spain", "españa"],
  ["france", "francia"],
  ["iraq", "irak"],
  ["norway", "noruega"],
  ["algeria", "argelia"],
  ["jordan", "jordania"],
  ["dr congo", "rd congo"],
  ["congo dr", "rd congo"],
  ["uzbekistan", "uzbekistán"],
  ["croatia", "croacia"],
  ["england", "inglaterra"],
  ["panama", "panamá"],
];

const NAME_ALIASES = new Map<string, string[]>();
for (const [en, es] of ES_EN_PAIRS) {
  if (!NAME_ALIASES.has(en)) NAME_ALIASES.set(en, []);
  if (!NAME_ALIASES.has(es)) NAME_ALIASES.set(es, []);
  NAME_ALIASES.get(en)!.push(es);
  NAME_ALIASES.get(es)!.push(en);
}

export function normalizeTeamName(name: string): string {
  // Kept for backward compatibility: returns the first alias if any, else self.
  const n = name.trim().toLowerCase();
  const aliases = NAME_ALIASES.get(n);
  return aliases?.[0] ?? n;
}

/**
 * Return original + all known aliases (lowercased) to try matching a team
 * against the DB. Handles English <-> Spanish and historical variants.
 */
export function getTeamNameCandidates(name: string): string[] {
  const orig = name.trim().toLowerCase();
  const aliases = NAME_ALIASES.get(orig) ?? [];
  return [...new Set([orig, ...aliases])];
}

/**
 * Extract the final 90-minute result from a fixture (used for predictions,
 * per T&C the penalty result doesn't count).
 */
export function extractFinalScore(f: ApiFootballFixture): {
  home: number;
  away: number;
} | null {
  // Use fulltime (90min) - penalty shootouts don't count for predictions
  const ft = f.score.fulltime;
  if (ft.home != null && ft.away != null) {
    return { home: ft.home, away: ft.away };
  }
  // Fallback to goals which has latest score
  if (f.goals.home != null && f.goals.away != null) {
    return { home: f.goals.home, away: f.goals.away };
  }
  return null;
}
