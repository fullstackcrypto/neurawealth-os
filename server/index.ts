import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory rate limiter for the SPA fallback route
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 120; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function rateLimitMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).set("Retry-After", "60").end("Too Many Requests");
    return;
  }
  next();
}

// Periodically clean up expired entries to avoid memory growth
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  });
}, RATE_LIMIT_WINDOW_MS);

async function startServer() {
  const app = express();

  // Trust the first proxy in the chain (Vercel / Railway edge)
  app.set("trust proxy", 1);

  // Remove the X-Powered-By header to avoid advertising Express version
  app.disable("x-powered-by");

  const server = createServer(app);

  // Build the script-src directive, optionally including the analytics endpoint
  const analyticsEndpoint = process.env.ANALYTICS_ENDPOINT ?? "";
  const scriptSrcDirective = analyticsEndpoint
    ? `script-src 'self' 'unsafe-inline' ${analyticsEndpoint}`
    : "script-src 'self' 'unsafe-inline'";

  // Security headers
  // Note: 'unsafe-inline' in script-src/style-src is required because the
  // Vite/React build emits inline bootstrap scripts and styles. A nonce-based
  // policy is the correct long-term fix but requires SSR integration.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        scriptSrcDirective,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.coingecko.com https://api.telegram.org",
        "frame-ancestors 'none'",
      ].join("; ")
    );
    next();
  });

  // Parse JSON request bodies for API routes
  app.use(express.json({ limit: "64kb" }));

  // ─────────────────────────────────────────────────────────
  // API: Telegram send proxy
  // Keeps TELEGRAM_BOT_TOKEN server-side — never exposed to the
  // client bundle.
  // ─────────────────────────────────────────────────────────
  app.post("/api/telegram/send", rateLimitMiddleware, async (req, res) => {
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

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(
    express.static(staticPath, {
      index: false, // We handle the index explicitly below
      dotfiles: "deny",
    })
  );

  // Handle client-side routing — serve a fixed index.html for all GET requests
  // that don't match a static file.  The path is never derived from user input,
  // so there is no path-traversal risk; the rate limiter guards against DoS.
  app.get("*", rateLimitMiddleware, (_req, res) => {
    const resolvedBase = path.resolve(staticPath);
    const resolvedIndex = path.resolve(staticPath, "index.html");
    // Sanity-check: index must remain inside the static root
    if (!resolvedIndex.startsWith(resolvedBase + path.sep)) {
      res.status(403).end();
      return;
    }
    res.sendFile(resolvedIndex, (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        res.status(500).end();
      }
    });
  });

  const port = Number(process.env.PORT) || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);