import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiStatus } from "@/lib/api-football";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const status = await getApiStatus();
  if (!status) {
    return NextResponse.json(
      { error: "API-Football no configurada" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    requestsToday: status.requestsToday,
    limitDay: status.limitDay,
    remaining: status.limitDay - status.requestsToday,
  });
}
