import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026",
});

// Scoring logic (mirrors scoring-constants.ts)
const POINTS = { EXACT_SCORE: 5, CORRECT_RESULT: 3, PARTIAL_SCORE: 1, WRONG: 0 };
const PHASE_MULTIPLIERS = {
  GROUP_STAGE: 1, ROUND_OF_32: 1.5, ROUND_OF_16: 1.5,
  QUARTER_FINALS: 2, SEMI_FINALS: 2.5, THIRD_PLACE: 3, FINAL: 3,
};
const WILDCARD_MULTIPLIER = 2;

function calculateMatchPoints(pred, actual, phase, isWildcard) {
  const multiplier = PHASE_MULTIPLIERS[phase] || 1;
  let basePoints = POINTS.WRONG;
  const predDiff = pred.homeScore - pred.awayScore;
  const actualDiff = actual.homeScore - actual.awayScore;

  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    basePoints = POINTS.EXACT_SCORE;
  } else if (Math.sign(predDiff) === Math.sign(actualDiff)) {
    basePoints = POINTS.CORRECT_RESULT;
  } else if (pred.homeScore === actual.homeScore || pred.awayScore === actual.awayScore) {
    basePoints = POINTS.PARTIAL_SCORE;
  }

  let points = Math.round(basePoints * multiplier);
  if (isWildcard && points > 0) points *= WILDCARD_MULTIPLIER;
  return points;
}

// ---- CONFIG: Set match results here ----
const results = [
  { matchNumber: 1, homeScore: 2, awayScore: 1 }, // Mexico 2-1 South Africa
];
// ----------------------------------------

async function main() {
  await client.connect();

  for (const result of results) {
    // Get match
    const matchRes = await client.query(
      `SELECT m.id, m.phase, h.name as home, a.name as away
       FROM matches m
       LEFT JOIN teams h ON m."homeTeamId" = h.id
       LEFT JOIN teams a ON m."awayTeamId" = a.id
       WHERE m."matchNumber" = $1`,
      [result.matchNumber]
    );

    if (matchRes.rows.length === 0) {
      console.log(`Match #${result.matchNumber} not found`);
      continue;
    }

    const match = matchRes.rows[0];
    console.log(`\n=== #${result.matchNumber}: ${match.home} ${result.homeScore} - ${result.awayScore} ${match.away} ===`);

    // Update match result
    await client.query(
      `UPDATE matches SET "homeScore" = $1, "awayScore" = $2, status = 'FINISHED', locked = true WHERE id = $3`,
      [result.homeScore, result.awayScore, match.id]
    );

    // Get all predictions for this match
    const predsRes = await client.query(
      `SELECT id, "quinielaId", "homeScore", "awayScore", "isWildcard" FROM predictions WHERE "matchId" = $1`,
      [match.id]
    );

    console.log(`Processing ${predsRes.rows.length} predictions...`);

    let exact = 0, correct = 0, partial = 0, wrong = 0;

    for (const pred of predsRes.rows) {
      const points = calculateMatchPoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        { homeScore: result.homeScore, awayScore: result.awayScore },
        match.phase,
        pred.isWildcard
      );

      await client.query(
        `UPDATE predictions SET points = $1 WHERE id = $2`,
        [points, pred.id]
      );

      if (points >= 5) exact++;
      else if (points >= 3) correct++;
      else if (points >= 1) partial++;
      else wrong++;
    }

    console.log(`Results: ${exact} exact, ${correct} correct result, ${partial} partial, ${wrong} wrong`);
  }

  // Now recalculate all quiniela scores
  console.log("\nRecalculating all quiniela scores...");

  const quinielas = await client.query(`SELECT id FROM quinielas`);

  for (const q of quinielas.rows) {
    // Get all scored predictions
    const preds = await client.query(
      `SELECT p.points, p."isWildcard", m.phase
       FROM predictions p
       JOIN matches m ON p."matchId" = m.id
       WHERE p."quinielaId" = $1 AND p.points IS NOT NULL`,
      [q.id]
    );

    let totalPoints = 0, exactScores = 0, correctResults = 0, partialScores = 0;
    let groupPoints = 0, knockoutPoints = 0, wildcardPoints = 0;

    for (const p of preds.rows) {
      const pts = p.points || 0;
      totalPoints += pts;

      if (pts >= 5) exactScores++;
      else if (pts >= 3) correctResults++;
      else if (pts >= 1) partialScores++;

      if (p.phase === "GROUP_STAGE") groupPoints += pts;
      else knockoutPoints += pts;

      if (p.isWildcard && pts > 0) wildcardPoints += pts / 2;
    }

    // Upsert score
    const existing = await client.query(
      `SELECT id FROM quiniela_scores WHERE "quinielaId" = $1`, [q.id]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE quiniela_scores SET "totalPoints" = $1, "exactScores" = $2, "correctResults" = $3, "partialScores" = $4, "groupPoints" = $5, "knockoutPoints" = $6, "wildcardPoints" = $7, "updatedAt" = NOW() WHERE "quinielaId" = $8`,
        [totalPoints, exactScores, correctResults, partialScores, groupPoints, knockoutPoints, Math.round(wildcardPoints), q.id]
      );
    } else {
      await client.query(
        `INSERT INTO quiniela_scores (id, "quinielaId", "totalPoints", "exactScores", "correctResults", "partialScores", "groupPoints", "knockoutPoints", "tournamentPoints", "wildcardPoints", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 0, $8, NOW())`,
        [q.id, totalPoints, exactScores, correctResults, partialScores, groupPoints, knockoutPoints, Math.round(wildcardPoints)]
      );
    }
  }

  // Update ranks
  await client.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY "totalPoints" DESC, "exactScores" DESC, "correctResults" DESC) as new_rank
      FROM quiniela_scores
    )
    UPDATE quiniela_scores SET rank = ranked.new_rank
    FROM ranked WHERE quiniela_scores.id = ranked.id
  `);

  // Show top 10
  const top = await client.query(`
    SELECT qs.rank, qs."totalPoints", qs."exactScores", qs."correctResults", qs."partialScores", q.name, u.nickname
    FROM quiniela_scores qs
    JOIN quinielas q ON qs."quinielaId" = q.id
    JOIN users u ON q."userId" = u.id
    ORDER BY qs.rank
    LIMIT 10
  `);

  console.log("\n=== TOP 10 RANKING ===");
  for (const row of top.rows) {
    console.log(`#${row.rank} | ${row.nickname} (${row.name}) | ${row.totalPoints} pts | E:${row.exactScores} A:${row.correctResults} P:${row.partialScores}`);
  }

  await client.end();
}

main().catch(console.error);
