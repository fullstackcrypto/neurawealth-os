# NeuraWealth OS — Telegram Bot

AI-powered crypto intelligence bot for Telegram with live trading signals, portfolio tracking, price alerts, and automated delivery.

## Features

| Feature                          | Free | Premium ($49/mo) | Enterprise ($149/mo) |
| -------------------------------- | ---- | ---------------- | -------------------- |
| Live crypto prices (`/price`)    | Yes  | Yes              | Yes                  |
| Trending coins (`/trending`)     | Yes  | Yes              | Yes                  |
| AI trading signals (`/signals`)  | —    | Yes              | Yes                  |
| Portfolio tracker (`/portfolio`) | —    | Yes              | Yes                  |
| Price alerts (`/alert`)          | —    | Yes              | Yes                  |
| Daily market reports (`/report`) | —    | Yes              | Yes                  |
| Auto-signal delivery (4h)        | —    | Yes              | Yes                  |
| Daily summary (8 AM UTC)         | —    | Yes              | Yes                  |
| API access                       | —    | —                | Yes                  |
| Priority signals                 | —    | —                | Yes                  |

## Signal Generation

The bot analyses 20+ cryptocurrencies using three technical indicators computed from 30 days of historical price data fetched from the CoinGecko API.

**RSI (14-period)** measures momentum on a 0–100 scale. Values below 30 indicate oversold conditions (bullish), while values above 70 indicate overbought conditions (bearish). The RSI component contributes up to 20 points to the confidence score.

**EMA 9/21 Crossover** detects trend changes. When the short-term EMA (9) crosses above the long-term EMA (21), a bullish crossover is identified. The reverse indicates a bearish crossover. This component contributes up to 15 points.

**MACD (12/26/9)** confirms trend direction and momentum. A bullish crossover of the MACD line above the signal line adds up to 15 points. The histogram direction provides additional confirmation.

The composite confidence score ranges from 0 to 100, starting at a neutral baseline of 50. Scores above 65 generate a BUY signal, scores below 35 generate a SELL signal, and everything in between is classified as HOLD.

## Quick Start

### Prerequisites

You need Python 3.11 or later and a Telegram Bot Token from [@BotFather](https://t.me/BotFather).

### Local Development

```bash
# Clone the repository
git clone https://github.com/fullstackcrypto/neurawealth-os.git
cd neurawealth-os/bot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your TELEGRAM_BOT_TOKEN

# Run the bot
python bot.py
```

### Docker

```bash
docker build -t neurawealth-bot .
docker run -d --env-file .env --name neurawealth-bot neurawealth-bot
```

### Railway Deployment

The bot is pre-configured for one-click deployment to [Railway](https://railway.app).

1. Fork this repository or push to your own GitHub account.
2. Go to [railway.app](https://railway.app) and create a new project.
3. Select "Deploy from GitHub repo" and choose this repository.
4. Add the environment variable `TELEGRAM_BOT_TOKEN` in the Railway dashboard.
5. Railway will automatically build and deploy the bot using the included `Dockerfile` and `railway.toml`.

## Project Structure

```
bot/
├── bot.py                 # Main application — command handlers and entry point
├── signals.py             # Signal generation engine and message formatting
├── technical_analysis.py  # RSI, MACD, EMA calculations and confidence scorer
├── coingecko.py           # Async CoinGecko API client with rate limiting
├── database.py            # SQLite database handler for users, portfolios, alerts
├── scheduler.py           # Automated signal delivery, alert monitoring, welcome sequence
├── config.py              # Configuration constants loaded from environment
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker configuration for Railway
├── railway.toml           # Railway deployment configuration
├── .env.example           # Environment variable template
└── README.md              # This file
```

## Commands

| Command                 | Description                               | Tier    |
| ----------------------- | ----------------------------------------- | ------- |
| `/start`                | Welcome message with platform overview    | Free    |
| `/price [coin]`         | Live price of any cryptocurrency          | Free    |
| `/trending`             | Top trending coins from CoinGecko         | Free    |
| `/help`                 | Full command list with descriptions       | Free    |
| `/subscribe`            | View subscription tiers and payment links | Free    |
| `/signals`              | Top 3 BUY signals with confidence scores  | Premium |
| `/portfolio`            | View portfolio with live valuations       | Premium |
| `/add [coin] [amount]`  | Add coin to portfolio                     | Premium |
| `/remove [coin]`        | Remove coin from portfolio                | Premium |
| `/alert [coin] [price]` | Set price alert                           | Premium |
| `/report`               | Daily performance summary                 | Premium |

## Automated Features

The bot runs three scheduled jobs in the background using the `python-telegram-bot` JobQueue.

**Signal Delivery** runs every 4 hours and sends the top 3 BUY signals to all Premium and Enterprise subscribers. The first delivery occurs 60 seconds after bot startup.

**Alert Monitoring** checks all active price alerts every 60 seconds. When a coin's price crosses the user's target threshold, the alert is triggered and the user receives an immediate notification. Alerts are one-shot and deactivate after triggering.

**Daily Report** is sent at 8:00 AM UTC to all Premium and Enterprise subscribers. It includes a summary of BUY, SELL, and HOLD signals across all monitored coins, along with the top opportunities and caution signals.

**Welcome Sequence** sends three messages to new users over a 24-hour period: an immediate welcome (via `/start`), a feature overview after 1 hour, and a subscription CTA after 24 hours.

## Stripe Integration

The bot includes placeholder support for Stripe payment integration. To enable payments, set the following environment variables:

- `STRIPE_SECRET_KEY` — Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Your Stripe webhook signing secret
- `STRIPE_PREMIUM_LINK` — Stripe Checkout link for Premium tier
- `STRIPE_ENTERPRISE_LINK` — Stripe Checkout link for Enterprise tier

When a user completes payment through the Stripe Checkout link, you can use a Stripe webhook to automatically upgrade their subscription tier in the database by calling `db.set_user_tier(user_id, "premium")`.

## License

Proprietary — NeuraWealth OS. All rights reserved.

---

Built with NeuraWealth OS
