# Deploy NeuraWealth OS

This repository currently supports two practical deployment modes:

- **Standalone full-stack app** using the root `Dockerfile`
- **Telegram bot only** using `bot/Dockerfile` and `bot/railway.toml`

The hosted multi-tenant SaaS features discussed in `ARCHITECTURE.md` (auth, managed Postgres, exchange custody, strategy marketplace, public performance verification) are not implemented yet. This document covers the deployment paths that are present in the codebase today.

## 1. Local Docker run

```bash
cp .env.example .env

docker compose up --build
```

The app will be available at `http://localhost:3000`.

Health check endpoint:

```bash
curl http://localhost:3000/healthz
```

## 2. Standalone container

```bash
docker build -t neurawealth-os .
docker run --rm -p 3000:3000 --env-file .env neurawealth-os
```

## 3. Railway or Render

Use the root `Dockerfile` for the web app.

Required variables:

- `NODE_ENV=production`
- `PORT=3000`
- `VITE_ANALYTICS_ENDPOINT` (optional)
- `VITE_ANALYTICS_WEBSITE_ID` (optional)
- `VITE_COINGECKO_API_KEY` (optional)

### Important secret handling note

Do **not** place private secrets in variables prefixed with `VITE_`. Those values are exposed to the client bundle.

## 4. Bot-only deployment

The Telegram bot can be deployed independently from the `bot/` directory.

See:

- `bot/README.md`
- `bot/Dockerfile`
- `bot/railway.toml`

## 5. Current limitations

The current repository does **not** yet provide:

- managed user accounts
- hosted exchange connections
- live order execution
- Postgres/Prisma persistence
- backtesting infrastructure
- public verified P&L

Deploy it as a dashboard plus Telegram bot platform, not as a finished autonomous trading SaaS.
