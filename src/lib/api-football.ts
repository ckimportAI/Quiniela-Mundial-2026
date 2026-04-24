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
export function normalizeTeamName(name: string): string {
  const n = name.trim().toLowerCase();
  const map: Record<string, string> = {
    "south korea": "korea republic",
    "united states": "usa",
    "usa": "united states",
    "korea republic": "south korea",
    "cape verde": "cabo verde",
    "cabo verde": "cape verde",
    "cote d'ivoire": "ivory coast",
    "ivory coast": "cote d'ivoire",
    "bosnia-herzegovina": "bosnia and herzegovina",
    "bosnia and herzegovina": "bosnia-herzegovina",
    "turkiye": "turkey",
    "turkey": "turkiye",
    "dr congo": "congo dr",
    "congo dr": "dr congo",
  };
  return map[n] ?? n;
}

/**
 * Return both original and normalized variations to try matching a team.
 */
export function getTeamNameCandidates(name: string): string[] {
  const orig = name.trim().toLowerCase();
  const normalized = normalizeTeamName(name);
  return [...new Set([orig, normalized])];
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
