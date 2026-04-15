import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ── Trust proxy (Railway/Vercel) ─────────────────────────────────────────────
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://api.coingecko.com",
          "https://api.telegram.org",
        ],
        scriptSrc: [
          "'self'",
          ...(process.env.ANALYTICS_ENDPOINT
            ? [process.env.ANALYTICS_ENDPOINT]
            : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://coin-images.coingecko.com",
          "https://assets.coingecko.com",
        ],
        fontSrc: ["'self'", "data:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use("/api/", apiLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Telegram proxy endpoint ───────────────────────────────────────────────────
app.post("/api/telegram/send", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Bot token not configured" });
  }

  const { chat_id, text, parse_mode } = req.body as {
    chat_id?: unknown;
    text?: unknown;
    parse_mode?: unknown;
  };
  if (!chat_id || !text) {
    return res.status(400).json({ error: "chat_id and text are required" });
  }

  const allowedParseModes = ["Markdown", "MarkdownV2", "HTML"];
  const safeParseMode =
    allowedParseModes.includes(String(parse_mode)) ? String(parse_mode) : "Markdown";

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, parse_mode: safeParseMode }),
      }
    );
    const data = (await tgRes.json()) as { ok: boolean; result?: unknown };
    if (!data.ok) {
      return res.status(502).json({ error: "Telegram API error", detail: data });
    }
    res.json({ ok: true, result: data.result });
  } catch {
    res.status(500).json({ error: "Failed to reach Telegram API" });
  }
});

// ── Telegram webhook endpoint ─────────────────────────────────────────────────
app.post("/api/telegram/webhook", (_req, res) => {
  // Webhook handler stub — extend when Python bot is moved server-side
  res.sendStatus(200);
});

// ── Static files (production build) ──────────────────────────────────────────
const distPath = path.resolve(__dirname, "public");
app.use(express.static(distPath, { dotfiles: "deny" }));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (_req, res) => {
  const resolvedBase = path.resolve(distPath);
  const resolvedIndex = path.resolve(distPath, "index.html");
  if (!resolvedIndex.startsWith(resolvedBase + path.sep)) {
    return res.status(403).end();
  }
  res.sendFile(resolvedIndex);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[NeuraWealth OS] Server running on port ${PORT}`);
});
