import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://quiniela_app:Qn1el471b90f706c833453@localhost:5432/quiniela_mundial_2026";

const RULES = `⚽ REGLAS — QUINIELA EQUINOX 2026

🎯 COMO LLENAR LA QUINIELA

1. Predice el marcador de los 72 partidos de Fase de Grupos.
2. Eliminatorias auto-rellenadas: Treintaidosavos, Octavos, Cuartos, Semis y Final muestran los equipos automaticamente segun tus predicciones de grupos. Solo eliges el marcador.
3. Empate en eliminatoria: eliges quien pasa por penales (selector aparece automatico).
4. Goleador del torneo: escribes el nombre del jugador.
5. Campeon, Subcampeon, Tercer lugar: se calculan automatico segun tu prediccion de la Final y del 3er lugar.
6. Puedes editar tus predicciones cuantas veces quieras hasta el cierre de cada fase.

⏰ NO TIENES QUE LLENAR TODA LA QUINIELA DE UNA SOLA VEZ

Puedes ir llenando cada fase. El cierre es 15 minutos antes del primer partido de la fase (hora Venezuela):

• Fase de Grupos: hasta el miercoles 11 de junio 2026, 2:45 pm
• Treintaidosavos (R32): hasta el domingo 28 de junio 2026, 2:45 pm
• Octavos (R16): hasta el sabado 4 de julio 2026, 12:45 pm
• Cuartos de Final: hasta el jueves 9 de julio 2026, 3:45 pm
• Semifinales: hasta el martes 14 de julio 2026, 2:45 pm
• Tercer Lugar: hasta el sabado 18 de julio 2026, 4:45 pm
• Final: hasta el domingo 19 de julio 2026, 2:45 pm

Una vez pasa el cierre de una fase, no se puede editar mas las predicciones de esa fase. Las siguientes fases siguen abiertas para edicion.

🎟️ MULTIPLES QUINIELAS: puedes comprar hasta 10 quinielas en una sola compra ($25 c/u). El sistema te crea automaticamente nickname-1, nickname-2, etc. cuando el admin apruebe el pago.

🏆 PUNTUACION POR PARTIDO (todas las fases x1)

• Marcador exacto: 5 pts
• Ganador correcto: 3 pts
• Un marcador parcial: 1 pt
• Errada: 0 pts

⭐ PUNTUACION POR PREDICCIONES DE TORNEO

• Campeon: 20 pts
• Subcampeon: 10 pts
• Tercer lugar: 5 pts
• Goleador del torneo: 10 pts

💰 PREMIOS GARANTIZADOS

🥇 1er Lugar: $1.000 USD
🥈 2do Lugar: $200 USD
🥉 3er Lugar: $100 USD

Los premios se pagan en Bolivares, Zelle o Binance, segun los pagos que se hayan recibido.

📋 REGLAS ADICIONALES

• Sin comodines: en esta liga NO se usan comodines/multiplicadores especiales.
• Tiempo regular: los marcadores cuentan al final del minuto 90. Tiempo extra y penales NO afectan la puntuacion (los penales solo se usan para definir quien avanza en tu bracket personal cuando hay empate en eliminatoria).
• Empate en el leaderboard: si 2 o mas participantes empatan en un puesto premiado, el premio se divide en partes iguales.
• Partidos sin prediccion: 0 puntos.
• Edicion libre hasta el cierre.

Cualquier duda, contacta al administrador de la liga.`;

const client = new Client({ connectionString });
await client.connect();

const r = await client.query(
  `UPDATE ligas
   SET "prizesText" = $1, "updatedAt" = NOW()
   WHERE slug = 'equinox'
   RETURNING slug, name`,
  [RULES]
);

console.log(`Updated ${r.rowCount}: ${r.rows[0]?.slug} / ${r.rows[0]?.name}`);
console.log(`prizesText length: ${RULES.length} chars`);
await client.end();
