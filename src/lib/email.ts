import { Resend } from "resend";
import { FIN_CREAR_QUINIELAS, GUARANTEED_PRIZES } from "@/lib/constants";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? "QuinielaPanas <noreply@quinielapanas.com>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://quinielapanas.com";

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Generic send wrapper. Returns true if sent (or no-ops in dev without key).
 * NEVER throws — email failures must not break payment approval flows.
 */
async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping email to", to);
    return false;
  }
  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });
    if ("error" in result && result.error) {
      console.error("[email] send failed:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", err);
    return false;
  }
}

// --- Shared HTML helpers --------------------------------------------------

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;color:#0f172a;">
    <div style="background:linear-gradient(135deg,#facc15,#f59e0b,#ec4899);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <p style="margin:0;color:#1a1a1a;font-size:11px;letter-spacing:4px;font-weight:800;">QUINIELA MUNDIAL 2026</p>
      <h1 style="margin:6px 0 0;color:#1a1a1a;font-size:32px;font-weight:900;letter-spacing:-0.5px;">QuinielaPanas</h1>
    </div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px 24px;">
      ${body}
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:11px;color:#94a3b8;">
      Este es un mensaje automatico. No respondas a este correo.<br>
      Visita <a href="${APP_URL}" style="color:#cbd5e1;">${APP_URL}</a> para mas info.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deadlineDate(): string {
  return FIN_CREAR_QUINIELAS.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Caracas",
  });
}

// --- Templates -------------------------------------------------------------

export interface ApprovedEmailData {
  to: string;
  userName: string;
  amountUsd: number;
  amountBs?: number | null;
  paymentReference: string;
  paymentMethod: string;
  quinielaNames: string[];
  isLiga: boolean;
  ligaName?: string;
}

