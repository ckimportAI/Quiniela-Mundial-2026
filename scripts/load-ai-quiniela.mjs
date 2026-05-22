// Load AI predictions into a bot quiniela.
//
// Usage:
//   node scripts/load-ai-quiniela.mjs <provider> [proofUrl]
//
// Provider is one of: claude, chatgpt, grok, deepseek
// Expects predictions text in stdin OR in a file: scripts/ai-responses/<provider>.txt

import pg from "pg";
import fs from "fs/promises";
import path from "path";
const { Client } = pg;

const PROVIDERS = {
  claude: { name: "Claude AI", email: "claude@ai.quinielapanas.com", nickname: "claude_ai" },
  chatgpt: { name: "ChatGPT", email: "chatgpt@ai.quinielapanas.com", nickname: "chatgpt_ai" },
  grok: { name: "Grok AI", email: "grok@ai.quinielapanas.com", nickname: "grok_ai" },
  deepseek: { name: "DeepSeek AI", email: "deepseek@ai.quinielapanas.com", nickname: "deepseek_ai" },
  gemini: { name: "Gemini", email: "gemini@ai.quinielapanas.com", nickname: "gemini_ai" },
};

const args = process.argv.slice(2);
const provider = args[0]?.toLowerCase();
const proofUrl = args[1] ?? null;

if (!provider || !PROVIDERS[provider]) {
  console.error("Uso: node load-ai-quiniela.mjs <claude|chatgpt|grok|deepseek> [proofUrl]");
  process.exit(1);
}

const cfg = PROVIDERS[provider];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Read predictions text from file
const txtFile = path.join("scripts", "ai-responses", `${provider}.txt`);
let predictionsText;
try {
  predictionsText = await fs.readFile(txtFile, "utf-8");
} catch {
  console.error(`No se encontro ${txtFile}. Crea el archivo con la respuesta del AI.`);
  process.exit(1);
}

// ---- Team name normalization ----
function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const TEAM_ALIASES = {
  "mexico": "mexico",
  "south africa": "south africa",
  "korea republic": "korea republic",
  "south korea": "korea republic",
  "czech republic": "czech republic",
  "czechia": "czech republic",
  "canada": "canada",
  "bosnia and herzegovina": "bosnia and herzegovina",
  "bosnia": "bosnia and herzegovina",
  "bosnia-herzegovina": "bosnia and herzegovina",
  "qatar": "qatar",
  "switzerland": "switzerland",
  "brazil": "brazil",
  "morocco": "morocco",
  "haiti": "haiti",
  "scotland": "scotland",
  "united states": "united states",
  "usa": "united states",
  "paraguay": "paraguay",
  "australia": "australia",
  "turkey": "turkey",
  "turkiye": "turkey",
  "germany": "germany",
  "curacao": "curacao",
  "ivory coast": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "ecuador": "ecuador",
  "netherlands": "netherlands",
  "japan": "japan",
  "sweden": "sweden",
  "tunisia": "tunisia",
  "belgium": "belgium",
  "egypt": "egypt",
  "iran": "iran",
  "new zealand": "new zealand",
  "spain": "spain",
  "cabo verde": "cabo verde",
  "cape verde": "cabo verde",
  "saudi arabia": "saudi arabia",
  "uruguay": "uruguay",
  "france": "france",
  "senegal": "senegal",
  "iraq": "iraq",
  "norway": "norway",
  "argentina": "argentina",
  "algeria": "algeria",
  "austria": "austria",
  "jordan": "jordan",
  "portugal": "portugal",
  "dr congo": "dr congo",
  "congo dr": "dr congo",
  "uzbekistan": "uzbekistan",
  "colombia": "colombia",
  "england": "england",
  "croatia": "croatia",
  "ghana": "ghana",
  "panama": "panama",
};

function findTeamName(input) {
  const n = normalize(input);
  return TEAM_ALIASES[n] ?? n;
}

// ---- Parse predictions text ----
// Each match line looks like: "Mexico 2 - 1 South Africa" or "Mexico 2-1 South Africa"
// Allow various separators: " - ", "-", " vs "
function parseMatches(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  // Regex: TEAM1 SCORE1 - SCORE2 TEAM2
  const re = /^[\s\-•·*]*([A-Za-z\s'.]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-z\s'.]+?)\s*$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith("grupo") || line.startsWith("===")) continue;
    const m = line.match(re);
    if (m) {
      matches.push({
        homeName: m[1].trim(),
        homeScore: parseInt(m[2], 10),
        awayScore: parseInt(m[3], 10),
        awayName: m[4].trim(),
      });
    }
  }
  return matches;
}

