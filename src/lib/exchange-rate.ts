import { prisma } from "@/lib/prisma";

const DOLAR_OFICIAL_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const EURO_OFICIAL_URL = "https://ve.dolarapi.com/v1/euros/oficial";
const CACHE_MINUTES = 30;

export interface BcvRate {
  usdRate: number;
  eurRate: number;
  fetchedAt: Date;
  source: string;
  cached: boolean;
}

interface DolarApiResponse {
  moneda?: string;
  fuente?: string;
  promedio?: number;
  compra?: number | null;
  venta?: number | null;
  fechaActualizacion?: string;
}

function toNumber(d: unknown): number {
  if (typeof d === "number") return d;
  if (typeof d === "string") return Number(d);
  if (d && typeof d === "object" && "toString" in d) return Number(d.toString());
  return 0;
}

/**
 * Get current BCV rate (USD and EUR per Bs).
 * Cached in DB for 30 min; fetches pydolarve.org if stale.
 */
export async function getCurrentBcvRate(): Promise<BcvRate> {
  // Try cached rate (< 30 min old)
  const cutoff = new Date(Date.now() - CACHE_MINUTES * 60 * 1000);
  const cached = await prisma.exchangeRate.findFirst({
    where: { fetchedAt: { gte: cutoff } },
    orderBy: { fetchedAt: "desc" },
  });

  if (cached) {
    return {
      usdRate: toNumber(cached.usdRate),
      eurRate: toNumber(cached.eurRate),
      fetchedAt: cached.fetchedAt,
      source: cached.source,
      cached: true,
    };
  }

  // Fetch from ve.dolarapi.com (BCV oficial)
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch(DOLAR_OFICIAL_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) }),
      fetch(EURO_OFICIAL_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) }),
    ]);
    if (!usdRes.ok) throw new Error(`dolarapi USD HTTP ${usdRes.status}`);
    if (!eurRes.ok) throw new Error(`dolarapi EUR HTTP ${eurRes.status}`);

    const usdData: DolarApiResponse = await usdRes.json();
    const eurData: DolarApiResponse = await eurRes.json();
    const usd = Number(usdData?.promedio ?? 0);
    const eur = Number(eurData?.promedio ?? 0);

    if (!usd || !eur) throw new Error("Incomplete rate data");

    const saved = await prisma.exchangeRate.create({
      data: {
        source: "BCV",
        usdRate: usd,
        eurRate: eur,
        rawData: { usd: usdData, eur: eurData } as unknown as object,
      },
    });

    return {
      usdRate: usd,
      eurRate: eur,
      fetchedAt: saved.fetchedAt,
      source: saved.source,
      cached: false,
    };
  } catch (err) {
    // Fallback to latest known rate (even if stale)
    const latest = await prisma.exchangeRate.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
    if (latest) {
      return {
        usdRate: toNumber(latest.usdRate),
        eurRate: toNumber(latest.eurRate),
        fetchedAt: latest.fetchedAt,
        source: latest.source + " (stale)",
        cached: true,
      };
    }
    throw err;
  }
}
