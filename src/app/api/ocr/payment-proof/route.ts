import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { PAYMENTS_DIR } from "@/lib/uploads";

const SYSTEM_PROMPT = `Eres un asistente que extrae informacion de comprobantes de pago venezolanos (Pago Movil, Zelle, transferencia bancaria, Binance).

Responde SOLO con JSON valido, sin texto adicional, con esta estructura:
{
  "method": "Pago Movil" | "Zelle" | "Transferencia bancaria" | "Binance Pay" | null,
  "reference": "string con el numero de referencia/confirmacion" | null,
  "amountBs": number | null,
  "amountUsd": number | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "destinationPhone": "string con telefono destino" | null,
  "destinationName": "string con nombre/cedula destino" | null,
  "sourceBank": "string con banco origen" | null,
  "destinationBank": "string con banco destino" | null,
  "confidence": "high" | "medium" | "low",
  "notes": "string breve con observaciones" | null
}

Reglas:
- Si no puedes leer un campo, usa null (no inventes)
- Los montos en Bs generalmente estan como "Bs. 1.234,56" o "1234,56 Bs" - convierte a numero decimal (ej: 1234.56)
- Los montos en USD se identifican como "USD", "$", "dolares"
- Para referencia busca palabras: "Referencia", "Ref", "Confirmacion", "Nro", "Numero", "ID Operacion"
- El metodo se infiere del banco/app: Banesco/Venezuela/Mercantil = Pago Movil, Zelle muestra nombre destino en ingles, Binance muestra orderId largo
- Si hay dudas marca confidence como "low" o "medium"`;

const USER_PROMPT = `Este es un comprobante de pago. Extrae los datos en el formato JSON indicado. Responde SOLO con el JSON.`;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "OCR no configurado" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const filename: string | undefined = body?.filename;

  if (!filename || !/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(filename)) {
    return NextResponse.json(
      { error: "Filename invalido" },
      { status: 400 }
    );
  }

  const filePath = path.join(PAYMENTS_DIR, filename);

  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(filePath);
  } catch {
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }

  const ext = path.extname(filename).slice(1).toLowerCase();
  const mediaType = (
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg"
  ) as "image/png" | "image/webp" | "image/jpeg";

  const base64 = imageBuffer.toString("base64");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    });

    const text =
      message.content[0]?.type === "text"
        ? message.content[0].text
        : "";

    // Extract JSON from response (robust to accidental prose)
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) {
        return NextResponse.json(
          { error: "No se pudo extraer datos del comprobante", raw: text },
          { status: 422 }
        );
      }
      json = JSON.parse(m[0]);
    }

    return NextResponse.json({
      data: json,
      tokensIn: message.usage.input_tokens,
      tokensOut: message.usage.output_tokens,
    });
  } catch (err) {
    console.error("OCR error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "Error al procesar comprobante", detail: msg },
      { status: 500 }
    );
  }
}
