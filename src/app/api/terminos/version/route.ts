import { NextResponse } from "next/server";
import { TERMS_VERSION, TERMS_LAST_UPDATE } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    version_actual: TERMS_VERSION,
    fecha_ultima_actualizacion: TERMS_LAST_UPDATE,
  });
}
