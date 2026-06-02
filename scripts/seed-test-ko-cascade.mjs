import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

const QUINIELA_NAME = "ckpaz15-1";

// Mirror BRACKET_PAIRINGS for downstream phases (R16+)
const PAIRINGS = {
  // R16
  89: { home: "WM:73", away: "WM:74" },
  90: { home: "WM:75", away: "WM:76" },
  91: { home: "WM:77", away: "WM:78" },
  92: { home: "WM:79", away: "WM:80" },
  93: { home: "WM:81", away: "WM:82" },
  94: { home: "WM:83", away: "WM:84" },
  95: { home: "WM:85", away: "WM:86" },
  96: { home: "WM:87", away: "WM:88" },
  // QF
  97: { home: "WM:89", away: "WM:90" },
  98: { home: "WM:91", away: "WM:92" },
  99: { home: "WM:93", away: "WM:94" },
  100: { home: "WM:95", away: "WM:96" },
  // SF
  101: { home: "WM:97", away: "WM:98" },
  102: { home: "WM:99", away: "WM:100" },
  // 3rd place
  103: { home: "LM:101", away: "LM:102" },
  // Final
  104: { home: "WM:101", away: "WM:102" },
};

// Process matches in this order (by matchNumber)
const ORDERED_MATCH_NUMBERS = Object.keys(PAIRINGS).map(Number).sort((a, b) => a - b);

