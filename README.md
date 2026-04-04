# NeuraWealth OS

> **The World's First Autonomous AI Wealth Engine** — AI-powered crypto signals, trading bots, and mining intelligence.

[![CI](https://github.com/fullstackcrypto/neurawealth-os/actions/workflows/ci.yml/badge.svg)](https://github.com/fullstackcrypto/neurawealth-os/actions/workflows/ci.yml)
[![CodeQL](https://github.com/fullstackcrypto/neurawealth-os/actions/workflows/codeql.yml/badge.svg)](https://github.com/fullstackcrypto/neurawealth-os/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Overview

NeuraWealth OS is a production-grade Progressive Web Application (PWA) designed to give investors and traders an intelligent, data-rich command center for navigating cryptocurrency markets. It features real-time market data via the CoinGecko API, AI-powered trading signals, Telegram bot integration, mining intelligence dashboards, and a rich "Quantum Noir" UI.

---

## Features

| Feature                      | Description                                                                |
| ---------------------------- | -------------------------------------------------------------------------- |
| 📊 **Live Market Dashboard** | Real-time coin prices, market caps, and 7-day sparklines via CoinGecko     |
| 🤖 **AI Signals**            | Technical-analysis-driven BUY / HOLD / SELL signals with confidence scores |
| 🤖 **Trading Bot**           | Automated strategy executor with configurable risk parameters              |
| ⛏️ **Mining Intelligence**   | Hashrate, profitability, and energy cost monitoring                        |
| 💬 **Telegram Bot**          | Push-signal delivery to your Telegram channel or group                     |
| 🛒 **Marketplace**           | Curated DeFi tools and strategy templates                                  |
| 📈 **Revenue Pipeline**      | Track cumulative P&L, win/loss rates, and portfolio allocation             |
| 🌐 **PWA**                   | Installable on mobile and desktop; works offline via service worker        |

---

## Tech Stack

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| **Frontend**        | React 19, TypeScript, Vite 7, Tailwind CSS 4  |
| **UI Components**   | Radix UI primitives + shadcn/ui design system |
| **Routing**         | Wouter                                        |
| **Charts**          | Recharts                                      |
| **Server**          | Express 4 + Helmet + express-rate-limit       |
| **Build / Bundle**  | Vite (client) + esbuild (server)              |
| **Package Manager** | pnpm 10                                       |
| **Type Safety**     | TypeScript 5 (strict mode)                    |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [pnpm](https://pnpm.io/) v10 (`npm install -g pnpm@10`)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/fullstackcrypto/neurawealth-os.git
cd neurawealth-os

# 2. Install dependencies
pnpm install

# 3. Copy the environment template and fill in your values
cp .env.example .env
```

### Development

```bash
pnpm dev        # Start Vite dev server on http://localhost:3000
```

### Production

```bash
pnpm build      # Build frontend (dist/public) + server (dist/index.js)
pnpm start      # Start production server on PORT (default 3000)
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. **Never commit `.env` to version control.**

| Variable                    | Required | Description                                      |
| --------------------------- | -------- | ------------------------------------------------ |
| `PORT`                      | No       | HTTP server port (default: `3000`)               |
| `NODE_ENV`                  | No       | `development` or `production`                    |
| `VITE_ANALYTICS_ENDPOINT`   | No       | Umami analytics base URL                         |
| `VITE_ANALYTICS_WEBSITE_ID` | No       | Umami website ID                                 |
| `VITE_COINGECKO_API_KEY`    | No       | CoinGecko Pro API key (increases rate limits)    |
| `TELEGRAM_BOT_TOKEN`        | No       | Telegram Bot token (server-side only)            |
| `VITE_GOOGLE_MAPS_API_KEY`  | No       | Google Maps JavaScript API key (for Map feature) |

> **Security note:** Variables prefixed with `VITE_` are embedded into the client bundle and are publicly visible. Never store private keys or secrets in `VITE_` variables.

---

## Project Structure

```
neurawealth-os/
├── client/               # Frontend React application
│   ├── public/           # Static assets (manifest, icons, SW)
│   └── src/
│       ├── components/   # Shared UI components
│       ├── contexts/     # React context providers
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities, mock data, API helpers
│       └── pages/        # Route-level page components
├── server/               # Express production server
│   └── index.ts
├── shared/               # Code shared between client and server
│   └── const.ts
├── patches/              # pnpm patches for dependency overrides
├── .github/
│   └── workflows/        # CI/CD pipelines
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Scripts

| Command        | Description                        |
| -------------- | ---------------------------------- |
| `pnpm dev`     | Start Vite development server      |
| `pnpm build`   | Production build (client + server) |
| `pnpm start`   | Start production server            |
| `pnpm check`   | TypeScript type-check (no emit)    |
| `pnpm format`  | Format all files with Prettier     |
| `pnpm preview` | Preview production build locally   |

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## Security

To report a security vulnerability, please read [SECURITY.md](SECURITY.md). Do **not** open a public GitHub issue for security concerns.

---

## License

This project is licensed under the [MIT License](LICENSE).
