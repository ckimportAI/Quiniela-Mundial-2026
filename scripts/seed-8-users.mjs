import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

// 8 new venezuelan-flavored panas (no overlap with the 20 previous seed)
const USERS = [
  { nickname: "cachapa11",   name: "Andres Bello",       email: "cachapa11@quinipanas.test" },
  { nickname: "hallaca7",    name: "Jose Lopez",         email: "hallaca7@quinipanas.test" },
  { nickname: "llanero90",   name: "Pedro Galindo",      email: "llanero90@quinipanas.test" },
  { nickname: "tribuna13",   name: "Miguel Torres",      email: "tribuna13@quinipanas.test" },
  { nickname: "balonazo7",   name: "Carlos Suarez",      email: "balonazo7@quinipanas.test" },
  { nickname: "killer8",     name: "Diego Marquez",      email: "killer8@quinipanas.test" },
  { nickname: "mediocampo",  name: "Hector Bravo",       email: "mediocampo@quinipanas.test" },
  { nickname: "pabellon10",  name: "Rafael Castro",      email: "pabellon10@quinipanas.test" },
];

const TOURNAMENT_PICKS = [
  { champion: "Brasil",      runnerUp: "Argentina",   thirdPlace: "Francia",     topScorer: "Vinicius Jr" },
  { champion: "Argentina",   runnerUp: "Brasil",      thirdPlace: "España",      topScorer: "Lionel Messi" },
  { champion: "Francia",     runnerUp: "Inglaterra",  thirdPlace: "Brasil",      topScorer: "Kylian Mbappe" },
  { champion: "Alemania",    runnerUp: "España",      thirdPlace: "Argentina",   topScorer: "Florian Wirtz" },
  { champion: "España",      runnerUp: "Francia",     thirdPlace: "Brasil",      topScorer: "Lamine Yamal" },
  { champion: "Portugal",    runnerUp: "Brasil",      thirdPlace: "Argentina",   topScorer: "Cristiano Ronaldo" },
  { champion: "Inglaterra",  runnerUp: "Francia",     thirdPlace: "España",      topScorer: "Harry Kane" },
  { champion: "Países Bajos",runnerUp: "Brasil",      thirdPlace: "Argentina",   topScorer: "Cody Gakpo" },
];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genId() { return `seed8_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
function generateCedula() { return `V-${randomInt(8000000, 28000000)}`; }
function generatePhone() {
  const prefix = ["0412", "0414", "0424", "0416", "0426"][randomInt(0, 4)];
  return `${prefix}-${randomInt(2000000, 9999999)}`;
}

function predictScore(personality, idx) {
  switch (personality) {
    case "conservative": return [randomInt(0, 2), randomInt(0, 2)];
    case "aggressive":   return [randomInt(1, 4), randomInt(0, 3)];
    case "draw-lover":
      if (idx % 3 === 0) { const s = randomInt(0, 2); return [s, s]; }
      return [randomInt(0, 2), randomInt(0, 2)];
    case "upset":        return [randomInt(0, 3), randomInt(0, 3)];
    case "balanced":
    default:             return [randomInt(0, 3), randomInt(0, 2)];
  }
}

const PERSONALITIES = [
  "balanced", "aggressive", "conservative", "balanced",
  "draw-lover", "aggressive", "balanced", "upset",
];

async function main() {
  await client.connect();

  const matchesRes = await client.query(
    `SELECT id FROM matches WHERE phase = 'GROUP_STAGE' ORDER BY "matchNumber"`
  );
  const matches = matchesRes.rows;
  console.log(`Found ${matches.length} group stage matches`);

  const teamsRes = await client.query(`SELECT id, name FROM teams`);
  const teamByName = new Map(teamsRes.rows.map((r) => [r.name, r.id]));

  const summary = [];

  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const picks = TOURNAMENT_PICKS[i];
    const personality = PERSONALITIES[i];

    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1 OR nickname = $2`,
      [u.email, u.nickname]
    );
    if (existing.rows.length > 0) {
      console.log(`Skip ${u.nickname} - already exists`);
      summary.push({ ...u, status: "exists" });
      continue;
    }

    const userId = genId();
    const quinielaId = genId();
    const scoreId = genId();
    const cedula = generateCedula();
    const phone = generatePhone();

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO users (id, name, nickname, email, cedula, phone, credits, role,
          "terminosAceptados", "terminosVersion", "terminosFechaAceptacion",
          "privacidadAceptada", "privacidadFechaAceptacion",
          "ofertaBienvenidaUsada", "fechaPrimeraCompra",
          "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 0, 'PARTICIPANT',
          true, '1.0', NOW(),
          true, NOW(),
          false, NULL,
          NOW(), NOW())`,
        [userId, u.name, u.nickname, u.email, cedula, phone]
      );

      // Quiniela (real participant, no test, no liga = general)
      await client.query(
        `INSERT INTO quinielas (id, name, "userId", "ligaId", "isTest", "isAi", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NULL, false, false, NOW(), NOW())`,
        [quinielaId, `${u.nickname}-1`, userId]
      );

      // Score row
      await client.query(
        `INSERT INTO quiniela_scores (id, "quinielaId", "totalPoints", "exactScores",
          "correctResults", "partialScores", "groupPoints", "knockoutPoints",
          "tournamentPoints", "wildcardPoints", rank, "updatedAt")
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NOW())`,
        [scoreId, quinielaId]
      );

      // Group stage predictions
      const values = [];
      const params = [];
      let p = 1;
      for (let m = 0; m < matches.length; m++) {
        const [hs, as] = predictScore(personality, m);
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, false, NOW(), NOW())`);
        params.push(genId(), userId, quinielaId, matches[m].id, hs, as);
      }
      await client.query(
        `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
         VALUES ${values.join(", ")}`,
        params
      );

      // Tournament predictions
      const tournamentEntries = [
        { type: "CHAMPION",    teamName: picks.champion,    playerName: null },
        { type: "RUNNER_UP",   teamName: picks.runnerUp,    playerName: null },
        { type: "THIRD_PLACE", teamName: picks.thirdPlace,  playerName: null },
        { type: "TOP_SCORER",  teamName: null,              playerName: picks.topScorer },
      ];
      for (const t of tournamentEntries) {
        const teamId = t.teamName ? teamByName.get(t.teamName) ?? null : null;
        if (t.teamName && !teamId) {
          console.warn(`[${u.nickname}] team not found: ${t.teamName}`);
        }
        await client.query(
          `INSERT INTO tournament_predictions (id, "userId", "quinielaId", type, "teamId", "groupId", "playerName", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW(), NOW())`,
          [genId(), userId, quinielaId, t.type, teamId, t.playerName]
        );
      }

      await client.query("COMMIT");
      console.log(`OK ${(i + 1).toString().padStart(2, "0")}/8  ${u.nickname.padEnd(14)} ${u.email}`);
      summary.push({ ...u, status: "created", personality, picks });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`FAIL ${u.nickname}:`, err.message);
      summary.push({ ...u, status: "error", error: err.message });
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("Nickname        Email                                Champion        Top Scorer");
  console.log("-".repeat(110));
  for (const s of summary) {
    if (s.status === "created") {
      console.log(
        `${s.nickname.padEnd(15)} ${s.email.padEnd(36)} ${s.picks.champion.padEnd(15)} ${s.picks.topScorer}`
      );
    } else {
      console.log(`${s.nickname.padEnd(15)} ${s.email.padEnd(36)} [${s.status}]`);
    }
  }

  await client.end();
}

main().catch(console.error);
