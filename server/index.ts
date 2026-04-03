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
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
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
  const server = createServer(app);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // Note: 'unsafe-inline' is required because the Vite/React build emits
    // inline styles and bootstrap scripts. In a future iteration, nonces or
    // a stricter hash-based policy can replace these directives.
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.coingecko.com https:",
        "frame-ancestors 'none'",
      ].join("; ")
    );
    next();
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
    if (!resolvedIndex.startsWith(resolvedBase + path.sep) && resolvedIndex !== resolvedBase) {
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
