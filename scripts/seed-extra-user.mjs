import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

// One real-style user, two quinielas with different champion picks
const USER = {
  nickname: "europana",
  name: "Andres Villamizar",
  email: "europana@quinipanas.test",
};

// Quiniela 1: Portugal champion
// Quiniela 2: Netherlands champion
const QUINIELAS = [
  {
    suffix: 1,
    picks: {
      champion: "Portugal",
      runnerUp: "Brazil",
      thirdPlace: "Argentina",
      topScorer: "Cristiano Ronaldo",
    },
    personality: "balanced",
  },
  {
    suffix: 2,
    picks: {
      champion: "Netherlands",
      runnerUp: "France",
      thirdPlace: "Brazil",
      topScorer: "Cody Gakpo",
    },
    personality: "aggressive",
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genId() {
  return `seedX_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateCedula() {
  return `V-${randomInt(8000000, 28000000)}`;
}

function generatePhone() {
  const prefix = ["0412", "0414", "0424", "0416", "0426"][randomInt(0, 4)];
  return `${prefix}-${randomInt(2000000, 9999999)}`;
}

function predictScore(personality) {
  switch (personality) {
    case "conservative":
      return [randomInt(0, 2), randomInt(0, 2)];
    case "aggressive":
      return [randomInt(1, 4), randomInt(0, 3)];
    case "draw-lover":
      return [randomInt(0, 2), randomInt(0, 2)];
    case "balanced":
    default:
      return [randomInt(0, 3), randomInt(0, 2)];
  }
}

async function main() {
  await client.connect();

  // Group stage matches
  const matchesRes = await client.query(
    `SELECT id FROM matches WHERE phase = 'GROUP_STAGE' ORDER BY "matchNumber"`
  );
  const matches = matchesRes.rows;
  console.log(`Found ${matches.length} group stage matches`);

  // Teams by name
  const teamsRes = await client.query(`SELECT id, name FROM teams`);
  const teamByName = new Map(teamsRes.rows.map((r) => [r.name, r.id]));

  // Verify both champions exist as teams
  for (const q of QUINIELAS) {
    if (!teamByName.has(q.picks.champion)) {
      console.error(`Team "${q.picks.champion}" not found in DB`);
      process.exit(1);
    }
  }

  // --- USER (idempotent: skip if exists) ---
  let userId;
  const existingUser = await client.query(
    `SELECT id FROM users WHERE email = $1 OR nickname = $2`,
    [USER.email, USER.nickname]
  );
  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    console.log(`User ${USER.nickname} already exists - reusing id=${userId}`);
  } else {
    userId = genId();
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
      [userId, USER.name, USER.nickname, USER.email, generateCedula(), generatePhone()]
    );
    console.log(`Created user ${USER.nickname} (${USER.email})`);
  }

  // --- QUINIELAS ---
  for (const q of QUINIELAS) {
    const qName = `${USER.nickname}-${q.suffix}`;
    const existingQ = await client.query(
      `SELECT id FROM quinielas WHERE "userId" = $1 AND name = $2`,
      [userId, qName]
    );
    if (existingQ.rows.length > 0) {
      console.log(`  Quiniela ${qName} already exists - skipping`);
      continue;
    }

    const quinielaId = genId();
    const scoreId = genId();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO quinielas (id, name, "userId", "isTest", "isAi", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, false, false, NOW(), NOW())`,
        [quinielaId, qName, userId]
      );

      await client.query(
        `INSERT INTO quiniela_scores (id, "quinielaId", "totalPoints", "exactScores",
          "correctResults", "partialScores", "groupPoints", "knockoutPoints",
          "tournamentPoints", "wildcardPoints", rank, "updatedAt")
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NOW())`,
        [scoreId, quinielaId]
      );

      // Predictions
      const values = [];
      const params = [];
      let p = 1;
      for (let m = 0; m < matches.length; m++) {
        const [hs, as] = predictScore(q.personality);
        values.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, false, NOW(), NOW())`
        );
        params.push(genId(), userId, quinielaId, matches[m].id, hs, as);
      }
      await client.query(
        `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
         VALUES ${values.join(", ")}`,
        params
      );

      // Tournament predictions
      const tournamentEntries = [
        { type: "CHAMPION",    teamName: q.picks.champion,    playerName: null },
        { type: "RUNNER_UP",   teamName: q.picks.runnerUp,    playerName: null },
        { type: "THIRD_PLACE", teamName: q.picks.thirdPlace,  playerName: null },
        { type: "TOP_SCORER",  teamName: null,                playerName: q.picks.topScorer },
      ];
      for (const t of tournamentEntries) {
        await client.query(
          `INSERT INTO tournament_predictions (id, "userId", "quinielaId", type, "teamId", "groupId", "playerName", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW(), NOW())`,
          [genId(), userId, quinielaId, t.type, t.teamName ? teamByName.get(t.teamName) : null, t.playerName]
        );
      }

      await client.query("COMMIT");
      console.log(
        `  OK ${qName.padEnd(20)} champion=${q.picks.champion.padEnd(12)} topScorer=${q.picks.topScorer}`
      );
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  FAIL ${qName}:`, err.message);
    }
  }

  console.log("\nDone.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
