import { prisma } from "@/lib/prisma";

const BCV_API_URL = "https://pydolarve.org/api/v1/dollar?page=bcv";
const CACHE_MINUTES = 30;

export interface BcvRate {
  usdRate: number;
  eurRate: number;
  fetchedAt: Date;
  source: string;
  cached: boolean;
}

interface PyDolarVeResponse {
  monitors?: {
    usd?: { price?: number };
    eur?: { price?: number };
  };
  datetime?: { date?: string; time?: string };
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

  // Fetch from pydolarve.org
  try {
    const res = await fetch(BCV_API_URL, {
      // Server-side fetch, no next cache
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`pydolarve HTTP ${res.status}`);

    const data: PyDolarVeResponse = await res.json();
    const usd = data?.monitors?.usd?.price ?? 0;
    const eur = data?.monitors?.eur?.price ?? 0;

    if (!usd || !eur) throw new Error("Incomplete rate data");

    const saved = await prisma.exchangeRate.create({
      data: {
        source: "BCV",
        usdRate: usd,
        eurRate: eur,
        rawData: data as unknown as object,
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
