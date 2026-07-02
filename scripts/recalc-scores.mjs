import pg from "pg";
const { Client } = pg;

const POINTS = { EXACT: 5, GANADOR: 3, PARCIAL: 1, WRONG: 0 };
const PHASE_MULTIPLIERS = {
  GROUP_STAGE: 1,
  ROUND_OF_32: 1.5,
  ROUND_OF_16: 1.5,
  QUARTER_FINALS: 2,
  SEMI_FINALS: 2.5,
  THIRD_PLACE: 2,
  FINAL: 3,
};

function basePoints(predH, predA, actH, actA) {
  if (predH === actH && predA === actA) return POINTS.EXACT;
  const pd = Math.sign(predH - predA);
  const ad = Math.sign(actH - actA);
  if (pd === ad) return POINTS.GANADOR;
  if (predH === actH || predA === actA) return POINTS.PARCIAL;
  return POINTS.WRONG;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Load liga config (usePhaseMultipliers, wildcardsEnabled) by quinielaId
const ligas = await client.query(
  `SELECT id, "usePhaseMultipliers", "wildcardsEnabled" FROM ligas`
);
const ligaMultMap = new Map(ligas.rows.map((l) => [l.id, l.usePhaseMultipliers]));
const ligaWildMap = new Map(ligas.rows.map((l) => [l.id, l.wildcardsEnabled]));

const quinielasInfo = await client.query(
  `SELECT id, "ligaId" FROM quinielas`
);
const quinielaLiga = new Map(
  quinielasInfo.rows.map((q) => [q.id, q.ligaId])
);

const finished = await client.query(
  `SELECT id, phase, "homeScore", "awayScore", "regulationHomeScore", "regulationAwayScore" FROM matches WHERE status='FINISHED' AND "homeScore" IS NOT NULL`
);

const agg = new Map();

for (const m of finished.rows) {
  const preds = await client.query(
    `SELECT id, "quinielaId", "homeScore", "awayScore", "isWildcard"
     FROM predictions WHERE "matchId"=$1`,
    [m.id]
  );

  for (const p of preds.rows) {
    const ligaId = quinielaLiga.get(p.quinielaId);
    const useMult = ligaId ? ligaMultMap.get(ligaId) !== false : true;
    const wildEnabled = ligaId ? ligaWildMap.get(ligaId) !== false : true;
    // Equinox (usePhaseMultipliers=false) scores against the 90-min score
    // for KO matches; General uses the full result (incl. extra time).
    const useRegulation =
      !useMult && m.phase !== "GROUP_STAGE" && m.regulationHomeScore != null;
    const actH = useRegulation ? m.regulationHomeScore : m.homeScore;
    const actA = useRegulation ? m.regulationAwayScore : m.awayScore;
    const base = basePoints(p.homeScore, p.awayScore, actH, actA);
    const mult = useMult ? PHASE_MULTIPLIERS[m.phase] ?? 1 : 1;
    let pts = base * mult;
    if (wildEnabled && p.isWildcard && pts > 0) pts *= 2;

    // Persist points per prediction
    await client.query(
      `UPDATE predictions SET points=$1, "updatedAt"=NOW() WHERE id=$2`,
      [pts, p.id]
    );

    if (!agg.has(p.quinielaId)) {
      agg.set(p.quinielaId, {
        total: 0,
        exact: 0,
        ganador: 0,
        parcial: 0,
        group: 0,
        ko: 0,
        wildcard: 0,
      });
    }
    const a = agg.get(p.quinielaId);
    a.total += pts;
    if (base === POINTS.EXACT) a.exact++;
    else if (base === POINTS.GANADOR) a.ganador++;
    else if (base === POINTS.PARCIAL) a.parcial++;
    if (m.phase === "GROUP_STAGE") a.group += pts;
    else a.ko += pts;
    if (p.isWildcard) a.wildcard += pts;
  }
}

const allQ = await client.query(`SELECT id FROM quinielas`);
let updated = 0;
for (const q of allQ.rows) {
  const a = agg.get(q.id) || {
    total: 0,
    exact: 0,
    ganador: 0,
    parcial: 0,
    group: 0,
    ko: 0,
    wildcard: 0,
  };
  await client.query(
    `UPDATE quiniela_scores SET
       "totalPoints"=$1, "exactScores"=$2, "correctResults"=$3, "partialScores"=$4,
       "groupPoints"=$5, "knockoutPoints"=$6, "wildcardPoints"=$7, "updatedAt"=NOW()
     WHERE "quinielaId"=$8`,
    [a.total, a.exact, a.ganador, a.parcial, a.group, a.ko, a.wildcard, q.id]
  );
  updated++;
}

console.log(`Recalc done. ${finished.rows.length} finished matches, ${updated} quinielas updated.`);
await client.end();
