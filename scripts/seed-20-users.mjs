import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

// 20 fake users with venezuelan-flavored nicknames
const USERS = [
  { nickname: "elmago26",      name: "Carlos Bermudez",   email: "elmago26@quinipanas.test" },
  { nickname: "panapasion",    name: "Jose Rivero",       email: "panapasion@quinipanas.test" },
  { nickname: "zurdomayor",    name: "Pedro Martinez",    email: "zurdomayor@quinipanas.test" },
  { nickname: "tigredel18",    name: "Andres Quintero",   email: "tigredel18@quinipanas.test" },
  { nickname: "capigol",       name: "Miguel Acosta",     email: "capigol@quinipanas.test" },
  { nickname: "wachiman7",     name: "Luis Fernandez",    email: "wachiman7@quinipanas.test" },
  { nickname: "caraota10",     name: "Diego Salazar",     email: "caraota10@quinipanas.test" },
  { nickname: "arepafc",       name: "Juan Camacho",      email: "arepafc@quinipanas.test" },
  { nickname: "catirelopez",   name: "Ricardo Lopez",     email: "catirelopez@quinipanas.test" },
  { nickname: "elprieto",      name: "Hector Prieto",     email: "elprieto@quinipanas.test" },
  { nickname: "brujovinotinto",name: "Rafael Mendoza",    email: "brujovinotinto@quinipanas.test" },
  { nickname: "golazo90",      name: "Sebastian Rondon",  email: "golazo90@quinipanas.test" },
  { nickname: "piratabolivar", name: "Oscar Diaz",        email: "piratabolivar@quinipanas.test" },
  { nickname: "masincon",      name: "Eduardo Pinto",     email: "masincon@quinipanas.test" },
  { nickname: "tridecimo",     name: "Andres Perdomo",    email: "tridecimo@quinipanas.test" },
  { nickname: "relampago7",    name: "Mateo Suarez",      email: "relampago7@quinipanas.test" },
  { nickname: "salomanguera",  name: "Pablo Gomez",       email: "salomanguera@quinipanas.test" },
  { nickname: "parchitafc",    name: "Daniel Vasquez",    email: "parchitafc@quinipanas.test" },
  { nickname: "titodelmal",    name: "Roberto Castillo",  email: "titodelmal@quinipanas.test" },
  { nickname: "cervezalleria", name: "Joaquin Rios",      email: "cervezalleria@quinipanas.test" },
];

