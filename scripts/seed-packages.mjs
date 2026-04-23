import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

const packages = [
  {
    code: "INDIVIDUAL",
    name: "Individual",
    description: "1 quiniela",
    priceUsd: 12,
    quinielasCount: 1,
    sortOrder: 1,
  },
  {
    code: "AMIGOS",
    name: "Amigos",
    description: "3 quinielas ($10 c/u)",
    priceUsd: 30,
    quinielasCount: 3,
    sortOrder: 2,
  },
  {
    code: "FAMILIA",
    name: "Familia",
    description: "5 quinielas ($8 c/u)",
    priceUsd: 40,
    quinielasCount: 5,
    sortOrder: 3,
  },
];

await client.connect();

for (const p of packages) {
  const existing = await client.query(
    `SELECT id FROM packages WHERE code = $1`,
    [p.code]
  );
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE packages SET name = $1, description = $2, "priceUsd" = $3, "quinielasCount" = $4, "sortOrder" = $5, active = true, "updatedAt" = NOW() WHERE code = $6`,
      [p.name, p.description, p.priceUsd, p.quinielasCount, p.sortOrder, p.code]
    );
    console.log(`Updated: ${p.code}`);
  } else {
    await client.query(
      `INSERT INTO packages (id, code, name, description, "priceUsd", "quinielasCount", "sortOrder", active, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
      [p.code, p.name, p.description, p.priceUsd, p.quinielasCount, p.sortOrder]
    );
    console.log(`Inserted: ${p.code}`);
  }
}

const all = await client.query(
  `SELECT code, name, "priceUsd", "quinielasCount" FROM packages ORDER BY "sortOrder"`
);
console.log("\nAll packages:");
for (const row of all.rows) {
  console.log(
    `  ${row.code}: ${row.name} - $${row.priceUsd} (${row.quinielasCount} quinielas)`
  );
}

await client.end();
