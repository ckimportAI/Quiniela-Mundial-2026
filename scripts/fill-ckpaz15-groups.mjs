import pg from "pg";
const { Client } = pg;

const USER_ID = "cmq9q19b605x9klh2dr9mn4it";
const QUINIELAS = {
  q1: "cmq9r5upi06j7klh2h5ng7xqk", // ckpaz15-1
  q2: "cmq9r5upl06j9klh21w4d2ofd", // ckpaz15-2
  q3: "cmq9r5upn06jbklh2hkjo4jj8", // ckpaz15-3
  q4: "cmq9r5upq06jdklh267aq8nz3", // ckpaz15-4
  q5: "cmq9r5upu06jfklh26y9il30c", // ckpaz15-5
};

// matchNumber -> [q1, q2, q3, q4, q5] each as [home, away]
const PREDS = {
  // Group A
  3:  [[1,1],[2,1],[1,0],[0,0],[0,1]],   // Checa vs SAF
  4:  [[2,1],[2,0],[1,0],[1,1],[2,1]],   // Mex vs Korea
  5:  [[0,1],[0,2],[1,2],[1,1],[0,1]],   // Checa vs Mex
  6:  [[1,1],[0,1],[0,2],[1,2],[1,0]],   // SAF vs Korea
  // Group B (match 7 already filled with our pre-decided values)
  7:  [[1,0],[2,0],[2,1],[1,1],[2,1]],   // Can vs Bos
  8:  [[0,1],[0,2],[1,1],[1,2],[0,1]],   // Cat vs Sui
  9:  [[2,1],[2,0],[1,1],[1,0],[0,1]],   // Sui vs Bos
  10: [[2,0],[3,0],[2,1],[1,0],[2,1]],   // Can vs Cat
  11: [[1,1],[1,2],[2,2],[0,1],[1,0]],   // Sui vs Can
  12: [[2,1],[2,0],[1,0],[1,1],[1,2]],   // Bos vs Cat
  // Group C
  13: [[2,1],[2,0],[3,1],[1,1],[1,0]],   // Bra vs Mar
  14: [[0,1],[0,2],[1,1],[1,2],[1,0]],   // Hai vs Esc
  15: [[0,1],[1,2],[1,1],[0,2],[1,0]],   // Esc vs Mar
  16: [[3,0],[4,0],[2,0],[3,1],[2,0]],   // Bra vs Hai
  17: [[0,2],[0,3],[1,2],[1,3],[0,1]],   // Esc vs Bra
  18: [[2,0],[3,0],[2,1],[1,0],[3,1]],   // Mar vs Hai
  // Group D (match 19 USA vs Par)
  19: [[2,1],[2,0],[1,0],[2,1],[1,1]],   // USA vs Par
  20: [[1,1],[2,1],[1,2],[0,1],[2,2]],   // Aus vs Tur
  21: [[2,0],[2,1],[1,0],[1,1],[3,1]],   // USA vs Aus
  22: [[1,1],[2,1],[1,0],[0,1],[1,2]],   // Tur vs Par
  23: [[1,2],[0,2],[1,1],[0,1],[1,0]],   // Tur vs USA
  24: [[1,1],[2,1],[1,2],[0,0],[1,0]],   // Par vs Aus
  // Group E
  25: [[3,0],[4,0],[2,0],[5,0],[3,0]],   // Ale vs Cur
  26: [[1,1],[2,1],[1,2],[0,1],[1,0]],   // CdM vs Ecu
  27: [[2,0],[3,0],[2,1],[1,1],[3,1]],   // Ale vs CdM
  28: [[2,0],[3,0],[2,1],[1,0],[2,1]],   // Ecu vs Cur
  29: [[0,2],[1,2],[0,1],[1,1],[1,3]],   // Ecu vs Ale
  30: [[0,2],[0,3],[1,2],[0,1],[1,1]],   // Cur vs CdM
  // Group F
  31: [[2,1],[2,0],[1,1],[1,0],[1,2]],   // NED vs Jap
  32: [[2,0],[2,1],[1,0],[1,1],[3,1]],   // Sue vs Tun
  33: [[2,1],[1,1],[2,0],[0,1],[1,2]],   // NED vs Sue
  34: [[0,1],[1,2],[1,1],[0,2],[1,0]],   // Tun vs Jap
  35: [[1,1],[2,1],[1,2],[1,0],[0,1]],   // Jap vs Sue
  36: [[0,2],[1,2],[0,3],[1,1],[0,1]],   // Tun vs NED
  // Group G
  37: [[2,0],[2,1],[3,0],[1,0],[2,1]],   // Bel vs Egi
  38: [[2,0],[2,1],[1,0],[1,1],[3,0]],   // Iran vs NZ
  39: [[2,1],[2,0],[1,0],[1,1],[3,1]],   // Bel vs Iran
  40: [[0,1],[0,2],[1,2],[1,1],[1,0]],   // NZ vs Egi
  41: [[1,1],[1,2],[2,1],[0,1],[1,0]],   // Egi vs Iran
  42: [[0,3],[0,2],[1,3],[0,4],[1,2]],   // NZ vs Bel
  // Group H
  43: [[3,0],[4,0],[2,0],[3,1],[5,0]],   // Esp vs CV
  44: [[0,2],[0,1],[1,2],[1,1],[1,0]],   // Arab vs Uru
  45: [[3,0],[2,0],[2,1],[4,0],[3,1]],   // Esp vs Arab
  46: [[2,0],[3,0],[2,1],[1,0],[3,1]],   // Uru vs CV
  47: [[1,1],[1,0],[0,1],[2,1],[1,2]],   // CV vs Arab
  48: [[1,2],[0,1],[1,1],[0,2],[2,1]],   // Uru vs Esp
  // Group I
  49: [[2,1],[3,0],[2,0],[1,0],[3,1]],   // Fra vs Sen
  50: [[0,2],[0,3],[1,2],[1,1],[0,1]],   // Irak vs Nor
  51: [[3,0],[4,0],[2,0],[3,1],[2,0]],   // Fra vs Irak
  52: [[1,1],[2,1],[1,2],[2,0],[1,0]],   // Nor vs Sen
  53: [[1,2],[0,2],[1,1],[0,1],[1,3]],   // Nor vs Fra
  54: [[2,0],[3,0],[2,1],[1,0],[2,1]],   // Sen vs Irak
  // Group J
  55: [[3,0],[3,1],[2,0],[2,1],[4,0]],   // Arg vs Argelia
  56: [[2,0],[3,0],[2,1],[1,0],[3,1]],   // Aus vs Jor
  57: [[2,0],[2,1],[3,0],[1,0],[3,1]],   // Arg vs Aus
  58: [[0,1],[0,2],[1,1],[1,2],[0,1]],   // Jor vs Argelia
  59: [[1,1],[1,2],[2,1],[0,1],[1,0]],   // Argelia vs Aus
  60: [[0,3],[0,2],[1,3],[0,4],[0,3]],   // Jor vs Arg
  // Group K
  61: [[3,0],[2,0],[3,1],[2,1],[4,0]],   // Por vs RDC
  62: [[0,2],[0,1],[1,2],[1,1],[0,3]],   // Uzb vs Col
  63: [[3,0],[4,0],[2,0],[2,1],[3,1]],   // Por vs Uzb
  64: [[2,0],[3,0],[2,1],[1,0],[2,1]],   // Col vs RDC
  65: [[1,2],[0,1],[1,1],[2,1],[0,2]],   // Col vs Por
  66: [[1,1],[1,0],[0,1],[2,1],[1,2]],   // RDC vs Uzb
  // Group L
  67: [[2,1],[2,0],[1,0],[1,1],[1,2]],   // Ing vs Cro
  68: [[2,0],[2,1],[1,0],[1,1],[3,1]],   // Gha vs Pan
  69: [[2,0],[3,0],[2,1],[1,0],[3,1]],   // Ing vs Gha
  70: [[0,2],[0,1],[1,2],[1,1],[0,3]],   // Pan vs Cro
  71: [[0,2],[0,3],[1,3],[0,1],[0,2]],   // Pan vs Ing
  72: [[2,0],[2,1],[1,0],[1,1],[3,1]],   // Cro vs Gha
};

