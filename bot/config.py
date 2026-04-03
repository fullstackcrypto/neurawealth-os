"""
NeuraWealth OS Telegram Bot — Configuration & Constants
========================================================
All configurable values are loaded from environment variables with sensible
defaults so the bot can start in development mode without a .env file.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Telegram ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")

# ── CoinGecko ─────────────────────────────────────────────────────────────────
COINGECKO_BASE_URL: str = "https://api.coingecko.com/api/v3"
COINGECKO_API_KEY: str = os.getenv("COINGECKO_API_KEY", "")  # Optional pro key

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_PATH: str = os.getenv("DATABASE_PATH", "neurawealth.db")

# ── Stripe (placeholder) ─────────────────────────────────────────────────────
STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# ── Subscription Tiers ────────────────────────────────────────────────────────
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "price": 0,
        "commands": ["start", "price", "trending", "help", "subscribe"],
        "description": "Basic market data access",
        "emoji": "🆓",
    },
    "premium": {
        "name": "Premium",
        "price": 49,
        "commands": [
            "start", "price", "trending", "help", "subscribe",
            "signals", "portfolio", "add", "remove", "alert",
            "report",
        ],
        "description": "Full signals, alerts, portfolio & daily reports",
        "emoji": "⭐",
        "payment_link": os.getenv(
            "STRIPE_PREMIUM_LINK",
            "https://buy.stripe.com/PLACEHOLDER_PREMIUM",
        ),
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 149,
        "commands": [
            "start", "price", "trending", "help", "subscribe",
            "signals", "portfolio", "add", "remove", "alert",
            "report",
        ],
        "description": "All Premium features + API access + priority signals",
        "emoji": "🏢",
        "payment_link": os.getenv(
            "STRIPE_ENTERPRISE_LINK",
            "https://buy.stripe.com/PLACEHOLDER_ENTERPRISE",
        ),
    },
}

# ── Technical Analysis Defaults ───────────────────────────────────────────────
RSI_PERIOD: int = 14
EMA_SHORT: int = 9
EMA_LONG: int = 21
MACD_FAST: int = 12
MACD_SLOW: int = 26
MACD_SIGNAL: int = 9

# ── Monitored Coins (CoinGecko IDs) ──────────────────────────────────────────
MONITORED_COINS: list[str] = [
    "bitcoin", "ethereum", "binancecoin", "solana", "ripple",
    "cardano", "dogecoin", "polkadot", "avalanche-2", "chainlink",
    "polygon-ecosystem-token", "litecoin", "uniswap", "cosmos",
    "stellar", "near", "internet-computer", "aptos", "sui",
    "arbitrum",
]

# ── Coin Symbol → CoinGecko ID Mapping ───────────────────────────────────────
SYMBOL_TO_ID: dict[str, str] = {
    "btc": "bitcoin",
    "eth": "ethereum",
    "bnb": "binancecoin",
    "sol": "solana",
    "xrp": "ripple",
    "ada": "cardano",
    "doge": "dogecoin",
    "dot": "polkadot",
    "avax": "avalanche-2",
    "link": "chainlink",
    "pol": "polygon-ecosystem-token",
    "matic": "polygon-ecosystem-token",
    "ltc": "litecoin",
    "uni": "uniswap",
    "atom": "cosmos",
    "xlm": "stellar",
    "near": "near",
    "icp": "internet-computer",
    "apt": "aptos",
    "sui": "sui",
    "arb": "arbitrum",
    "op": "optimism",
    "ftm": "fantom",
    "aave": "aave",
    "mkr": "maker",
    "snx": "havven",
    "crv": "curve-dao-token",
    "inj": "injective-protocol",
    "sei": "sei-network",
    "tia": "celestia",
    "jup": "jupiter-exchange-solana",
    "render": "render-token",
    "fet": "fetch-ai",
    "pepe": "pepe",
    "shib": "shiba-inu",
    "wif": "dogwifcoin",
    "bonk": "bonk",
}

# ── Scheduler Intervals ──────────────────────────────────────────────────────
SIGNAL_INTERVAL_HOURS: int = 4
ALERT_CHECK_INTERVAL_SECONDS: int = 60
DAILY_REPORT_HOUR_UTC: int = 8

# ── Rate Limiting ─────────────────────────────────────────────────────────────
COINGECKO_RATE_LIMIT: float = 1.5  # seconds between API calls (free tier)

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT: str = "%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s"

# ── Welcome Sequence Delays (seconds) ────────────────────────────────────────
WELCOME_DELAYS = [0, 3600, 86400]  # Immediately, 1 hour, 24 hours
