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
const analyticsEndpoint = process.env.ANALYTICS_ENDPOINT;
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          ...(analyticsEndpoint ? [analyticsEndpoint] : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.coingecko.com",
          "https://api.telegram.org",
        ],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── Parse JSON bodies ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));

// ── Telegram send proxy ───────────────────────────────────────────────────────
// Keeps TELEGRAM_BOT_TOKEN server-side — never exposed to the client bundle.
// Requests must include an x-telegram-secret header matching TELEGRAM_PROXY_SECRET.
app.post("/api/telegram/send", async (req, res) => {
  const proxySecret = process.env.TELEGRAM_PROXY_SECRET;
  if (!proxySecret) {
    res.status(503).json({ error: "Telegram bot not configured" });
    return;
  }

  const clientSecret = req.headers["x-telegram-secret"];
  if (!clientSecret || clientSecret !== proxySecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(503).json({ error: "Telegram bot not configured" });
    return;
  }

  try {
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );
    const data = await telegramRes.json();
    res.status(telegramRes.status).json(data);
  } catch (err) {
    console.error("Telegram API error:", err);
    res.status(502).json({ error: "Telegram API unreachable" });
  }
});

// ── Serve static build output ─────────────────────────────────────────────────
const distDir = path.resolve(__dirname, "public");
app.use(express.static(distDir, { dotfiles: "deny" }));

// ── SPA fallback — serve index.html for all non-API routes ───────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