function genId() {
  return `seedko_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function randScore() {
  // Avoid ties so winners propagate cleanly
  let hs, as;
  do {
    hs = Math.floor(Math.random() * 4);
    as = Math.floor(Math.random() * 3);
  } while (hs === as);
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

  // Load existing predictions for THIS quiniela (need them to determine winners/losers)
  // Build a Map: matchNumber -> { homeScore, awayScore, predictedHomeTeamId, predictedAwayTeamId }
  const preds = await client.query(
    `SELECT m."matchNumber", p."matchId", p."homeScore", p."awayScore",
            p."predictedHomeTeamId", p."predictedAwayTeamId"
     FROM predictions p
     JOIN matches m ON p."matchId" = m.id
     WHERE p."quinielaId" = $1`,
    [quinielaId]
  );
  const predByMatchNumber = new Map(
    preds.rows.map((p) => [p.matchNumber, p])
  );

  // Load DB matches for KO phases (89-104) so we can upsert by matchId
  const matchRows = await client.query(
    `SELECT id, "matchNumber" FROM matches WHERE "matchNumber" >= 89 AND "matchNumber" <= 104 ORDER BY "matchNumber"`
  );
  const matchIdByNumber = new Map(matchRows.rows.map((m) => [m.matchNumber, m.id]));

  // Helper to look up team names for log
  async function teamName(teamId) {
    if (!teamId) return "?";
    const r = await client.query(`SELECT name FROM teams WHERE id = $1`, [teamId]);
    return r.rows[0]?.name ?? teamId;
  }

  function winnerOf(matchNumber) {
    const p = predByMatchNumber.get(matchNumber);
    if (!p) return null;
    if (!p.predictedHomeTeamId || !p.predictedAwayTeamId) return null;
    if (p.homeScore > p.awayScore) return p.predictedHomeTeamId;
    if (p.awayScore > p.homeScore) return p.predictedAwayTeamId;
    return null;
  }

  function loserOf(matchNumber) {
    const p = predByMatchNumber.get(matchNumber);
    if (!p) return null;
    if (!p.predictedHomeTeamId || !p.predictedAwayTeamId) return null;
    if (p.homeScore > p.awayScore) return p.predictedAwayTeamId;
    if (p.awayScore > p.homeScore) return p.predictedHomeTeamId;
    return null;
  }

  function resolveSlot(code) {
    if (code.startsWith("WM:")) return winnerOf(parseInt(code.slice(3), 10));
    if (code.startsWith("LM:")) return loserOf(parseInt(code.slice(3), 10));
    return null;
  }

  console.log(`\nCascading KO from R16 -> Final for ${QUINIELA_NAME}...`);
  let saved = 0;
  for (const matchNumber of ORDERED_MATCH_NUMBERS) {
    const cfg = PAIRINGS[matchNumber];
    const homeTeamId = resolveSlot(cfg.home);
    const awayTeamId = resolveSlot(cfg.away);
    if (!homeTeamId || !awayTeamId) {
      console.log(`  M${matchNumber}: TBD (${cfg.home} vs ${cfg.away})`);
      continue;
    }
    const [hs, as] = randScore();
    const matchId = matchIdByNumber.get(matchNumber);

    await client.query(
      `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "predictedHomeTeamId", "predictedAwayTeamId", "isWildcard", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
       ON CONFLICT ("quinielaId", "matchId") DO UPDATE
         SET "homeScore" = EXCLUDED."homeScore",
             "awayScore" = EXCLUDED."awayScore",
             "predictedHomeTeamId" = EXCLUDED."predictedHomeTeamId",
             "predictedAwayTeamId" = EXCLUDED."predictedAwayTeamId",
             "updatedAt" = NOW()`,
      [genId(), userId, quinielaId, matchId, hs, as, homeTeamId, awayTeamId]
    );

    // Update local map so downstream resolutions see this match
    predByMatchNumber.set(matchNumber, {
      matchNumber,
      matchId,
      homeScore: hs,
      awayScore: as,
      predictedHomeTeamId: homeTeamId,
      predictedAwayTeamId: awayTeamId,
    });

    const hn = await teamName(homeTeamId);
    const an = await teamName(awayTeamId);
    console.log(`  M${matchNumber}: ${hn} ${hs} - ${as} ${an}`);
    saved++;
  }

  console.log(`\nDone. ${saved}/${ORDERED_MATCH_NUMBERS.length} KO predictions saved.`);

  // Also auto-set TOP_SCORER + CHAMPION/RUNNER_UP/THIRD_PLACE tournament picks based on final
  const finalPred = predByMatchNumber.get(104);
  const thirdPred = predByMatchNumber.get(103);
  if (finalPred && finalPred.predictedHomeTeamId && finalPred.predictedAwayTeamId) {
    const championId =
      finalPred.homeScore > finalPred.awayScore
        ? finalPred.predictedHomeTeamId
        : finalPred.predictedAwayTeamId;
    const runnerUpId =
      finalPred.homeScore > finalPred.awayScore
        ? finalPred.predictedAwayTeamId
        : finalPred.predictedHomeTeamId;
    let thirdId = null;
    if (thirdPred && thirdPred.predictedHomeTeamId && thirdPred.predictedAwayTeamId) {
      thirdId =
        thirdPred.homeScore > thirdPred.awayScore
          ? thirdPred.predictedHomeTeamId
          : thirdPred.predictedAwayTeamId;
    }

    // Remove existing
    await client.query(
      `DELETE FROM tournament_predictions WHERE "quinielaId" = $1 AND "groupId" IS NULL`,
      [quinielaId]
    );

    const picks = [
      { type: "CHAMPION", teamId: championId, playerName: null },
      { type: "RUNNER_UP", teamId: runnerUpId, playerName: null },
      { type: "THIRD_PLACE", teamId: thirdId, playerName: null },
      { type: "TOP_SCORER", teamId: null, playerName: "Kylian Mbappe" },
    ];
    for (const p of picks) {
      if (!p.teamId && !p.playerName) continue;
      await client.query(
        `INSERT INTO tournament_predictions (id, "userId", "quinielaId", type, "teamId", "groupId", "playerName", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW(), NOW())`,
        [genId(), userId, quinielaId, p.type, p.teamId, p.playerName]
      );
    }

    const champName = await teamName(championId);
    const runnerName = await teamName(runnerUpId);
    const thirdName = thirdId ? await teamName(thirdId) : "?";
    console.log(`\nTournament picks set:`);
    console.log(`  Champion:   ${champName}`);
    console.log(`  RunnerUp:   ${runnerName}`);
    console.log(`  3rd Place:  ${thirdName}`);
    console.log(`  Top Scorer: Kylian Mbappe`);
  }

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
