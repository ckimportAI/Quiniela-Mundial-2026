// Telegram bot client using grammY
// Setup: Create bot with @BotFather, get token, set in env as TELEGRAM_BOT_TOKEN

import { Bot } from "grammy";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: Bot | null = null;

export function getBot(): Bot | null {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured");
    return null;
  }

  if (!bot) {
    bot = new Bot(TELEGRAM_BOT_TOKEN);
  }
  return bot;
}

export async function sendMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  const b = getBot();
  if (!b) return false;

  try {
    await b.api.sendMessage(chatId, text, { parse_mode: "HTML" });
    return true;
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
    return false;
  }
}

export async function notifyMatchResult(
  matchNumber: number,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const subscriptions = await prisma.telegramSubscription.findMany();
  const message =
    `<b>Resultado Final</b>\n` +
    `Partido #${matchNumber}\n` +
    `${homeTeam} <b>${homeScore} - ${awayScore}</b> ${awayTeam}`;

  for (const sub of subscriptions) {
    await sendMessage(sub.chatId, message);
    // Rate limiting: 20 msg/min per chat
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function notifyUserPoints(
  chatId: string,
  matchInfo: string,
  points: number,
  isWildcard: boolean,
  totalPoints: number,
  rank: number | null
): Promise<void> {
  const wildcardText = isWildcard ? " (Comodin x2)" : "";
  const message =
    `<b>Puntos obtenidos</b>\n` +
    `${matchInfo}\n` +
    `Puntos: <b>${points}</b>${wildcardText}\n` +
    `Total: <b>${totalPoints}</b> pts` +
    (rank ? ` | Posicion: #${rank}` : "");

  await sendMessage(chatId, message);
}

export async function notifyLeaderboard(top: number = 10): Promise<void> {
  const scores = await prisma.quinielaScore.findMany({
    include: {
      quiniela: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { totalPoints: "desc" },
    take: top,
  });

  if (scores.length === 0) return;

  let message = `<b>Tabla de Posiciones (Top ${top})</b>\n\n`;
  scores.forEach((s, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    message += `${medal} ${s.quiniela.user.name ?? "?"} (${s.quiniela.name}) - <b>${s.totalPoints}</b> pts\n`;
  });

  const subscriptions = await prisma.telegramSubscription.findMany();
  for (const sub of subscriptions) {
    await sendMessage(sub.chatId, message);
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function notifyPredictionReminder(
  matchNumber: number,
  homeTeam: string,
  awayTeam: string,
  kickoffTime: string
): Promise<void> {
  const subscriptions = await prisma.telegramSubscription.findMany();
  const message =
    `<b>Recordatorio</b>\n` +
    `Partido #${matchNumber}: ${homeTeam} vs ${awayTeam}\n` +
    `Hora: ${kickoffTime}\n` +
    `No olvides hacer tu prediccion!`;

  for (const sub of subscriptions) {
    await sendMessage(sub.chatId, message);
    await new Promise((r) => setTimeout(r, 100));
  }
}
