import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

const QUINIELA_NAME = "ckpaz15-1";

// Mirror of BRACKET_PAIRINGS for R32 only (matches 73-88)
const R32_PAIRINGS = {
  73: { home: "W:A", away: "R:B" },
  74: { home: "W:C", away: "3:D" },
  75: { home: "W:E", away: "R:F" },
  76: { home: "W:G", away: "3:H" },
  77: { home: "W:B", away: "R:A" },
  78: { home: "W:D", away: "3:C" },
  79: { home: "W:F", away: "R:E" },
  80: { home: "W:H", away: "3:G" },
  81: { home: "W:I", away: "R:J" },
  82: { home: "W:K", away: "3:L" },
  83: { home: "R:C", away: "R:D" },
  84: { home: "W:J", away: "3:I" },
  85: { home: "W:L", away: "3:K" },
  86: { home: "R:G", away: "R:H" },
  87: { home: "R:I", away: "R:L" },
  88: { home: "R:K", away: "3:F" },
};

function genId() {
  return `seedr32_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortStandings(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
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

  // Load all group stage matches with team info
  const gsMatches = await client.query(
    `SELECT m.id, m."homeTeamId", m."awayTeamId", g.name AS group_name
     FROM matches m JOIN groups g ON m."groupId" = g.id
     WHERE m.phase = 'GROUP_STAGE'`
  );

  // Load all group stage predictions for this quiniela
  const preds = await client.query(
    `SELECT "matchId", "homeScore", "awayScore"
     FROM predictions
     WHERE "quinielaId" = $1`,
    [quinielaId]
  );
  const predByMatch = new Map(preds.rows.map((p) => [p.matchId, p]));

  // Compute group standings
  const groupsAgg = new Map();
  for (const m of gsMatches.rows) {
    const groupName = m.group_name;
    if (!groupsAgg.has(groupName)) groupsAgg.set(groupName, new Map());
    const agg = groupsAgg.get(groupName);
    const seed = (teamId) => {
      if (!agg.has(teamId)) {
        agg.set(teamId, { teamId, groupName, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 });
      }
    };
    seed(m.homeTeamId);
    seed(m.awayTeamId);
    const p = predByMatch.get(m.id);
    if (!p) continue;
    const h = agg.get(m.homeTeamId);
    const a = agg.get(m.awayTeamId);
    h.played++; a.played++;
    h.goalsFor += p.homeScore; h.goalsAgainst += p.awayScore;
    a.goalsFor += p.awayScore; a.goalsAgainst += p.homeScore;
    if (p.homeScore > p.awayScore) h.points += 3;
    else if (p.homeScore < p.awayScore) a.points += 3;
    else { h.points++; a.points++; }
  }

  const standings = new Map();
  for (const [g, agg] of groupsAgg.entries()) {
    const list = Array.from(agg.values()).map((s) => ({ ...s, goalDiff: s.goalsFor - s.goalsAgainst }));
    list.sort(sortStandings);
    standings.set(g, list);
  }

  // Best 3rds
  const thirds = [];
  for (const list of standings.values()) if (list[2]) thirds.push(list[2]);
  thirds.sort(sortStandings);
  const bestThirds = new Map(thirds.slice(0, 8).map((s) => [s.groupName, s]));

  function resolveSlot(code) {
    if (code.startsWith("W:")) return standings.get(code.slice(2))?.[0]?.teamId ?? null;
    if (code.startsWith("R:")) return standings.get(code.slice(2))?.[1]?.teamId ?? null;
    if (code.startsWith("3:")) return bestThirds.get(code.slice(2))?.teamId ?? null;
    return null;
  }

  // Load R32 matches from DB
  const r32 = await client.query(
    `SELECT id, "matchNumber" FROM matches WHERE phase = 'ROUND_OF_32' ORDER BY "matchNumber"`
  );

  console.log(`\nResolving R32 (${r32.rows.length} matches) for ${QUINIELA_NAME}...`);

  let saved = 0;
  for (const m of r32.rows) {
    const cfg = R32_PAIRINGS[m.matchNumber];
    if (!cfg) continue;
    const homeTeamId = resolveSlot(cfg.home);
    const awayTeamId = resolveSlot(cfg.away);
    if (!homeTeamId || !awayTeamId) {
      console.log(`  M${m.matchNumber}: TBD (${cfg.home} vs ${cfg.away})`);
      continue;
    }
    // Random KO score (no ties to keep next round populated)
    let hs, as;
    do {
      hs = Math.floor(Math.random() * 4);
      as = Math.floor(Math.random() * 3);
    } while (hs === as);

    // Get team names for log
    const t = await client.query(
      `SELECT id, name FROM teams WHERE id IN ($1, $2)`,
      [homeTeamId, awayTeamId]
    );
    const nameMap = new Map(t.rows.map((r) => [r.id, r.name]));

    await client.query(
      `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "predictedHomeTeamId", "predictedAwayTeamId", "isWildcard", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
       ON CONFLICT ("quinielaId", "matchId") DO UPDATE
         SET "homeScore" = EXCLUDED."homeScore",
             "awayScore" = EXCLUDED."awayScore",
             "predictedHomeTeamId" = EXCLUDED."predictedHomeTeamId",
             "predictedAwayTeamId" = EXCLUDED."predictedAwayTeamId",
             "updatedAt" = NOW()`,
      [genId(), userId, quinielaId, m.id, hs, as, homeTeamId, awayTeamId]
    );

    console.log(
      `  M${m.matchNumber}: ${nameMap.get(homeTeamId)} ${hs} - ${as} ${nameMap.get(awayTeamId)}`
    );
    saved++;
  }

  console.log(`\nDone. ${saved}/${r32.rows.length} R32 predictions saved.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
