import { NextResponse } from "next/server";
import { getCurrentBcvRate } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rate = await getCurrentBcvRate();
    return NextResponse.json({
      usd: rate.usdRate,
      eur: rate.eurRate,
      fetchedAt: rate.fetchedAt.toISOString(),
      source: rate.source,
      cached: rate.cached,
    });
  } catch (err) {
    console.error("Rate fetch error:", err);
    return NextResponse.json(
      { error: "No se pudo obtener la tasa BCV" },
      { status: 503 }
    );
  }
}