const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });
await client.connect();

// Get matchNumber -> matchId mapping
const matchesRes = await client.query(
  `SELECT id, "matchNumber" FROM matches WHERE phase='GROUP_STAGE' AND "matchNumber" >= 3 ORDER BY "matchNumber"`
);
const matchIdByNumber = new Map(matchesRes.rows.map((r) => [r.matchNumber, r.id]));

let inserted = 0;
let skipped = 0;

for (const [matchNumStr, fivePreds] of Object.entries(PREDS)) {
  const matchNum = Number(matchNumStr);
  const matchId = matchIdByNumber.get(matchNum);
  if (!matchId) {
    console.warn(`No match for #${matchNum}`);
    continue;
  }
  const quinIds = [QUINIELAS.q1, QUINIELAS.q2, QUINIELAS.q3, QUINIELAS.q4, QUINIELAS.q5];

  for (let i = 0; i < 5; i++) {
    const [home, away] = fivePreds[i];
    const quinielaId = quinIds[i];

    // Skip if already exists
    const exists = await client.query(
      `SELECT id FROM predictions WHERE "quinielaId"=$1 AND "matchId"=$2`,
      [quinielaId, matchId]
    );
    if (exists.rows.length) {
      skipped++;
      continue;
    }

    const id = `ckpaz15_seed_${matchNum}_${i + 1}_${Math.random().toString(36).slice(2, 10)}`;
    await client.query(
      `INSERT INTO predictions (id, "userId", "quinielaId", "matchId", "homeScore", "awayScore", "isWildcard", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())`,
      [id, USER_ID, quinielaId, matchId, home, away]
    );
    inserted++;
  }
}

console.log(`Inserted: ${inserted}`);
console.log(`Skipped (already existed): ${skipped}`);

await client.end();
