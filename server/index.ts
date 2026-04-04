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

// Telegram send-message proxy — keeps the bot token server-side only
app.post("/api/telegram/send", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "Telegram bot token not configured" });
    return;
  }

  const { chat_id, text, parse_mode } = req.body as {
    chat_id?: unknown;
    text?: unknown;
    parse_mode?: unknown;
  };

  if (!chat_id || !text) {
    res.status(400).json({ error: "chat_id and text are required" });
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: parse_mode ?? "Markdown",
        }),
      }
    );
    const data = await response.json();
    res.json(data);
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