function parseTournament(text) {
  const result = { champion: null, runnerUp: null, third: null, topScorer: null };
  const champ = text.match(/Campeon[:\s]+([^\n]+)/i);
  const runner = text.match(/Subcampeon[:\s]+([^\n]+)/i);
  const third = text.match(/Tercer[Ll]ugar[:\s]+([^\n]+)|Tercer\s+[Ll]ugar[:\s]+([^\n]+)/i);
  const scorer = text.match(/Goleador[^:]*[:\s]+([^\n]+)/i);
  if (champ) result.champion = champ[1].trim();
  if (runner) result.runnerUp = runner[1].trim();
  if (third) result.third = (third[1] ?? third[2] ?? "").trim();
  if (scorer) result.topScorer = scorer[1].trim();
  return result;
}

// Strip "(Country)" or extra info
function cleanTeamPrediction(s) {
  return s.replace(/\([^)]*\)/g, "").trim();
}
function extractPlayerName(s) {
  // "Kylian Mbappé (France)" -> "Kylian Mbappé"
  return s.replace(/\([^)]*\)/g, "").trim();
}

// ---- Main ----
const client = new Client({ connectionString });
await client.connect();

console.log(`=== Loading AI quiniela: ${cfg.name} ===`);

// 1. Find or create bot user
let userRes = await client.query("SELECT id FROM users WHERE email = $1", [cfg.email]);
let userId;
if (userRes.rows.length > 0) {
  userId = userRes.rows[0].id;
  console.log(`User exists: ${cfg.email} (id=${userId})`);
} else {
  const newRes = await client.query(
    `INSERT INTO users (id, email, name, nickname, role, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, 'BOT', NOW(), NOW())
     RETURNING id`,
    [cfg.email, cfg.name, cfg.nickname]
  );
  userId = newRes.rows[0].id;
  console.log(`User created: ${cfg.email}`);
}

