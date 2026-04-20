import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026",
});

await client.connect();
const res = await client.query(
  `UPDATE users SET credits = 10 WHERE email = $1 RETURNING nickname, email, credits`,
  ["ckimport.ca@gmail.com"]
);
console.log("Updated:", res.rows[0]);
await client.end();
