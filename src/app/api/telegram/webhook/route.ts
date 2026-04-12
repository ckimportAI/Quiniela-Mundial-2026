import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import { webhookCallback } from "grammy";

// Initialize bot commands
function setupBot() {
  const bot = getBot();
  if (!bot) return null;

  // /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Bienvenido a la Quiniela Mundial 2026! 🏆\n\n" +
        "Usa /vincular <email> para vincular tu cuenta y recibir notificaciones.\n" +
        "Usa /tabla para ver la tabla de posiciones.\n" +
        "Usa /ayuda para mas informacion."
    );
  });

  // /vincular command - links Telegram account with app user
  bot.command("vincular", async (ctx) => {
    const email = ctx.match?.trim();
    if (!email) {
      await ctx.reply("Uso: /vincular tu@email.com");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await ctx.reply(
        "No se encontro una cuenta con ese email. Registrate primero en la app."
      );
      return;
    }

    const chatId = ctx.chat.id.toString();

    await prisma.telegramSubscription.upsert({
      where: { userId: user.id },
      update: { chatId },
      create: { userId: user.id, chatId },
    });

    await ctx.reply(
      `Cuenta vinculada! ${user.name ?? email}\n` +
        "Recibiras notificaciones de resultados y puntos."
    );
  });

  // /tabla command
  bot.command("tabla", async (ctx) => {
    const scores = await prisma.quinielaScore.findMany({
      include: {
        quiniela: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { totalPoints: "desc" },
      take: 10,
    });

    if (scores.length === 0) {
      await ctx.reply("La tabla esta vacia. El torneo aun no ha comenzado.");
      return;
    }

    let message = "🏆 Tabla de Posiciones (Top 10)\n\n";
    scores.forEach((s, i) => {
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      message += `${medal} ${s.quiniela.user.name ?? "?"} (${s.quiniela.name}) - ${s.totalPoints} pts\n`;
    });

    await ctx.reply(message);
  });

  // /ayuda command
  bot.command("ayuda", async (ctx) => {
    await ctx.reply(
      "Comandos disponibles:\n\n" +
        "/vincular <email> - Vincular cuenta\n" +
        "/tabla - Ver tabla de posiciones\n" +
        "/ayuda - Mostrar esta ayuda\n\n" +
        "Recibiras notificaciones automaticas de:\n" +
        "- Resultados de partidos\n" +
        "- Puntos obtenidos\n" +
        "- Recordatorios de predicciones"
    );
  });

  return bot;
}

// Webhook handler
export async function POST(request: NextRequest) {
  const bot = setupBot();
  if (!bot) {
    return NextResponse.json(
      { error: "Bot not configured" },
      { status: 500 }
    );
  }

  try {
    const handler = webhookCallback(bot, "std/http");
    return handler(request);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Setup webhook URL (call once during deployment)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = getBot();
  if (!bot) {
    return NextResponse.json(
      { error: "Bot not configured" },
      { status: 500 }
    );
  }

  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/telegram/webhook`;

  try {
    await bot.api.setWebhook(webhookUrl);
    return NextResponse.json({ message: "Webhook set", url: webhookUrl });
  } catch (error) {
    console.error("Set webhook error:", error);
    return NextResponse.json(
      { error: "Failed to set webhook" },
      { status: 500 }
    );
  }
}