// 2. Find or create quiniela for this AI
let quinielaRes = await client.query(
  `SELECT id FROM quinielas WHERE "userId" = $1 AND "isAi" = true`,
  [userId]
);
let quinielaId;
if (quinielaRes.rows.length > 0) {
  quinielaId = quinielaRes.rows[0].id;
  console.log(`Quiniela exists: ${quinielaId}`);
  // Clear existing predictions
  await client.query(`DELETE FROM predictions WHERE "quinielaId" = $1`, [quinielaId]);
  await client.query(`DELETE FROM tournament_predictions WHERE "quinielaId" = $1`, [quinielaId]);
  console.log("Cleared existing predictions");
  // Update proofUrl if provided
  if (proofUrl) {
    await client.query(
      `UPDATE quinielas SET "aiProofUrl" = $1, "aiProvider" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [proofUrl, provider, quinielaId]
    );
  }
} else {
  const qRes = await client.query(
    `INSERT INTO quinielas (id, name, "userId", "isAi", "aiProvider", "aiProofUrl", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, true, $3, $4, NOW(), NOW())
     RETURNING id`,
    [`${cfg.name}-Mundial`, userId, provider, proofUrl]
  );
  quinielaId = qRes.rows[0].id;
  await client.query(
    `INSERT INTO quiniela_scores (id, "quinielaId", "updatedAt") VALUES (gen_random_uuid()::text, $1, NOW())`,
    [quinielaId]
  );
  console.log(`Quiniela created: ${quinielaId}`);
}

// 3. Parse matches
const predicted = parseMatches(predictionsText);
console.log(`Parsed ${predicted.length} match predictions`);

// 4. Load DB matches (group stage)
const dbMatchesRes = await client.query(
  `SELECT m.id, m."matchNumber", h.name AS "homeName", a.name AS "awayName"
   FROM matches m
   LEFT JOIN teams h ON m."homeTeamId" = h.id
   LEFT JOIN teams a ON m."awayTeamId" = a.id
   WHERE m.phase = 'GROUP_STAGE'`
);
const dbMatches = dbMatchesRes.rows;

function findMatch(homeName, awayName) {
  const hN = findTeamName(homeName);
  const aN = findTeamName(awayName);
  // Direct: home=hN, away=aN
  let m = dbMatches.find(
    (x) => findTeamName(x.homeName) === hN && findTeamName(x.awayName) === aN
  );
  if (m) return { match: m, reversed: false };
  // Reversed
  m = dbMatches.find(
    (x) => findTeamName(x.homeName) === aN && findTeamName(x.awayName) === hN
  );
  if (m) return { match: m, reversed: true };
  return null;
}

let inserted = 0;
let notFound = 0;
let duplicates = 0;
const seenMatchIds = new Set();
for (const p of predicted) {
  const found = findMatch(p.homeName, p.awayName);
  if (!found) {
    console.log(`  ! No match for: ${p.homeName} vs ${p.awayName}`);
    notFound++;
    continue;
  }
  if (seenMatchIds.has(found.match.id)) {
    console.log(`  ! Duplicate: ${p.homeName} vs ${p.awayName} (omitido)`);
    duplicates++;
    continue;
  }
  seenMatchIds.add(found.match.id);
  const homeScore = found.reversed ? p.awayScore : p.homeScore;
  const awayScore = found.reversed ? p.homeScore : p.awayScore;
  await client.query(
    `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, false, NOW(), NOW())`,
    [userId, quinielaId, found.match.id, homeScore, awayScore]
  );
  inserted++;
}
console.log(`Inserted ${inserted} predictions, ${notFound} not found, ${duplicates} duplicates omitted`);

// Identify missing GROUP_STAGE matches (those the AI didn't predict)
const dbMatchIds = new Set(dbMatches.map(m => m.id));
const missingMatchIds = [...dbMatchIds].filter(id => !seenMatchIds.has(id));
if (missingMatchIds.length > 0) {
  console.log(`Faltan ${missingMatchIds.length} partidos sin prediccion (rellenando con 0-0 default):`);
  for (const mid of missingMatchIds) {
    const m = dbMatches.find(x => x.id === mid);
    console.log(`  - ${m.homeName} vs ${m.awayName} -> 0-0`);
    await client.query(
      `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, 0, 0, false, NOW(), NOW())`,
      [userId, quinielaId, mid]
    );
  }
}

// 5. Tournament predictions
const tour = parseTournament(predictionsText);
console.log("Tournament predictions parsed:", tour);

async function teamIdByName(name) {
  if (!name) return null;
  const cleaned = cleanTeamPrediction(name);
  const norm = findTeamName(cleaned);
  const res = await client.query("SELECT id FROM teams WHERE LOWER(name) = $1", [norm]);
  return res.rows[0]?.id ?? null;
}

const insertTour = async (type, teamId, playerName) => {
  await client.query(
    `INSERT INTO tournament_predictions (id, "userId", "quinielaId", type, "teamId", "playerName", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())`,
    [userId, quinielaId, type, teamId, playerName]
  );
};

if (tour.champion) {
  const id = await teamIdByName(tour.champion);
  if (id) {
    await insertTour("CHAMPION", id, null);
    console.log(`  CHAMPION: ${tour.champion} -> ${id}`);
  } else console.log(`  ! CHAMPION not found: ${tour.champion}`);
}
if (tour.runnerUp) {
  const id = await teamIdByName(tour.runnerUp);
  if (id) {
    await insertTour("RUNNER_UP", id, null);
    console.log(`  RUNNER_UP: ${tour.runnerUp} -> ${id}`);
  } else console.log(`  ! RUNNER_UP not found: ${tour.runnerUp}`);
}
if (tour.third) {
  const id = await teamIdByName(tour.third);
  if (id) {
    await insertTour("THIRD_PLACE", id, null);
    console.log(`  THIRD_PLACE: ${tour.third} -> ${id}`);
  } else console.log(`  ! THIRD_PLACE not found: ${tour.third}`);
}
if (tour.topScorer) {
  const playerName = extractPlayerName(tour.topScorer);
  await insertTour("TOP_SCORER", null, playerName);
  console.log(`  TOP_SCORER: ${playerName}`);
}

await client.end();
console.log(`\n=== Done: ${cfg.name} quiniela loaded ===`);
