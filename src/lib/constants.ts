// World Cup 2026 start date (first match)
export const TOURNAMENT_START_DATE = new Date("2026-06-11T00:00:00Z");

// Deadline for tournament predictions (end of group stage)
export const TOURNAMENT_PREDICTIONS_DEADLINE = new Date("2026-07-03T23:59:59Z");

// App metadata
export const APP_NAME = "Quiniela Mundial 2026";
export const APP_DESCRIPTION =
  "Quiniela del Mundial FIFA 2026 - Predice resultados y compite con tus amigos";

// Terms & Privacy
export const TERMS_VERSION = "1.0";
export const TERMS_LAST_UPDATE = "2026-04-23";
export const CONTACT_EMAIL = "quinielapanas@gmail.com";
export const ENTRY_FEE_USD = 12;

// Launch 2x1 promo
export const PROMO_2X1_START = new Date("2026-04-23T00:00:00-04:00"); // VET
export const PROMO_2X1_END = new Date("2026-06-04T23:59:59-04:00");
export const PROMO_2X1_MULTIPLIER = 2;

export function isPromo2x1Active(at: Date = new Date()): boolean {
  return at >= PROMO_2X1_START && at <= PROMO_2X1_END;
}

// Pago Movil (Venezuela)
export const PAGO_MOVIL = {
  phone: "0414-234-3406",
  cedula: "V-11.037.269",
  bank: "Banesco",
};
