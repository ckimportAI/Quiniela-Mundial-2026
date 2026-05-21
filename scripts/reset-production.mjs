// Reset production data for real launch.
// Keeps: tournament structure (teams, groups, venues, matches), packages, siteConfig, exchangeRates, adminLogs
// Keeps: admin user (ckimport.ca@gmail.com)
// Deletes: everything else (users, quinielas, predictions, payments, etc.)
// Resets: match results to SCHEDULED, admin's credits/saldo/oferta to defaults
//
// Usage on server:
//   cd /var/www/quiniela
//   set -a && . .env && set +a
//   node scripts/reset-production.mjs --confirm RESET_PRODUCTION

import pg from "pg";
const { Client } = pg;

const ADMIN_EMAIL = "ckimport.ca@gmail.com";

const args = process.argv.slice(2);
const confirmIdx = args.indexOf("--confirm");
const confirmed =
  confirmIdx !== -1 && args[confirmIdx + 1] === "RESET_PRODUCTION";

if (!confirmed) {
  console.error(
    "ERROR: Confirmacion requerida. Usa: node scripts/reset-production.mjs --confirm RESET_PRODUCTION"
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL no configurado");
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

console.log("=== RESET PRODUCCION ===");
console.log("Admin a preservar:", ADMIN_EMAIL);
console.log();

// Verify admin exists
const adminQ = await client.query(
  'SELECT id, nickname FROM users WHERE email = $1',
  [ADMIN_EMAIL]
);
if (adminQ.rows.length === 0) {
  console.error(`ERROR: Admin ${ADMIN_EMAIL} no existe en DB. Abortando.`);
  await client.end();
  process.exit(1);
}
const adminId = adminQ.rows[0].id;
const adminNick = adminQ.rows[0].nickname;
console.log(`Admin encontrado: id=${adminId}, nickname=${adminNick}`);
console.log();

console.log("Estado actual antes del reset:");
const before = {
  users: (await client.query("SELECT COUNT(*) FROM users")).rows[0].count,
  quinielas: (await client.query("SELECT COUNT(*) FROM quinielas")).rows[0].count,
  predictions: (await client.query("SELECT COUNT(*) FROM predictions")).rows[0].count,
  payments: (await client.query("SELECT COUNT(*) FROM payment_reports")).rows[0].count,
  subq: (await client.query("SELECT COUNT(*) FROM sub_quinielas")).rows[0].count,
  ganadores: (await client.query("SELECT COUNT(*) FROM ganadores")).rows[0].count,
  matchesFinished: (await client.query("SELECT COUNT(*) FROM matches WHERE status = 'FINISHED'")).rows[0].count,
};
console.log(before);
console.log();

// Begin transaction
await client.query("BEGIN");

try {
  console.log("Borrando datos de usuarios...");

  // Order matters for FK constraints, but most have cascade. Be explicit:
  await client.query("DELETE FROM ganadores");
  console.log("  ganadores: borrados");

  await client.query("DELETE FROM tournament_predictions");
  console.log("  tournament_predictions: borradas");

  await client.query("DELETE FROM predictions");
  console.log("  predictions: borradas");

  await client.query("DELETE FROM quiniela_scores");
  console.log("  quiniela_scores: borrados");

  await client.query("DELETE FROM sub_quiniela_members");
  console.log("  sub_quiniela_members: borrados");

  await client.query("DELETE FROM sub_quinielas");
  console.log("  sub_quinielas: borradas");

  await client.query("DELETE FROM quinielas");
  console.log("  quinielas: borradas");

  // saldos_favor table may exist (legacy)
  try {
    await client.query("DELETE FROM saldos_favor");
    console.log("  saldos_favor: borrados");
  } catch {
    // table might not exist
  }

  await client.query("DELETE FROM payment_reports");
  console.log("  payment_reports: borrados");

  await client.query("DELETE FROM usdt_conversions");
  console.log("  usdt_conversions: borradas");

  await client.query("DELETE FROM telegram_subscriptions");
  console.log("  telegram_subscriptions: borradas");

  // Auth tables
  await client.query("DELETE FROM accounts WHERE \"userId\" != $1", [adminId]);
  await client.query("DELETE FROM sessions WHERE \"userId\" != $1", [adminId]);
  console.log("  accounts/sessions de no-admin: borrados");

  // Delete all users EXCEPT admin
  const delRes = await client.query("DELETE FROM users WHERE id != $1", [adminId]);
  console.log(`  users (excepto admin): borrados ${delRes.rowCount}`);

  // Reset matches to SCHEDULED
  const matchRes = await client.query(`
    UPDATE matches SET
      "homeScore" = NULL,
      "awayScore" = NULL,
      "homePenalty" = NULL,
      "awayPenalty" = NULL,
      status = 'SCHEDULED',
      locked = false,
      "updatedAt" = NOW()
    WHERE status != 'SCHEDULED' OR "homeScore" IS NOT NULL
  `);
  console.log(`  matches reseteados a SCHEDULED: ${matchRes.rowCount}`);

  // Reset admin state
  const adminRes = await client.query(`
    UPDATE users SET
      credits = 0,
      "saldoBs" = 0,
      "ofertaBienvenidaUsada" = false,
      "fechaPrimeraCompra" = NULL,
      "updatedAt" = NOW()
    WHERE id = $1
    RETURNING email, nickname, role, credits, "saldoBs", "ofertaBienvenidaUsada"
  `, [adminId]);
  console.log("  admin reseteado:", adminRes.rows[0]);

  await client.query("COMMIT");
  console.log();
  console.log("=== COMMIT exitoso ===");

  // Final state
  const after = {
    users: (await client.query("SELECT COUNT(*) FROM users")).rows[0].count,
    quinielas: (await client.query("SELECT COUNT(*) FROM quinielas")).rows[0].count,
    predictions: (await client.query("SELECT COUNT(*) FROM predictions")).rows[0].count,
    payments: (await client.query("SELECT COUNT(*) FROM payment_reports")).rows[0].count,
    subq: (await client.query("SELECT COUNT(*) FROM sub_quinielas")).rows[0].count,
    ganadores: (await client.query("SELECT COUNT(*) FROM ganadores")).rows[0].count,
    matchesFinished: (await client.query("SELECT COUNT(*) FROM matches WHERE status = 'FINISHED'")).rows[0].count,
    teams: (await client.query("SELECT COUNT(*) FROM teams")).rows[0].count,
    matches: (await client.query("SELECT COUNT(*) FROM matches")).rows[0].count,
    packages: (await client.query("SELECT COUNT(*) FROM packages")).rows[0].count,
  };
  console.log();
  console.log("Estado final:");
  console.log(after);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("ERROR - ROLLBACK ejecutado:", err);
  process.exit(1);
} finally {
  await client.end();
}

console.log();
console.log("Listo. Sistema en estado virgen para produccion.");
