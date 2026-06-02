import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const client = new Client({ connectionString });

const OWNER_EMAIL = "leonardkey3108@gmail.com";
const TEMP_PASSWORD = "QuinielaEquinox26!"; // Cliente debe cambiarla al entrar
const OWNER_NAME = "Leonard"; // Cliente puede editarlo en su perfil
const OWNER_CEDULA = "V-16412370";
const OWNER_PHONE = "04142502081";

const LIGA = {
  slug: "equinox",
  name: "Quiniela Equinox",
  description: "Liga privada Quiniela Equinox - Mundial 2026",
  priceUsd: 25,
  quinielasPerPurchase: 1,
  pagoMovilPhone: "04142502081",
  pagoMovilCedula: "V-16412370",
  pagoMovilBank: "Banesco",
  zelleEmail: "Paulacfb02@gmail.com",
  zelleName: "Paula CFB",
  paymentNotes:
    "Tambien disponible Binance Pay. Contacta al admin para detalles.",
  prizesText: null, // Cliente lo configura desde su panel
};

function genId() {
  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  await client.connect();

  // 1. Upsert owner user
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  let ownerId;
  const existing = await client.query(
    `SELECT id, "ligaId", "passwordHash" FROM users WHERE LOWER(email) = LOWER($1)`,
    [OWNER_EMAIL]
  );

  if (existing.rows.length > 0) {
    ownerId = existing.rows[0].id;
    const hadPassword = !!existing.rows[0].passwordHash;
    const inLiga = existing.rows[0].ligaId;

    if (inLiga) {
      console.error(`Owner already belongs to liga ${inLiga}. Aborting.`);
      process.exit(1);
    }

    // Set password and basic info if missing
    await client.query(
      `UPDATE users
       SET name = COALESCE(name, $2),
           cedula = COALESCE(cedula, $3),
           phone = COALESCE(phone, $4),
           "passwordHash" = $5,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [ownerId, OWNER_NAME, OWNER_CEDULA, OWNER_PHONE, passwordHash]
    );
    console.log(
      `Owner already existed (id=${ownerId}). Password ${
        hadPassword ? "RESET" : "SET"
      }.`
    );
  } else {
    ownerId = genId();
    await client.query(
      `INSERT INTO users (id, name, email, cedula, phone, "passwordHash",
        credits, role,
        "terminosAceptados", "terminosVersion", "terminosFechaAceptacion",
        "privacidadAceptada", "privacidadFechaAceptacion",
        "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6,
        0, 'PARTICIPANT',
        true, '1.0', NOW(),
        true, NOW(),
        NOW(), NOW())`,
      [
        ownerId,
        OWNER_NAME,
        OWNER_EMAIL.toLowerCase(),
        OWNER_CEDULA,
        OWNER_PHONE,
        passwordHash,
      ]
    );
    console.log(`Owner created (id=${ownerId})`);
  }

  // 2. Create liga
  const existingLiga = await client.query(
    `SELECT id FROM ligas WHERE slug = $1`,
    [LIGA.slug]
  );
  if (existingLiga.rows.length > 0) {
    console.error(`Liga slug "${LIGA.slug}" already exists. Aborting.`);
    process.exit(1);
  }

  const ligaId = genId();
  await client.query(
    `INSERT INTO ligas (
       id, slug, name, description, "ownerId",
       "priceUsd", "quinielasPerPurchase",
       "pagoMovilPhone", "pagoMovilCedula", "pagoMovilBank",
       "zelleEmail", "zelleName", "paymentNotes",
       "prizesText", active,
       "createdAt", "updatedAt"
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, true,
       NOW(), NOW()
     )`,
    [
      ligaId,
      LIGA.slug,
      LIGA.name,
      LIGA.description,
      ownerId,
      LIGA.priceUsd,
      LIGA.quinielasPerPurchase,
      LIGA.pagoMovilPhone,
      LIGA.pagoMovilCedula,
      LIGA.pagoMovilBank,
      LIGA.zelleEmail,
      LIGA.zelleName,
      LIGA.paymentNotes,
      LIGA.prizesText,
    ]
  );

  console.log("\n=== LIGA CREATED ===");
  console.log(`Slug:     ${LIGA.slug}`);
  console.log(`Name:     ${LIGA.name}`);
  console.log(`Owner:    ${OWNER_EMAIL} (id=${ownerId})`);
  console.log(`Price:    $${LIGA.priceUsd} USD x ${LIGA.quinielasPerPurchase} qui`);
  console.log(`\nPublic landing: https://quinielapanas.com/liga/${LIGA.slug}`);
  console.log(`Signup page:    https://quinielapanas.com/liga/${LIGA.slug}/registro`);
  console.log(`Owner panel:    https://quinielapanas.com/liga-admin`);
  console.log(`\nTemp password for owner: ${TEMP_PASSWORD}`);
  console.log(`(Owner debe iniciar sesion y cambiarla)`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
