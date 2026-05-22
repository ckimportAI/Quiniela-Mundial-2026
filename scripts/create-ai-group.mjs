// Create a sub-quiniela with the 5 AI quinielas as members.
// Uses Claude as the creator/admin of the group.

import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const GROUP_NAME = "Las IAs Predicen el Mundial";
const GROUP_DESC = "Las 5 AIs mas famosas compiten entre si pronosticando el Mundial 2026";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

const client = new Client({ connectionString });
await client.connect();

// 1. Find AI users with their quinielas
const aisRes = await client.query(
  `SELECT u.id AS user_id, u.nickname, q.id AS quiniela_id, q."aiProvider"
   FROM users u
   JOIN quinielas q ON q."userId" = u.id AND q."isAi" = true
   WHERE u.role = 'BOT'
   ORDER BY
     CASE q."aiProvider"
       WHEN 'claude' THEN 1
       WHEN 'chatgpt' THEN 2
       WHEN 'gemini' THEN 3
       WHEN 'grok' THEN 4
       WHEN 'deepseek' THEN 5
       ELSE 99
     END`
);

if (aisRes.rows.length === 0) {
  console.error("No AI bots/quinielas encontrados.");
  await client.end();
  process.exit(1);
}

console.log(`Found ${aisRes.rows.length} AIs:`);
for (const a of aisRes.rows) console.log(`  - ${a.aiProvider} (${a.nickname})`);

const ais = aisRes.rows;
const creator = ais[0]; // Claude is creator

// 2. Check if already exists
const existing = await client.query(
  `SELECT id, "inviteCode" FROM sub_quinielas WHERE name = $1`,
  [GROUP_NAME]
);

let subQuinielaId;
let inviteCode;

if (existing.rows.length > 0) {
  subQuinielaId = existing.rows[0].id;
  inviteCode = existing.rows[0].inviteCode;
  console.log(`Sub-quiniela ya existe: ${subQuinielaId} (code: ${inviteCode})`);

  // Clear existing members
  await client.query(`DELETE FROM sub_quiniela_members WHERE "subQuinielaId" = $1`, [subQuinielaId]);
  console.log("Cleared existing members");
} else {
  // Try invite codes until unique
  for (let i = 0; i < 10; i++) {
    inviteCode = genCode();
    const dup = await client.query(`SELECT id FROM sub_quinielas WHERE "inviteCode" = $1`, [inviteCode]);
    if (dup.rows.length === 0) break;
  }

  const created = await client.query(
    `INSERT INTO sub_quinielas (id, name, description, "inviteCode", "createdById", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
     RETURNING id`,
    [GROUP_NAME, GROUP_DESC, inviteCode, creator.user_id]
  );
  subQuinielaId = created.rows[0].id;
  console.log(`Sub-quiniela creada: ${subQuinielaId}`);
  console.log(`Invite code: ${inviteCode}`);
}

// 3. Add members (Claude as ADMIN, others as MEMBER)
for (let i = 0; i < ais.length; i++) {
  const ai = ais[i];
  const role = i === 0 ? "ADMIN" : "MEMBER";
  await client.query(
    `INSERT INTO sub_quiniela_members (id, "subQuinielaId", "userId", "quinielaId", role, "joinedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())`,
    [subQuinielaId, ai.user_id, ai.quiniela_id, role]
  );
  console.log(`  + ${ai.aiProvider} (${role})`);
}

// 4. Show summary
console.log("\n=== Grupo creado ===");
console.log(`Nombre: ${GROUP_NAME}`);
console.log(`Invite code: ${inviteCode}`);
console.log(`Link directo: /sub-quinielas/${subQuinielaId}`);
console.log(`Link invitacion: /sub-quinielas/unirse/${inviteCode}`);

await client.end();
