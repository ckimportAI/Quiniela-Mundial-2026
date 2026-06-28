import pg from "pg";
const { Client } = pg;

// Slot mapping by matchNumber (mirrors src/lib/bracket.ts BRACKET_PAIRINGS)
const PAIRINGS = {
  // R32
  73: { home: "W:A", away: "R:B" },
  74: { home: "W:C", away: "3B:1" },
  75: { home: "W:E", away: "R:F" },
  76: { home: "W:G", away: "3B:2" },
  77: { home: "W:B", away: "R:A" },
  78: { home: "W:D", away: "3B:3" },
  79: { home: "W:F", away: "R:E" },
  80: { home: "W:H", away: "3B:4" },
  81: { home: "W:I", away: "R:J" },
  82: { home: "W:K", away: "3B:5" },
  83: { home: "R:C", away: "R:D" },
  84: { home: "W:J", away: "3B:6" },
  85: { home: "W:L", away: "3B:7" },
  86: { home: "R:G", away: "R:H" },
  87: { home: "R:I", away: "R:L" },
  88: { home: "R:K", away: "3B:8" },
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
  // 3rd
  103: { home: "LM:101", away: "LM:102" },
  // Final
  104: { home: "WM:101", away: "WM:102" },
};

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Compute standings per group from FINISHED group matches
const groups = await client.query(
  `SELECT id, name FROM groups ORDER BY name`
);
const groupMatches = await client.query(
  `SELECT m.id, m."groupId", m."homeTeamId", m."awayTeamId", m."homeScore", m."awayScore", g.name as group_name
   FROM matches m JOIN groups g ON g.id = m."groupId"
   WHERE m.phase = 'GROUP_STAGE' AND m.status = 'FINISHED'`
);

const standings = new Map(); // groupName -> array sorted best first

for (const g of groups.rows) {
  const teams = new Map();
  const matches = groupMatches.rows.filter((m) => m.groupId === g.id);
  for (const m of matches) {
    if (!teams.has(m.homeTeamId)) teams.set(m.homeTeamId, { teamId: m.homeTeamId, points: 0, gf: 0, ga: 0, gd: 0 });
    if (!teams.has(m.awayTeamId)) teams.set(m.awayTeamId, { teamId: m.awayTeamId, points: 0, gf: 0, ga: 0, gd: 0 });
    const home = teams.get(m.homeTeamId);
    const away = teams.get(m.awayTeamId);
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) home.points += 3;
    else if (m.homeScore < m.awayScore) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }
  const arr = Array.from(teams.values()).map((t) => ({ ...t, gd: t.gf - t.ga }));
  arr.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  standings.set(g.name, arr);
}

// 2. Compute best 3rds (top 8 across all 12 groups)
const thirds = [];
for (const [groupName, arr] of standings.entries()) {
  if (arr[2]) thirds.push({ ...arr[2], groupName });
}
thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
const bestThirds = thirds.slice(0, 8); // index 0 = 3B:1 best

console.log("--- Group Standings ---");
for (const [g, arr] of standings.entries()) {
  console.log(`Group ${g}:`, arr.slice(0, 4).map((t) => `${t.teamId.slice(-6)}=${t.points}pts/${t.gd}gd`).join(" | "));
}
console.log("\n--- Best 3rds ---");
bestThirds.forEach((t, i) => console.log(`3B:${i + 1} = ${t.teamId.slice(-6)} (group ${t.groupName}, ${t.points}pts/${t.gd}gd)`));

// 3. Resolve each KO match slot
function resolveSlot(code, resolvedMatches) {
  if (code.startsWith("W:")) {
    const group = code.slice(2);
    return standings.get(group)?.[0]?.teamId ?? null;
  }
  if (code.startsWith("R:")) {
    const group = code.slice(2);
    return standings.get(group)?.[1]?.teamId ?? null;
  }
  if (code.startsWith("3B:")) {
    const rank = parseInt(code.slice(3), 10);
    return bestThirds[rank - 1]?.teamId ?? null;
  }
  if (code.startsWith("WM:") || code.startsWith("LM:")) {
    // Need actual match result for these — skip if not played yet
    const matchNum = parseInt(code.slice(3), 10);
    const m = resolvedMatches.get(matchNum);
    if (!m || m.homeScore == null) return null;
    const winner = m.homeScore > m.awayScore ? m.homeTeamId : m.awayScore > m.homeScore ? m.awayTeamId : null;
    if (code.startsWith("WM:")) return winner;
    // Loser
    if (winner == null) return null;
    return winner === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
  }
  return null;
}

// Load all KO matches
const koMatches = await client.query(
  `SELECT id, "matchNumber", "homeTeamId", "awayTeamId", "homeScore", "awayScore", status, phase
   FROM matches
   WHERE phase IN ('ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL')
   ORDER BY "matchNumber"`
);
const resolved = new Map(koMatches.rows.map((m) => [m.matchNumber, m]));

console.log("\n--- Resolving KO matches ---");
let updated = 0;
for (const m of koMatches.rows) {
  const cfg = PAIRINGS[m.matchNumber];
  if (!cfg) continue;
  const homeId = resolveSlot(cfg.home, resolved);
  const awayId = resolveSlot(cfg.away, resolved);
  if (!homeId || !awayId) continue;
  // Only update if changed
  if (m.homeTeamId !== homeId || m.awayTeamId !== awayId) {
    await client.query(
      `UPDATE matches SET "homeTeamId" = $1, "awayTeamId" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [homeId, awayId, m.id]
    );
    updated++;
    console.log(`  Match #${m.matchNumber}: ${cfg.home}=${homeId.slice(-6)} vs ${cfg.away}=${awayId.slice(-6)}`);
  }
}
console.log(`\nDone. ${updated} matches updated.`);

await client.end();
