import pg from "pg";

const client = new pg.Client(
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026"
);
await client.connect();

// Check if user exists
const check = await client.query(
  `SELECT id, email, role FROM users WHERE email = $1`,
  ["ckpaz13@gmail.com"]
);
console.log("User found:", check.rows);

if (check.rows.length > 0) {
  const up = await client.query(
    `UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING email, role`,
    ["ckpaz13@gmail.com"]
  );
  console.log("Updated:", up.rows);
} else {
  console.log("User not found. Log in first, then run this script again.");
}

await client.end();
