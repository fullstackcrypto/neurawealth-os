# Deploy NeuraWealth OS

This repository supports the following deployment modes:

- **Frontend (PWA) → Vercel** — global CDN, automatic HTTPS, SPA routing (recommended)
- **Backend (API) → Railway** — persistent Node.js process for webhooks and proxying
- **Standalone full-stack app** using the root `Dockerfile`
- **Telegram bot only** using `bot/Dockerfile` and `bot/railway.toml`

The hosted multi-tenant SaaS features discussed in `ARCHITECTURE.md` (auth, managed Postgres, exchange custody, strategy marketplace, public performance verification) are not implemented yet. This document covers the deployment paths that are present in the codebase today.

---

## 0. Recommended: Vercel (Frontend) + Railway (Backend)

This is the production architecture for **[NeuraWealthOS.xyz](https://neurawealth-os.xyz)**.

### Step 1 — Deploy the backend to Railway

1. Create a new Railway project and link this repository.
2. Railway will auto-detect the root `Dockerfile` and build the full-stack image.
3. Set the required environment variables on Railway:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `TELEGRAM_BOT_TOKEN=<your-bot-token>` _(never prefix with `VITE_`)\_
   - `ANALYTICS_ENDPOINT=<umami-script-url>` _(optional)_
   - `VITE_COINGECKO_API_KEY=<key>` _(optional)_
4. Note the public Railway URL (e.g. `https://neurawealth-os.up.railway.app`).
5. _(Optional)_ Add a custom subdomain `api.neurawealth-os.xyz` in Railway that points to
   this service. Update your domain registrar DNS with a `CNAME` record pointing `api` to
   the Railway URL.

### Step 2 — Update `vercel.json` API rewrite destination

Open `vercel.json` and update the `/api/:path*` rewrite `destination` to match your Railway
URL:

```json
{
  "source": "/api/:path*",
  "destination": "https://neurawealth-os.up.railway.app/api/:path*"
}
```

If you configured the `api.neurawealth-os.xyz` subdomain, you can use that instead:

```json
{
  "source": "/api/:path*",
  "destination": "https://api.neurawealth-os.xyz/api/:path*"
}
```

### Step 3 — Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Vercel will detect `vercel.json` automatically — no framework preset needed.
3. **Build & Output settings** (auto-detected from `vercel.json`):
   - Build Command: `vite build`
   - Output Directory: `dist/public`
   - Install Command: `pnpm install`
4. Add any required environment variables under **Settings → Environment Variables**:
   - `VITE_COINGECKO_API_KEY` _(optional)_
5. Click **Deploy**.

### Step 4 — Connect the custom domain NeuraWealthOS.xyz

1. In your Vercel project go to **Settings → Domains**.
2. Add `neurawealth-os.xyz` and `www.neurawealth-os.xyz`.
3. Vercel will display the DNS records you need to add. In your domain registrar:
   - Add an `A` record for `@` pointing to `76.76.21.21` (Vercel's IP).
   - Add a `CNAME` record for `www` pointing to `cname.vercel-dns.com.`
4. Vercel provisions a free TLS certificate automatically.

### Step 5 — Enable automatic deployments (GitHub Actions)

Add the following secrets to your GitHub repository under
**Settings → Secrets and variables → Actions**:

| Secret              | Where to find it                                               |
| ------------------- | -------------------------------------------------------------- |
| `VERCEL_TOKEN`      | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID`     | Run `vercel whoami` or find in Vercel project settings         |
| `VERCEL_PROJECT_ID` | Vercel project **Settings → General** → Project ID             |

Once the secrets are configured, every push to `main` triggers
`.github/workflows/deploy-vercel.yml`, which runs a production deploy automatically.

---

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
