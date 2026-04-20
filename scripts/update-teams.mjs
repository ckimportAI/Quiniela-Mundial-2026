import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026",
});

const updates = [
  { oldCode: "PLD", name: "Czech Republic", code: "CZE", flag: "🇨🇿" },
  { oldCode: "PLA", name: "Bosnia and Herzegovina", code: "BIH", flag: "🇧🇦" },
  { oldCode: "PLC", name: "Turkey", code: "TUR", flag: "🇹🇷" },
  { oldCode: "PLB", name: "Sweden", code: "SWE", flag: "🇸🇪" },
  { oldCode: "PF2", name: "Iraq", code: "IRQ", flag: "🇮🇶" },
  { oldCode: "PF1", name: "DR Congo", code: "COD", flag: "🇨🇩" },
];

await client.connect();

for (const u of updates) {
  const res = await client.query(
    `UPDATE teams SET name = $1, code = $2, flag = $3 WHERE code = $4 RETURNING name, code, flag`,
    [u.name, u.code, u.flag, u.oldCode]
  );
  if (res.rows.length > 0) {
    console.log(`Updated: ${u.oldCode} → ${res.rows[0].name} (${res.rows[0].code}) ${res.rows[0].flag}`);
  } else {
    console.log(`Not found: ${u.oldCode} - will be created on next seed`);
  }
}

// Verify all 48 teams
const all = await client.query("SELECT code, name, flag FROM teams ORDER BY code");
console.log(`\nTotal teams: ${all.rows.length}`);
const noFlag = all.rows.filter(r => !r.flag || r.flag === "🏳️");
if (noFlag.length > 0) {
  console.log("Teams without flag:", noFlag);
}

await client.end();
