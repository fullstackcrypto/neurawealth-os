import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const helmet = require('helmet');

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for accurate client IP
  app.set('trust proxy', 1);

  // Improved Content Security Policy (CSP) setup
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", process.env.VITE_ANALYTICS_ENDPOINT],
        styleSrc: ["'self'"]
      }
    }
  }));

  // Parse JSON request bodies
  app.use(express.json());

  // Server-side Telegram API proxy endpoint
  app.post('/api/telegram/send', async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'Telegram bot token not configured' });
    }

    const { chat_id, text, parse_mode } = req.body;
    if (!chat_id || !text) {
      return res.status(400).json({ error: 'chat_id and text are required' });
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text, parse_mode: parse_mode || 'Markdown' }),
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Telegram API error:', error);
      res.status(502).json({ error: 'Failed to reach Telegram API' });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
