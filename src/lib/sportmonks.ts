// Sportmonks API client for live results
// Docs: https://docs.sportmonks.com/football

const SPORTMONKS_API_URL = "https://api.sportmonks.com/v3";
const SPORTMONKS_TOKEN = process.env.SPORTMONKS_API_TOKEN;

// FIFA World Cup 2026 competition ID on Sportmonks (to be confirmed)
const WORLD_CUP_2026_ID = process.env.SPORTMONKS_WC_LEAGUE_ID ?? "732";

interface SportmonksResponse<T> {
  data: T;
  pagination?: {
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

interface SportmonksFixture {
  id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  round_id: number;
  state_id: number;
  name: string;
  starting_at: string;
  result_info: string | null;
  leg: string;
  length: number;
  has_odds: boolean;
  scores?: SportmonksScore[];
  participants?: SportmonksParticipant[];
}

interface SportmonksScore {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: {
    goals: number;
    participant: string;
  };
  description: string;
}

interface SportmonksParticipant {
  id: number;
  name: string;
  short_code: string;
  meta?: {
    location: "home" | "away";
  };
}

// State IDs: https://docs.sportmonks.com/football/api-reference/states
const FINISHED_STATES = [5]; // FT (Full Time)
const LIVE_STATES = [1, 2, 3, 4, 14, 15, 16, 17, 21, 22]; // Various live states

async function sportmonksFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<SportmonksResponse<T> | null> {
  if (!SPORTMONKS_TOKEN) {
    console.warn("SPORTMONKS_API_TOKEN not configured");
    return null;
  }

  const url = new URL(`${SPORTMONKS_API_URL}${endpoint}`);
  url.searchParams.set("api_token", SPORTMONKS_TOKEN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`Sportmonks API error: ${res.status} ${res.statusText}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Sportmonks API fetch error:", error);
    return null;
  }
}

export async function getLiveScores(): Promise<SportmonksFixture[]> {
  const res = await sportmonksFetch<SportmonksFixture[]>(
    "/football/livescores",
    {
      include: "scores;participants",
      filters: `fixtureLeagues:${WORLD_CUP_2026_ID}`,
    }
  );
  return res?.data ?? [];
}

export async function getFixturesByDate(
  date: string
): Promise<SportmonksFixture[]> {
  const res = await sportmonksFetch<SportmonksFixture[]>(
    `/football/fixtures/date/${date}`,
    {
      include: "scores;participants",
      filters: `fixtureLeagues:${WORLD_CUP_2026_ID}`,
    }
  );
  return res?.data ?? [];
}

export async function getFixtureById(
  id: number
): Promise<SportmonksFixture | null> {
  const res = await sportmonksFetch<SportmonksFixture>(
    `/football/fixtures/${id}`,
    {
      include: "scores;participants",
    }
  );
  return res?.data ?? null;
}

export function isFixtureFinished(fixture: SportmonksFixture): boolean {
  return FINISHED_STATES.includes(fixture.state_id);
}

export function isFixtureLive(fixture: SportmonksFixture): boolean {
  return LIVE_STATES.includes(fixture.state_id);
}

export function extractScore(fixture: SportmonksFixture): {
  homeScore: number;
  awayScore: number;
  homeTeamCode: string;
  awayTeamCode: string;
} | null {
  if (!fixture.participants || fixture.participants.length < 2) return null;
  if (!fixture.scores || fixture.scores.length === 0) return null;

  const home = fixture.participants.find(
    (p) => p.meta?.location === "home"
  );
  const away = fixture.participants.find(
    (p) => p.meta?.location === "away"
  );

  if (!home || !away) return null;

  // Get final time scores (type_id varies, but "2ND_HALF" or FT score)
  const homeScoreObj = fixture.scores.find(
    (s) =>
      s.participant_id === home.id && s.description === "CURRENT"
  );
  const awayScoreObj = fixture.scores.find(
    (s) =>
      s.participant_id === away.id && s.description === "CURRENT"
  );

  return {
    homeScore: homeScoreObj?.score?.goals ?? 0,
    awayScore: awayScoreObj?.score?.goals ?? 0,
    homeTeamCode: home.short_code,
    awayTeamCode: away.short_code,
  };
}
