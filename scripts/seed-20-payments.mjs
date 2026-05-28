import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el4Mund1al2026@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

function genId() {
  return `seed20pmt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function randomRef() {
  return String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
}

async function main() {
  await client.connect();

  // Locate INDIVIDUAL package
  const pkgRes = await client.query(
    `SELECT id, "priceUsd" FROM packages WHERE code='INDIVIDUAL'`
  );
  if (!pkgRes.rows.length) throw new Error("INDIVIDUAL package not found");
  const pkg = pkgRes.rows[0];
  const priceUsd = Number(pkg.priceUsd);

  // Latest BCV rate (fallback to known values)
  const rateRes = await client.query(
    `SELECT "usdRate", "eurRate" FROM exchange_rates ORDER BY "fetchedAt" DESC LIMIT 1`
  );
  const usdRate = Number(rateRes.rows[0]?.usdRate ?? 544.58);
  const eurRate = Number(rateRes.rows[0]?.eurRate ?? 633.48);
  const amountBs = +(priceUsd * eurRate).toFixed(2);

  // Find admin to use as reviewer
  const adminRes = await client.query(
    `SELECT id FROM users WHERE role='ADMIN' LIMIT 1`
  );
  const adminId = adminRes.rows[0]?.id ?? null;

  // Locate the 20 seeded users
  const usersRes = await client.query(
    `SELECT id, nickname FROM users WHERE email LIKE '%@quinipanas.test' ORDER BY "createdAt" ASC`
  );
  const users = usersRes.rows;
  console.log(`Found ${users.length} target users.`);
  console.log(
    `Using priceUsd=$${priceUsd}, eurRate=${eurRate}, amountBs=${amountBs}, reviewer=${adminId}`
  );

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    // Skip if user already has an approved payment
    const existing = await client.query(
      `SELECT id FROM payment_reports WHERE "userId" = $1 AND status='APPROVED' LIMIT 1`,
      [u.id]
    );
    if (existing.rows.length > 0) {
      console.log(`Skip ${u.nickname} - already has approved payment`);
      skipped++;
      continue;
    }

    const id = genId();
    const reference = randomRef();
    try {
      await client.query(
        `INSERT INTO payment_reports (
           id, "userId", "packageId", credits, amount,
           "amountBs", "bcvRateUsd", "bcvRateEur",
           method, reference, notes, "proofUrl",
           status, "reviewedBy", "reviewedAt",
           "promoApplied", "quinielasGranted",
           "isGift", "giftQuantity",
           "createdAt", "updatedAt"
         ) VALUES (
           $1, $2, $3, 1, $4,
           $5, $6, $7,
           'Pago Movil', $8, 'Seed inicial - 20 panas', NULL,
           'APPROVED', $9, NOW(),
           false, 1,
           false, 0,
           NOW(), NOW()
         )`,
        [
          id,
          u.id,
          pkg.id,
          priceUsd,
          amountBs,
          usdRate,
          eurRate,
          reference,
          adminId,
        ]
      );
      console.log(`OK ${u.nickname.padEnd(18)} ref=${reference} amount=$${priceUsd}`);
      created++;
    } catch (err) {
      console.error(`FAIL ${u.nickname}:`, err.message);
    }
  }

  // Totals
  const totals = await client.query(
    `SELECT COUNT(*) AS qty, COALESCE(SUM(amount),0) AS total FROM payment_reports WHERE status='APPROVED'`
  );
  const row = totals.rows[0];
  console.log(`\nCreated ${created}, skipped ${skipped}.`);
  console.log(
    `APPROVED payments now: ${row.qty}, total raised = $${Number(row.total).toFixed(2)} USD`
  );
  console.log(
    `Pool (70%): $${(Number(row.total) * 0.7).toFixed(2)} USD ~ Bs. ${(Number(row.total) * 0.7 * eurRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
