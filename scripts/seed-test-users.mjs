import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026",
});

const firstNames = [
  "Carlos", "Maria", "Jose", "Ana", "Pedro", "Laura", "Miguel", "Sofia",
  "Luis", "Carmen", "Diego", "Isabella", "Juan", "Valentina", "Andres",
  "Gabriela", "Daniel", "Camila", "Fernando", "Lucia", "Ricardo", "Paula",
  "Alejandro", "Daniela", "Roberto", "Mariana", "Eduardo", "Andrea",
  "Sebastian", "Nicole", "Mateo", "Valeria", "Santiago", "Natalia",
  "Nicolas", "Fernanda", "Joaquin", "Carolina", "Emilio", "Adriana",
  "Rafael", "Monica", "Pablo", "Elena", "Oscar", "Rosa", "Hector",
  "Patricia", "Ivan", "Teresa",
];

const lastNames = [
  "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Hernandez",
  "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez",
  "Diaz", "Cruz", "Morales", "Reyes", "Gutierrez", "Ortiz", "Ramos",
  "Chavez", "Romero", "Castillo", "Jimenez", "Alvarez", "Ruiz", "Mendoza",
  "Vargas", "Contreras", "Medina", "Castro", "Rojas", "Guerrero", "Nunez",
  "Herrera", "Silva", "Pena", "Soto", "Delgado", "Vega", "Rios", "Campos",
  "Fuentes", "Acosta", "Cardenas", "Leon", "Navarro", "Molina", "Aguilar",
  "Dominguez",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCedula() {
  return `V-${randomInt(5000000, 30000000)}`;
}

function generatePhone() {
  const prefix = ["0412", "0414", "0424", "0416", "0426"][randomInt(0, 4)];
  return `${prefix}-${randomInt(1000000, 9999999)}`;
}

function genId() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  await client.connect();

  // Get all group stage matches
  const matchesRes = await client.query(
    `SELECT id, "homeTeamId", "awayTeamId" FROM matches WHERE phase = 'GROUP_STAGE' ORDER BY "matchNumber"`
  );
  const matches = matchesRes.rows;
  console.log(`Found ${matches.length} group stage matches`);

  const usedNicknames = new Set();
  let created = 0;

  for (let i = 0; i < 100; i++) {
    const firstName = firstNames[randomInt(0, firstNames.length - 1)];
    const lastName = lastNames[randomInt(0, lastNames.length - 1)];
    const fullName = `${firstName} ${lastName}`;

    let nickname;
    do {
      nickname = `${firstName.toLowerCase()}${randomInt(1, 9999)}`;
    } while (usedNicknames.has(nickname));
    usedNicknames.add(nickname);

    const email = `${nickname}@test.com`;
    const cedula = generateCedula();
    const phone = generatePhone();
    const userId = genId();
    const quinielaId = genId();
    const scoreId = genId();

    try {
      // Create user
      await client.query(
        `INSERT INTO users (id, name, nickname, email, cedula, phone, credits, role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 10, 'PARTICIPANT', NOW(), NOW())`,
        [userId, fullName, nickname, email, cedula, phone]
      );

      // Create quiniela
      await client.query(
        `INSERT INTO quinielas (id, name, "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [quinielaId, `${nickname}-1`, userId]
      );

      // Create random predictions for all group stage matches
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const match of matches) {
        const homeScore = randomInt(0, 4);
        const awayScore = randomInt(0, 4);
        const predId = genId();

        values.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, false, NOW(), NOW())`
        );
        params.push(predId, userId, quinielaId, match.id, homeScore, awayScore);
      }

      await client.query(
        `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
         VALUES ${values.join(", ")}`,
        params
      );

      // Create quiniela score with random points
      const totalPoints = randomInt(10, 200);
      const exactScores = randomInt(0, Math.min(10, Math.floor(totalPoints / 5)));
      const correctResults = randomInt(5, Math.min(30, Math.floor(totalPoints / 3)));
      const partialScores = randomInt(3, 20);

      await client.query(
        `INSERT INTO quiniela_scores (id, "quinielaId", "totalPoints", "exactScores", "correctResults", "partialScores", "groupPoints", "knockoutPoints", "tournamentPoints", "wildcardPoints", rank, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $3, 0, 0, 0, NULL, NOW())`,
        [scoreId, quinielaId, totalPoints, exactScores, correctResults, partialScores]
      );

      created++;
      if (created % 10 === 0) {
        console.log(`Created ${created}/100 users...`);
      }
    } catch (err) {
      console.error(`Error creating user ${nickname}:`, err.message);
    }
  }

  // Update ranks
  await client.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY "totalPoints" DESC) as new_rank
      FROM quiniela_scores
    )
    UPDATE quiniela_scores SET rank = ranked.new_rank
    FROM ranked WHERE quiniela_scores.id = ranked.id
  `);

  // Stats
  const users = await client.query("SELECT COUNT(*) FROM users");
  const quinielas = await client.query("SELECT COUNT(*) FROM quinielas");
  const preds = await client.query("SELECT COUNT(*) FROM predictions");

  console.log(`\nDone! Created ${created} test users.`);
  console.log(`Total users: ${users.rows[0].count}`);
  console.log(`Total quinielas: ${quinielas.rows[0].count}`);
  console.log(`Total predictions: ${preds.rows[0].count}`);

  await client.end();
}

main().catch(console.error);
