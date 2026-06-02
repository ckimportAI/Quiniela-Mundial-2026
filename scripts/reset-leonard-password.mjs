import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;
const NEW_PASSWORD = "Equinox2026";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });
await client.connect();

const hash = await bcrypt.hash(NEW_PASSWORD, 10);

const r = await client.query(
  `UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW()
   WHERE LOWER(email) = LOWER('leonardkey3108@gmail.com')
   RETURNING email`,
  [hash]
);

console.log(`Updated ${r.rowCount} user(s).`);
console.log(`New password: ${NEW_PASSWORD}`);

// Sanity check: re-fetch and verify
const v = await client.query(
  `SELECT "passwordHash" FROM users WHERE LOWER(email) = 'leonardkey3108@gmail.com'`
);
const ok = await bcrypt.compare(NEW_PASSWORD, v.rows[0].passwordHash);
console.log(`Self-verify: ${ok ? "OK" : "FAIL"}`);

await client.end();
