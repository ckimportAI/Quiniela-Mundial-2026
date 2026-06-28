import pg from "pg";
const { Client } = pg;

// Equinox scoring (5/3/1/0 base, no phase multipliers, no wildcards)
// General scoring (same base, group_stage uses x1)
const POINTS = { EXACT: 5, GANADOR: 3, PARCIAL: 1, WRONG: 0 };

function calcPoints(predH, predA, actH, actA) {
  if (predH === actH && predA === actA) return POINTS.EXACT;
  const pd = predH - predA;
  const ad = actH - actA;
  if (Math.sign(pd) === Math.sign(ad) && Math.sign(pd) !== 0) return POINTS.GANADOR;
  // Draws: predicted draw vs actual draw -> covered by exact above
  if (Math.sign(pd) === 0 && Math.sign(ad) === 0) return POINTS.GANADOR;
  if (predH === actH || predA === actA) return POINTS.PARCIAL;
  return POINTS.WRONG;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Get all finished matches
const finished = await client.query(
  `SELECT id, phase, "homeScore", "awayScore" FROM matches WHERE status='FINISHED' AND "homeScore" IS NOT NULL`
);

// Build per-quiniela aggregates
const agg = new Map(); // quinielaId -> {total, exact, ganador, parcial, group, ko}

for (const m of finished.rows) {
  const preds = await client.query(
    `SELECT p.id, p."quinielaId", p."homeScore", p."awayScore", q."ligaId"
     FROM predictions p JOIN quinielas q ON q.id=p."quinielaId"
     WHERE p."matchId"=$1`,
    [m.id]
  );

  for (const p of preds.rows) {
    const pts = calcPoints(p.homeScore, p.awayScore, m.homeScore, m.awayScore);
    if (!agg.has(p.quinielaId)) {
      agg.set(p.quinielaId, { total: 0, exact: 0, ganador: 0, parcial: 0, group: 0, ko: 0 });
    }
    const a = agg.get(p.quinielaId);
    a.total += pts;
    if (pts === 5) a.exact++;
    else if (pts === 3) a.ganador++;
    else if (pts === 1) a.parcial++;
    if (m.phase === "GROUP_STAGE") a.group += pts;
    else a.ko += pts;
  }
}

// Update all quiniela_scores; quinielas without preds for finished matches get 0
const allQ = await client.query(`SELECT id FROM quinielas`);
let updated = 0;
for (const q of allQ.rows) {
  const a = agg.get(q.id) || { total: 0, exact: 0, ganador: 0, parcial: 0, group: 0, ko: 0 };
  await client.query(
    `UPDATE quiniela_scores SET
       "totalPoints"=$1, "exactScores"=$2, "correctResults"=$3, "partialScores"=$4,
       "groupPoints"=$5, "knockoutPoints"=$6, "updatedAt"=NOW()
     WHERE "quinielaId"=$7`,
    [a.total, a.exact, a.ganador, a.parcial, a.group, a.ko, q.id]
  );
  updated++;
}

console.log(`Recalc done. ${finished.rows.length} finished matches, ${updated} quinielas updated.`);
await client.end();
