/**
 * Telegram Bot Integration
 *
 * This module provides the signal formatting and webhook handling logic
 * for the NeuraWealth OS Telegram bot integration.
 *
 * In production, the webhook endpoint (/api/telegram/webhook) would be
 * handled by a backend server. This module provides the formatting
 * functions and command handlers that the backend would use.
 *
 * Signals are sent via the backend proxy endpoint (/api/telegram/send)
 * so that the bot token is never exposed to the client bundle.
 */

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

export interface BotCommand {
  command: string;
  description: string;
  handler: (args: string[]) => string;
}

/**
 * Send a message via the backend Telegram proxy.
 * The bot token never leaves the server — the client only calls this
 * endpoint, which forwards the request to the Telegram Bot API.
 */
export async function sendTelegramSignal(signalData: {
  chat_id: string | number;
  text: string;
  parse_mode?: string;
}): Promise<{ ok: boolean; description?: string }> {
  const secret = import.meta.env.VITE_TELEGRAM_PROXY_SECRET;
  if (!secret) {
    throw new Error("VITE_TELEGRAM_PROXY_SECRET is not configured");
  }
  const response = await fetch("/api/telegram/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-secret": secret,
    },
    body: JSON.stringify(signalData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to send signal");
  }
  return response.json();
}

// Format a crypto signal for Telegram (Markdown V2)
export function formatSignalMessage(
  coinName: string,
  symbol: string,
  price: number,
  signal: "BUY" | "SELL" | "HOLD",
  confidence: number,
  rsi: number,
  emaCrossover: string,
  macdSignal: string
): string {
  const emoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "🟡";

  return [
    `${emoji} *${coinName} (${symbol.toUpperCase()})* ${emoji}`,
    "",
    `💰 Price: $${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
    `📊 Signal: *${signal}*`,
    `🤖 AI Confidence: ${confidence}%`,
    "",
    `📈 RSI(14): ${rsi.toFixed(1)}`,
    `📉 EMA 9/21: ${emaCrossover}`,
    `📊 MACD: ${macdSignal}`,
    "",
    `_Powered by NeuraWealth OS_`,
  ].join("\n");
}

// Format daily report for Telegram
export function formatDailyReport(
  buyCount: number,
  holdCount: number,
  sellCount: number,
  topMover: { name: string; change: number },
  biggestDrop: { name: string; change: number },
  totalSignals: number
): string {
  return [
    "📊 *Daily Market Report*",
    "",
    `🟢 BUY Signals: ${buyCount}`,
    `🟡 HOLD Signals: ${holdCount}`,
    `🔴 SELL Signals: ${sellCount}`,
    "",
    `Top Mover: ${topMover.name} (+${topMover.change.toFixed(1)}%)`,
    `Biggest Drop: ${biggestDrop.name} (${biggestDrop.change.toFixed(1)}%)`,
    "",
    `Total signals processed: ${totalSignals.toLocaleString()}`,
    "",
    "_Powered by NeuraWealth OS_",
  ].join("\n");
}

// Bot command handlers
export const BOT_COMMANDS: BotCommand[] = [
  {
    command: "/start",
    description: "Initialize the bot",
    handler: () =>
      [
        "🚀 *Welcome to NeuraWealth OS Bot!*",
        "",
        "I'm your AI-powered crypto intelligence assistant.",
        "",
        "Available commands:",
        "/signals - Get latest AI signals",
        "/price [coin] - Get current price",
        "/alert [coin] [price] - Set price alert",
        "/portfolio - View portfolio",
        "/report - Daily market report",
        "",
        "Type any command to get started!",
      ].join("\n"),
  },
  {
    command: "/signals",
    description: "Get latest signals",
    handler: () => "Fetching latest AI signals...",
  },
  {
    command: "/price",
    description: "Get coin price",
    handler: args => {
      const coin = args[0]?.toUpperCase() || "BTC";
      return `Fetching price for ${coin}...`;
    },
  },
  {
    command: "/alert",
    description: "Set price alert",
    handler: args => {
      const coin = args[0]?.toUpperCase() || "BTC";
      const price = args[1] || "0";
      return `✅ Alert set for ${coin} at $${price}`;
    },
  },
  {
    command: "/report",
    description: "Daily report",
    handler: () => "Generating daily market report...",
  },
];

/**
 * Webhook handler documentation:
 *
 * POST /api/telegram/webhook
 *
 * This endpoint receives updates from the Telegram Bot API.
 *
 * Setup:
 * 1. Create a bot via @BotFather on Telegram
 * 2. Get your bot token
 * 3. Set webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *    Body: { "url": "https://your-domain.com/api/telegram/webhook" }
 *
 * The webhook receives TelegramUpdate objects and processes commands.
 *
 * Example Express handler:
 *
 * app.post('/api/telegram/webhook', (req, res) => {
 *   const update: TelegramUpdate = req.body;
 *   const text = update.message?.text || '';
 *   const chatId = update.message?.chat.id;
 *
 *   // Parse command
 *   const [command, ...args] = text.split(' ');
 *   const handler = BOT_COMMANDS.find(c => c.command === command);
 *
 *   if (handler) {
 *     const response = handler.handler(args);
 *     // Send response via Telegram API
 *     await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         chat_id: chatId,
 *         text: response,
 *         parse_mode: 'Markdown',
 *       }),
 *     });
 *   }
 *
 *   res.sendStatus(200);
 * });
 */
