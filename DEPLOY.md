# NeuraWealth OS — Deployment Guide

> Zero-to-running in under 5 minutes. Choose the method that fits your workflow.

---

## Table of Contents

- [One-Click Cloud Deploy](#one-click-cloud-deploy)
- [Docker (Local or Self-Hosted)](#docker-local-or-self-hosted)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [Troubleshooting](#troubleshooting)

---

## One-Click Cloud Deploy

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/neurawealth-os?referralCode=neurawealth)

1. Click the button above (or go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub Repo**).
2. Connect your GitHub account and select the `neurawealth-os` repository.
3. Railway auto-detects the `railway.toml` and `Dockerfile`.
4. Add environment variables in the Railway dashboard (see [Environment Variables](#environment-variables)).
5. Click **Deploy** — your app will be live at `https://<your-project>.up.railway.app`.

### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/fullstackcrypto/neurawealth-os)

1. Click the button above.
2. Render reads the `render.yaml` blueprint and provisions the service automatically.
3. Fill in optional environment variables when prompted.
4. Your app will be live at `https://neurawealth-os.onrender.com`.

### Fly.io

```bash
# Install the Fly CLI (https://fly.io/docs/flyctl/install/)
curl -L https://fly.io/install.sh | sh

# Authenticate
fly auth login

# Deploy from the repo root (reads fly.toml automatically)
fly launch --copy-config --yes

# Set secrets (optional)
fly secrets set VITE_COINGECKO_API_KEY=your_key
fly secrets set VITE_TELEGRAM_BOT_TOKEN=your_token
```

Your app will be live at `https://neurawealth-os.fly.dev`.

### Vercel + Railway (Recommended for Production)

For the best production setup, deploy the frontend and backend separately as described in [ARCHITECTURE.md](ARCHITECTURE.md):

| Component         | Platform | Why                                                    |
| ----------------- | -------- | ------------------------------------------------------ |
| Frontend (PWA)    | Vercel   | Global CDN, zero-config, automatic HTTPS               |
| Backend (API/Bot) | Railway  | Persistent process, no cold starts, background workers |

**Frontend on Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Backend on Railway:**
Follow the Railway instructions above — the `railway.toml` at the project root handles the full-stack build.

---

## Docker (Local or Self-Hosted)

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/fullstackcrypto/neurawealth-os.git
cd neurawealth-os

# 2. Copy environment template
cp .env.example .env
# Edit .env with your values

# 3. Start all services
docker compose up -d

# 4. View logs
docker compose logs -f
```

The app will be available at `http://localhost:3000`.

### Build and Run (Without Compose)

```bash
# Build the image
docker build -t neurawealth-os .

# Run the container
docker run -d \
  --name neurawealth \
  -p 3000:3000 \
  --env-file .env \
  neurawealth-os
```

### Multi-Container Setup

The `docker-compose.yml` includes:

| Service | Description                     | Port |
| ------- | ------------------------------- | ---- |
| `app`   | Full-stack app (frontend + API) | 3000 |
| `bot`   | Telegram bot (Python)           | —    |

The bot service depends on the app being healthy before starting.

---

## Manual Deployment

For traditional VPS or bare-metal deployments:

```bash
# Prerequisites: Node.js 20+, pnpm 10
npm install -g pnpm@10

# Clone and install
git clone https://github.com/fullstackcrypto/neurawealth-os.git
cd neurawealth-os
pnpm install --frozen-lockfile

# Build
pnpm build

# Start
NODE_ENV=production PORT=3000 node dist/index.js
```

Use a process manager like `pm2` for production:

```bash
npm install -g pm2
pm2 start dist/index.js --name neurawealth-os
pm2 save
pm2 startup
```

---

## Environment Variables

All variables are optional. Copy `.env.example` to `.env` and fill in the values you need.

| Variable                    | Required | Description                                   |
| --------------------------- | -------- | --------------------------------------------- |
| `PORT`                      | No       | HTTP server port (default: `3000`)            |
| `NODE_ENV`                  | No       | `development` or `production`                 |
| `VITE_COINGECKO_API_KEY`    | No       | CoinGecko Pro API key (increases rate limits) |
| `VITE_TELEGRAM_BOT_TOKEN`   | No       | Telegram Bot token from @BotFather            |
| `VITE_ANALYTICS_ENDPOINT`   | No       | Umami analytics base URL                      |
| `VITE_ANALYTICS_WEBSITE_ID` | No       | Umami website ID                              |
| `VITE_GOOGLE_MAPS_API_KEY`  | No       | Google Maps JavaScript API key                |

> **Security:** Variables prefixed with `VITE_` are embedded into the client bundle. Never store private keys or secrets in `VITE_` variables. See [ARCHITECTURE.md](ARCHITECTURE.md) for the proxy pattern.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Docker Host                       │
│                                                     │
│  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │   neurawealth-app    │  │  neurawealth-bot     │  │
│  │                      │  │                      │  │
│  │  ┌────────────────┐  │  │  Python Telegram     │  │
│  │  │  Vite Build    │  │  │  Bot (long-polling)  │  │
│  │  │  (static PWA)  │  │  │                      │  │
│  │  ├────────────────┤  │  └─────────────────────┘  │
│  │  │  Express API   │  │                           │
│  │  │  (port 3000)   │  │                           │
│  │  └────────────────┘  │                           │
│  └──────────────────────┘                           │
└─────────────────────────────────────────────────────┘
```

The full-stack container serves both the static PWA (from `dist/public/`) and the Express API from a single Node.js process on port 3000.

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

### Port conflict

Change the host port in `docker-compose.yml` or pass a different port:

```bash
PORT=8080 docker compose up -d
```

### Health check failing

The health check hits `http://localhost:3000/`. Ensure:

- The `PORT` env var matches the `EXPOSE` port in the Dockerfile.
- No firewall rules are blocking localhost connections inside the container.

### Build fails in Docker

```bash
# Ensure you're not missing files — check .dockerignore
docker build --progress=plain -t neurawealth-os .
```