// Tournament picks per user: distributed across realistic favorites
const TOURNAMENT_PICKS = [
  { champion: "Brazil",      runnerUp: "Argentina", thirdPlace: "France",     topScorer: "Vinicius Jr" },
  { champion: "Argentina",   runnerUp: "Brazil",    thirdPlace: "Spain",      topScorer: "Lionel Messi" },
  { champion: "France",      runnerUp: "England",   thirdPlace: "Brazil",     topScorer: "Kylian Mbappe" },
  { champion: "Brazil",      runnerUp: "France",    thirdPlace: "Argentina",  topScorer: "Vinicius Jr" },
  { champion: "Spain",       runnerUp: "Brazil",    thirdPlace: "Argentina",  topScorer: "Lamine Yamal" },
  { champion: "Argentina",   runnerUp: "France",    thirdPlace: "Brazil",     topScorer: "Lautaro Martinez" },
  { champion: "Brazil",      runnerUp: "Spain",     thirdPlace: "Portugal",   topScorer: "Vinicius Jr" },
  { champion: "England",     runnerUp: "Brazil",    thirdPlace: "Argentina",  topScorer: "Harry Kane" },
  { champion: "France",      runnerUp: "Argentina", thirdPlace: "Netherlands",topScorer: "Kylian Mbappe" },
  { champion: "Argentina",   runnerUp: "Brazil",    thirdPlace: "France",     topScorer: "Julian Alvarez" },
  { champion: "Brazil",      runnerUp: "Argentina", thirdPlace: "Germany",    topScorer: "Rodrygo" },
  { champion: "Germany",     runnerUp: "Brazil",    thirdPlace: "France",     topScorer: "Florian Wirtz" },
  { champion: "Portugal",    runnerUp: "Brazil",    thirdPlace: "Argentina",  topScorer: "Cristiano Ronaldo" },
  { champion: "Argentina",   runnerUp: "Spain",     thirdPlace: "Brazil",     topScorer: "Lionel Messi" },
  { champion: "Brazil",      runnerUp: "Portugal",  thirdPlace: "England",    topScorer: "Endrick" },
  { champion: "France",      runnerUp: "Brazil",    thirdPlace: "Spain",      topScorer: "Kylian Mbappe" },
  { champion: "Spain",       runnerUp: "Argentina", thirdPlace: "France",     topScorer: "Nico Williams" },
  { champion: "Brazil",      runnerUp: "Belgium",   thirdPlace: "Croatia",    topScorer: "Neymar" },
  { champion: "Netherlands", runnerUp: "Argentina", thirdPlace: "Brazil",     topScorer: "Cody Gakpo" },
  { champion: "Argentina",   runnerUp: "Brazil",    thirdPlace: "Uruguay",    topScorer: "Lionel Messi" },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genId() {
  return `seed20_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateCedula() {
  return `V-${randomInt(8000000, 28000000)}`;
}

function generatePhone() {
  const prefix = ["0412", "0414", "0424", "0416", "0426"][randomInt(0, 4)];
  return `${prefix}-${randomInt(2000000, 9999999)}`;
}

// Different scoring "personalities" - bias predictions per user
function predictScore(personality, idx) {
  switch (personality) {
    case "conservative":
      // Low scores, lots of 1-0, 1-1, 2-1
      return [randomInt(0, 2), randomInt(0, 2)];
    case "aggressive":
      // High scores, goleadas
      return [randomInt(1, 4), randomInt(0, 3)];
    case "draw-lover":
      // Many draws
      if (idx % 3 === 0) {
        const s = randomInt(0, 2);
        return [s, s];
      }
      return [randomInt(0, 2), randomInt(0, 2)];
    case "upset":
      // Random with low correlation
      return [randomInt(0, 3), randomInt(0, 3)];
    case "balanced":
    default:
      return [randomInt(0, 3), randomInt(0, 2)];
  }
}

const PERSONALITIES = [
  "conservative", "aggressive", "draw-lover", "upset", "balanced",
  "conservative", "balanced", "aggressive", "draw-lover", "upset",
  "balanced", "conservative", "aggressive", "balanced", "upset",
  "draw-lover", "conservative", "balanced", "aggressive", "upset",
];

async function main() {
  await client.connect();

  // Get all group stage matches
  const matchesRes = await client.query(
    `SELECT id FROM matches WHERE phase = 'GROUP_STAGE' ORDER BY "matchNumber"`
  );
  const matches = matchesRes.rows;
  console.log(`Found ${matches.length} group stage matches`);

  // Pre-load team IDs by name
  const teamsRes = await client.query(
    `SELECT id, name FROM teams`
  );
  const teamByName = new Map(teamsRes.rows.map((r) => [r.name, r.id]));

  const summary = [];

  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const picks = TOURNAMENT_PICKS[i];
    const personality = PERSONALITIES[i];

    // Skip if email/nickname already exists (idempotent re-run)
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

      // User
      await client.query(
        `INSERT INTO users (id, name, nickname, email, cedula, phone, credits, role,
          "terminosAceptados", "terminosVersion", "terminosFechaAceptacion",
          "privacidadAceptada", "privacidadFechaAceptacion",
          "ofertaBienvenidaUsada", "fechaPrimeraCompra",
          "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 0, 'PARTICIPANT',
          true, '1.0', NOW(),
          true, NOW(),
          true, NOW(),
          NOW(), NOW())`,
        [userId, u.name, u.nickname, u.email, cedula, phone]
      );

      // Quiniela (marked as test for easy cleanup later)
      await client.query(
        `INSERT INTO quinielas (id, name, "userId", "isTest", "isAi", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, false, NOW(), NOW())`,
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

      // Predictions for all group stage matches
      const values = [];
      const params = [];
      let p = 1;
      for (let m = 0; m < matches.length; m++) {
        const [hs, as] = predictScore(personality, m);
        const predId = genId();
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, false, NOW(), NOW())`);
        params.push(predId, userId, quinielaId, matches[m].id, hs, as);
      }
      await client.query(
        `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
         VALUES ${values.join(", ")}`,
        params
      );

      // Tournament predictions (CHAMPION, RUNNER_UP, THIRD_PLACE, TOP_SCORER)
      const tournamentEntries = [
        { type: "CHAMPION",     teamName: picks.champion,    playerName: null },
        { type: "RUNNER_UP",    teamName: picks.runnerUp,    playerName: null },
        { type: "THIRD_PLACE",  teamName: picks.thirdPlace,  playerName: null },
        { type: "TOP_SCORER",   teamName: null,              playerName: picks.topScorer },
      ];
      for (const t of tournamentEntries) {
        const tpId = genId();
        const teamId = t.teamName ? teamByName.get(t.teamName) ?? null : null;
        await client.query(
          `INSERT INTO tournament_predictions (id, "userId", "quinielaId", type, "teamId", "groupId", "playerName", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW(), NOW())`,
          [tpId, userId, quinielaId, t.type, teamId, t.playerName]
        );
      }

      await client.query("COMMIT");
      console.log(`OK ${(i + 1).toString().padStart(2, "0")}/20  ${u.nickname.padEnd(18)} ${u.email}`);
      summary.push({ ...u, status: "created", personality, picks });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`FAIL ${u.nickname}:`, err.message);
      summary.push({ ...u, status: "error", error: err.message });
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("Nickname           Email                                   Champion       Top Scorer");
  console.log("-".repeat(110));
  for (const s of summary) {
    if (s.status === "created") {
      console.log(
        `${s.nickname.padEnd(18)} ${s.email.padEnd(40)} ${s.picks.champion.padEnd(14)} ${s.picks.topScorer}`
      );
    } else {
      console.log(`${s.nickname.padEnd(18)} ${s.email.padEnd(40)} [${s.status}]`);
    }
  }

  await client.end();
}

main().catch(console.error);
