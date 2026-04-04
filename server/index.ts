import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3000;

app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          ...(process.env.VITE_ANALYTICS_ENDPOINT
            ? [process.env.VITE_ANALYTICS_ENDPOINT]
            : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Body parsing
app.use(express.json());

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// General rate limiter applied to all other routes (including the SPA fallback)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Telegram send-message proxy — keeps the bot token server-side only
app.post("/api/telegram/send", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "Telegram bot token not configured" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const chat_id = body.chat_id;
  const text = body.text;
  const parse_mode = body.parse_mode;

  // Validate that chat_id is a non-empty number or string, and text is a non-empty string
  if (
    (typeof chat_id !== "number" && typeof chat_id !== "string") ||
    !chat_id ||
    typeof text !== "string" ||
    !text.trim()
  ) {
    res.status(400).json({ error: "chat_id and text are required" });
    return;
  }

  const resolvedParseMode =
    typeof parse_mode === "string" ? parse_mode : "Markdown";

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: resolvedParseMode,
        }),
      }
    );
    const data = (await response.json()) as Record<string, unknown>;
    // Forward only the fields the caller needs; do not leak internal Telegram details
    res.json({ ok: data.ok, result: data.ok ? data.result : undefined });
  } catch (error) {
    console.error("Telegram API error:", error);
    res.status(502).json({ error: "Failed to reach Telegram API" });
  }
});

// Serve the built client bundle in production
const distPublic = path.join(__dirname, "public");
app.use(express.static(distPublic));

// SPA fallback — let the client-side router handle all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPublic, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
