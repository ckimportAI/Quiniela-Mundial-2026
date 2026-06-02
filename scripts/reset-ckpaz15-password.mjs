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
   WHERE nickname = 'ckpaz15'
   RETURNING email`,
  [hash]
);
console.log(`Updated ${r.rowCount}: ${r.rows[0]?.email}`);
console.log(`Password: ${NEW_PASSWORD}`);
await client.end();
