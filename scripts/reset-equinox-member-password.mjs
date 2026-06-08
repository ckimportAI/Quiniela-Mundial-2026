import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const EMAIL = process.env.RESET_EMAIL || process.argv[2];
const NEW_PASSWORD = process.env.RESET_PASSWORD || process.argv[3] || "Equinox2026";

if (!EMAIL) {
  console.error("Usage: node scripts/reset-equinox-member-password.mjs <email> [newPassword]");
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });
await client.connect();

const hash = await bcrypt.hash(NEW_PASSWORD, 10);
const r = await client.query(
  `UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW()
   WHERE LOWER(email) = LOWER($2)
   RETURNING email, nickname`,
  [hash, EMAIL]
);

if (!r.rowCount) {
  console.error(`No user found for ${EMAIL}`);
  process.exit(1);
}
console.log(`Updated: ${r.rows[0].email} (${r.rows[0].nickname})`);

const v = await client.query(
  `SELECT "passwordHash" FROM users WHERE LOWER(email) = LOWER($1)`,
  [EMAIL]
);
const ok = await bcrypt.compare(NEW_PASSWORD, v.rows[0].passwordHash);
console.log(`Self-verify: ${ok ? "OK" : "FAIL"}`);
console.log(`New password: ${NEW_PASSWORD}`);

await client.end();
