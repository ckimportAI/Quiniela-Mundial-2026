import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

const QUINIELA_NAME = "ckpaz15-1";

function genId() {
  return `seedp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Bias: home wins more often, big teams perform well
function biasedScore(homeTeam, awayTeam) {
  const TIER_1 = ["Brasil", "Argentina", "Francia", "España", "Alemania", "Inglaterra", "Portugal", "Países Bajos", "Italia"];
  const TIER_2 = ["México", "Bélgica", "Croacia", "Uruguay", "Colombia", "Estados Unidos", "Marruecos", "Japón"];

  function tier(t) {
    if (TIER_1.includes(t)) return 1;
    if (TIER_2.includes(t)) return 2;
    return 3;
  }
  const ht = tier(homeTeam);
  const at = tier(awayTeam);

  // diff: negative means home stronger
  const diff = ht - at;

  let hs, as;
  if (diff < 0) {
    // home stronger
    hs = 2 + Math.floor(Math.random() * 2);
    as = Math.floor(Math.random() * 2);
  } else if (diff > 0) {
    // away stronger
    hs = Math.floor(Math.random() * 2);
    as = 2 + Math.floor(Math.random() * 2);
  } else {
    // similar
    const draw = Math.random() < 0.3;
    if (draw) {
      const s = Math.floor(Math.random() * 3);
      hs = s; as = s;
    } else {
      hs = Math.floor(Math.random() * 3);
      as = Math.floor(Math.random() * 3);
      while (hs === as) as = Math.floor(Math.random() * 3);
    }
  }
  return [hs, as];
}

async function main() {
  await client.connect();

  const q = await client.query(
    `SELECT id, "userId" FROM quinielas WHERE name = $1`,
    [QUINIELA_NAME]
  );
  if (!q.rows.length) {
    console.error(`Quiniela ${QUINIELA_NAME} no encontrada`);
    process.exit(1);
  }
  const { id: quinielaId, userId } = q.rows[0];

  // Group-stage matches with team names
  const matches = await client.query(
    `SELECT m.id, m."matchNumber", ht.name AS home, at.name AS away
     FROM matches m
     JOIN teams ht ON m."homeTeamId" = ht.id
     JOIN teams at ON m."awayTeamId" = at.id
     WHERE m.phase = 'GROUP_STAGE'
     ORDER BY m."matchNumber"`
  );

  console.log(`Filling ${matches.rows.length} group stage predictions for ${QUINIELA_NAME}...`);
  let upserts = 0;
  for (const m of matches.rows) {
    const [hs, as] = biasedScore(m.home, m.away);
    await client.query(
      `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
       ON CONFLICT ("quinielaId", "matchId") DO UPDATE
         SET "homeScore" = EXCLUDED."homeScore",
             "awayScore" = EXCLUDED."awayScore",
             "updatedAt" = NOW()`,
      [genId(), userId, quinielaId, m.id, hs, as]
    );
    upserts++;
  }

  console.log(`Done. ${upserts} predictions upserted.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
