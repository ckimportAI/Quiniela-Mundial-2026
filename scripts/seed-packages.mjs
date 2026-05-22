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
    description: "Una quiniela para participar",
    priceUsd: 5,
    quinielasCount: 1,
    bonusQuinielasOferta: 1, // 2x1: doblas (total: 2)
    badge: null,
    sortOrder: 1,
  },
  {
    code: "AMIGOS",
    name: "Amigos",
    description: "3 quinielas - perfecto para amigos",
    priceUsd: 10,
    quinielasCount: 3,
    bonusQuinielasOferta: 3, // 2x1: doblas (total: 6)
    badge: "MAS POPULAR",
    sortOrder: 2,
  },
  {
    code: "FAMILIA",
    name: "Familia",
    description: "5 quinielas - mejor valor",
    priceUsd: 15,
    quinielasCount: 5,
    bonusQuinielasOferta: 5, // 2x1: doblas (total: 10)
    badge: "MEJOR VALOR",
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
      `UPDATE packages SET name = $1, description = $2, "priceUsd" = $3, "quinielasCount" = $4, "bonusQuinielasOferta" = $5, badge = $6, "sortOrder" = $7, active = true, "updatedAt" = NOW() WHERE code = $8`,
      [p.name, p.description, p.priceUsd, p.quinielasCount, p.bonusQuinielasOferta, p.badge, p.sortOrder, p.code]
    );
    console.log(`Updated: ${p.code}`);
  } else {
    await client.query(
      `INSERT INTO packages (id, code, name, description, "priceUsd", "quinielasCount", "bonusQuinielasOferta", badge, "sortOrder", active, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
      [p.code, p.name, p.description, p.priceUsd, p.quinielasCount, p.bonusQuinielasOferta, p.badge, p.sortOrder]
    );
    console.log(`Inserted: ${p.code}`);
  }
}

const all = await client.query(
  `SELECT code, name, "priceUsd", "quinielasCount", "bonusQuinielasOferta", badge FROM packages ORDER BY "sortOrder"`
);
console.log("\nAll packages:");
for (const row of all.rows) {
  const bonus = row.bonusQuinielasOferta > 0 ? ` +${row.bonusQuinielasOferta} bonus` : "";
  const badge = row.badge ? ` [${row.badge}]` : "";
  console.log(
    `  ${row.code}: ${row.name} - $${row.priceUsd} (${row.quinielasCount} quinielas${bonus})${badge}`
  );
}

await client.end();