export async function sendPaymentApprovedEmail(d: ApprovedEmailData) {
  const ctxLabel = d.isLiga
    ? `Liga ${escapeHtml(d.ligaName ?? "Privada")}`
    : "QuinielaPanas General";
  const ctaUrl = d.isLiga ? `${APP_URL}/predicciones-bracket` : `${APP_URL}/predicciones`;
  const ctaText = d.isLiga ? "Llenar mi bracket" : "Llenar mis predicciones";

  const quinielasList = d.quinielaNames
    .map(
      (n) =>
        `<li style="margin-bottom:4px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-family:monospace;font-weight:bold;">${escapeHtml(n)}</code></li>`
    )
    .join("");

  const prizesSection = d.isLiga
    ? ""
    : `
      <div style="margin-top:24px;padding:16px;background:#fef9c3;border-radius:12px;border-left:4px solid #facc15;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#713f12;">Premios Garantizados</p>
        <p style="margin:0;font-size:13px;color:#854d0e;">
          1er Lugar: $${GUARANTEED_PRIZES.first} USD &middot; 2do: $${GUARANTEED_PRIZES.second} &middot; 3er: $${GUARANTEED_PRIZES.third}<br>
          <span style="font-size:11px;color:#a16207;">Pagados en Bolivares a la tasa del dia.</span>
        </p>
      </div>
    `;

  const body = `
    <div style="margin-bottom:18px;display:inline-block;background:#dcfce7;color:#166534;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;">
      ✅ Pago Aprobado
    </div>
    <h2 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Hola ${escapeHtml(d.userName)},</h2>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#334155;">
      Tu pago fue aprobado y tus quinielas ya estan activas en <strong>${ctxLabel}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#64748b;">Monto:</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;">$${formatUsd(d.amountUsd)} USD${
          d.amountBs ? ` (Bs. ${d.amountBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ""
        }</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;">
        <td style="padding:8px 0;color:#64748b;">Metodo:</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(d.paymentMethod)}</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;">
        <td style="padding:8px 0;color:#64748b;">Referencia:</td>
        <td style="padding:8px 0;text-align:right;font-family:monospace;">${escapeHtml(d.paymentReference)}</td>
      </tr>
    </table>

    <div style="margin-bottom:18px;padding:14px;background:#eff6ff;border-radius:12px;border-left:4px solid #3b82f6;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e40af;">
        ${d.quinielaNames.length} quiniela${d.quinielaNames.length !== 1 ? "s" : ""} creada${d.quinielaNames.length !== 1 ? "s" : ""}:
      </p>
      <ul style="margin:0;padding-left:18px;color:#1e3a8a;font-size:13px;">
        ${quinielasList}
      </ul>
    </div>

    <a href="${ctaUrl}" style="display:block;width:100%;box-sizing:border-box;background:linear-gradient(90deg,#3b82f6,#1d4ed8);color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:15px;margin-bottom:18px;">
      ${ctaText} →
    </a>

    <div style="margin-top:24px;padding:14px;background:#fff1f2;border-radius:12px;border-left:4px solid #f43f5e;">
      <p style="margin:0;font-size:13px;color:#9f1239;">
        <strong>⏰ Cierre:</strong> ${deadlineDate()} (hora Venezuela)
      </p>
    </div>

    ${prizesSection}

    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
      Suerte y a llenar! Si tienes preguntas, escribenos por WhatsApp.
    </p>
  `;

  return send(
    d.to,
    d.isLiga
      ? `Tu pago en ${d.ligaName ?? "tu liga"} fue aprobado`
      : "Tu pago fue aprobado - QuinielaPanas",
    layout("Pago Aprobado", body)
  );
}

export interface RejectedEmailData {
  to: string;
  userName: string;
  amountUsd: number;
  paymentReference: string;
  paymentMethod: string;
  rejectionReason: string | null;
  isLiga: boolean;
  ligaName?: string;
}

export async function sendPaymentRejectedEmail(d: RejectedEmailData) {
  const ctxLabel = d.isLiga
    ? `Liga ${escapeHtml(d.ligaName ?? "Privada")}`
    : "QuinielaPanas";
  const ctaUrl = d.isLiga ? `${APP_URL}/recargas` : `${APP_URL}/recargas`;

  const body = `
    <div style="margin-bottom:18px;display:inline-block;background:#fee2e2;color:#991b1b;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;">
      ❌ Pago Rechazado
    </div>
    <h2 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Hola ${escapeHtml(d.userName)},</h2>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#334155;">
      Tu reporte de pago en <strong>${ctxLabel}</strong> no pudo ser aprobado.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#64748b;">Monto reportado:</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;">$${formatUsd(d.amountUsd)} USD</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;">
        <td style="padding:8px 0;color:#64748b;">Metodo:</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(d.paymentMethod)}</td>
      </tr>
      <tr style="border-top:1px solid #e2e8f0;">
        <td style="padding:8px 0;color:#64748b;">Referencia:</td>
        <td style="padding:8px 0;text-align:right;font-family:monospace;">${escapeHtml(d.paymentReference)}</td>
      </tr>
    </table>

    ${
      d.rejectionReason
        ? `<div style="margin-bottom:18px;padding:14px;background:#fef2f2;border-radius:12px;border-left:4px solid #ef4444;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#7f1d1d;">Motivo:</p>
            <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.4;">${escapeHtml(d.rejectionReason)}</p>
          </div>`
        : ""
    }

    <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#334155;">
      Si crees que es un error o ya enviaste el pago correcto, puedes reportarlo de nuevo desde la app.
    </p>

    <a href="${ctaUrl}" style="display:block;width:100%;box-sizing:border-box;background:linear-gradient(90deg,#f59e0b,#d97706);color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:15px;">
      Reportar pago nuevamente →
    </a>

    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
      Si necesitas ayuda, escribenos por WhatsApp y te asistimos.
    </p>
  `;

  return send(
    d.to,
    `Tu reporte de pago no fue aprobado - QuinielaPanas`,
    layout("Pago Rechazado", body)
  );
}
