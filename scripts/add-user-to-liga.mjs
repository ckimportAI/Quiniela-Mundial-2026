import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const EMAIL = process.argv[2];
const NICKNAME = process.argv[3] || null;
const NAME = process.argv[4] || null;
const LIGA_SLUG = process.argv[5] || "equinox";
const TEMP_PASSWORD = process.argv[6] || "Equinox2026";

if (!EMAIL) {
  console.error("Usage: node scripts/add-user-to-liga.mjs <email> [nickname] [name] [ligaSlug] [tempPassword]");
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });
await client.connect();

const liga = await client.query(
  `SELECT id, name FROM ligas WHERE slug = $1`,
  [LIGA_SLUG]
);
if (!liga.rows.length) {
  console.error(`Liga "${LIGA_SLUG}" not found`);
  process.exit(1);
}

const existing = await client.query(
  `SELECT id, "ligaId" FROM users WHERE LOWER(email) = LOWER($1)`,
  [EMAIL]
);

const hash = await bcrypt.hash(TEMP_PASSWORD, 10);

if (existing.rows.length) {
  // Update existing user — set ligaId + optionally nickname/password
  const fields = [`"ligaId" = $1`, `"updatedAt" = NOW()`];
  const params = [liga.rows[0].id];
  let i = 2;
  if (NICKNAME) {
    fields.push(`nickname = $${i++}`);
    params.push(NICKNAME);
  }
  if (NAME) {
    fields.push(`name = $${i++}`);
    params.push(NAME);
  }
  fields.push(`"passwordHash" = $${i++}`);
  params.push(hash);
  params.push(EMAIL);
  const sql = `UPDATE users SET ${fields.join(", ")} WHERE LOWER(email) = LOWER($${i})`;
  await client.query(sql, params);
  console.log(`Updated existing user → moved to ${liga.rows[0].name}`);
} else {
  // Create new
  const id = `manual_user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await client.query(
    `INSERT INTO users (id, email, nickname, name, "passwordHash", role, "ligaId",
       "terminosAceptados", "terminosVersion", "terminosFechaAceptacion",
       "privacidadAceptada", "privacidadFechaAceptacion",
       "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'PARTICIPANT', $6,
       true, '1.0', NOW(),
       true, NOW(),
       NOW(), NOW())`,
    [id, EMAIL.toLowerCase(), NICKNAME, NAME, hash, liga.rows[0].id]
  );
  console.log(`Created new user in ${liga.rows[0].name}`);
}

console.log(`Email: ${EMAIL}`);
console.log(`Nickname: ${NICKNAME ?? "(none)"}`);
console.log(`Liga: ${liga.rows[0].name}`);
console.log(`Temp password: ${TEMP_PASSWORD}`);

await client.end();
