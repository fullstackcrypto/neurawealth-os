"""
NeuraWealth OS Telegram Bot — Main Application
===============================================
Production-ready Telegram bot with live crypto signals, portfolio
tracking, price alerts, signal accuracy tracking, referral system,
free trials, and automated delivery.

Usage:
    TELEGRAM_BOT_TOKEN=xxx python bot.py

Created by Charley for Angie
"""

from __future__ import annotations

import asyncio
import logging
import sys
from typing import Optional

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from coingecko import cg_client
from config import (
    BOT_USERNAME,
    FREE_TRIAL_DAYS,
    LOG_FORMAT,
    LOG_LEVEL,
    REFERRAL_BONUS_DAYS,
    SUBSCRIPTION_TIERS,
    SYMBOL_TO_ID,
    TELEGRAM_BOT_TOKEN,
)
from database import Database
from scheduler import schedule_welcome_sequence, setup_scheduled_jobs
from signals import format_signal, generate_signals, get_top_signals, set_db

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    format=LOG_FORMAT,
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("neurawealth")

# ── Database singleton ────────────────────────────────────────────────────────

db = Database()
set_db(db)  # Wire DB into signals module for logging


# ── Permission Check ──────────────────────────────────────────────────────────


def _check_permission(user_id: int, command: str) -> bool:
    """Return True if the user's tier allows the given command."""
    tier = db.get_user_tier(user_id)
    allowed = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])["commands"]
    return command in allowed


async def _require_premium(update: Update, command: str) -> bool:
    """Send an upgrade prompt if the user lacks permission. Returns True if blocked."""
    if update.effective_user is None or update.effective_message is None:
        return True
    if _check_permission(update.effective_user.id, command):
        return False
    await update.effective_message.reply_text(
        "🔒 <b>Premium Feature</b>\n\n"
        f"The <code>/{command}</code> command requires a Premium or Enterprise subscription.\n\n"
        f"🎁 New here? Get {FREE_TRIAL_DAYS} days free → /start\n"
        "⭐ Upgrade now → /subscribe",
        parse_mode=ParseMode.HTML,
    )
    return True


# ── /start ────────────────────────────────────────────────────────────────────


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Welcome message with platform overview. Handles referral deep-links and free trial."""
    user = update.effective_user
    if user is None or update.effective_message is None:
        return

    user_data = db.upsert_user(
        user_id=user.id,
        username=user.username,
        first_name=user.first_name,
    )

    name = user.first_name or "there"
    is_new = user_data.get("welcome_step", 0) == 0

    # Handle referral deep-link: /start ref_XXXXXXXX
    if context.args and context.args[0].startswith("ref_"):
        ref_code = context.args[0][4:]
        referrer = db.get_user_by_referral_code(ref_code)
        if referrer and referrer["user_id"] != user.id:
            if db.record_referral(referrer["user_id"], user.id):
                # Give both parties bonus premium days
                for uid in (referrer["user_id"], user.id):
                    current_tier = db.get_user_tier(uid)
                    if current_tier == "free":
                        db.start_trial(uid)
                    # If already on trial/premium, the bonus extends naturally
                logger.info(
                    "Referral: user %d referred user %d (code %s)",
                    referrer["user_id"], user.id, ref_code,
                )
                await update.effective_message.reply_text(
                    f"🎉 <b>Referral Bonus Activated!</b>\n\n"
                    f"You and your friend both get {REFERRAL_BONUS_DAYS} days of Premium access!\n"
                    "Enjoy full signals, alerts, and portfolio tracking.",
                    parse_mode=ParseMode.HTML,
                )

    # Auto-start free trial for new users
    if is_new and user_data.get("tier") == "free" and not user_data.get("trial_started"):
        db.start_trial(user.id)
        trial_msg = f"\n🎁 <b>You've been given a {FREE_TRIAL_DAYS}-day FREE Premium trial!</b>\n"
    else:
        trial_msg = ""

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("📊 Live Signals", callback_data="signals"),
                InlineKeyboardButton("🔥 Trending", callback_data="trending"),
            ],
            [
                InlineKeyboardButton("💰 Check Price", callback_data="price_help"),
                InlineKeyboardButton("⭐ Subscribe", callback_data="subscribe"),
            ],
            [
                InlineKeyboardButton("📈 Accuracy", callback_data="accuracy"),
                InlineKeyboardButton("🔗 Refer a Friend", callback_data="refer"),
            ],
            [
                InlineKeyboardButton("❓ Help", callback_data="help"),
            ],
        ]
    )

    welcome = (
        f"🧠 <b>Welcome to NeuraWealth OS, {name}!</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Your AI-powered crypto intelligence platform.\n"
        f"{trial_msg}\n"
        "<b>🚀 What NeuraWealth OS Does:</b>\n"
        "  • Real-time crypto price tracking\n"
        "  • AI-driven BUY/SELL/HOLD signals\n"
        "  • RSI, MACD & EMA technical analysis\n"
        "  • Portfolio tracking & price alerts\n"
        "  • Auto-delivered signals every 4 hours\n"
        "  • Daily market reports at 8 AM UTC\n"
        "  • Signal accuracy tracking & proof\n\n"
        "<b>⚡ Quick Start:</b>\n"
        "  /price BTC — Check Bitcoin price\n"
        "  /trending — See trending coins\n"
        "  /signals — Get live trading signals\n"
        "  /accuracy — View signal accuracy\n"
        "  /refer — Earn free Premium days\n"
        "  /help — Full command list\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "<i>Created by Charley for Angie</i>"
    )

    await update.effective_message.reply_text(
        welcome, parse_mode=ParseMode.HTML, reply_markup=keyboard
    )

    # Schedule welcome sequence for new users
    if is_new and context.application.job_queue is not None:
        schedule_welcome_sequence(context.application, user.id, db)


# ── /help ─────────────────────────────────────────────────────────────────────


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Full command list with descriptions."""
    if update.effective_message is None:
        return

    tier = db.get_user_tier(update.effective_user.id) if update.effective_user else "free"
    tier_name = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])["name"]

    text = (
        "📖 <b>NeuraWealth OS — Command Reference</b>\n"
        f"Your tier: <b>{tier_name}</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "🆓 <b>Free Commands:</b>\n"
        "  /start — Welcome & overview\n"
        "  /price [coin] — Live price (e.g. /price BTC)\n"
        "  /trending — Top trending coins\n"
        "  /accuracy — Signal accuracy stats\n"
        "  /performance — Full performance dashboard\n"
        "  /refer — Get your referral link\n"
        "  /subscribe — View subscription tiers\n"
        "  /help — This command list\n\n"
        "⭐ <b>Premium Commands ($49/mo):</b>\n"
        "  /signals — Top 3 BUY signals with targets\n"
        "  /portfolio — View your portfolio\n"
        "  /add [coin] [amount] — Add to portfolio\n"
        "  /remove [coin] — Remove from portfolio\n"
        "  /alert [coin] [price] — Set price alert\n"
        "  /report — Daily performance summary\n\n"
        "🏢 <b>Enterprise ($149/mo):</b>\n"
        "  All Premium features\n"
        "  + API access\n"
        "  + Priority signal delivery\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🎁 New users get {FREE_TRIAL_DAYS} days free Premium!\n"
        "⭐ Upgrade: /subscribe\n"
        "<i>Created by Charley for Angie</i>"
    )

    await update.effective_message.reply_text(text, parse_mode=ParseMode.HTML)


# ── /price ────────────────────────────────────────────────────────────────────


async def cmd_price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get live price of any cryptocurrency."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)

    if not context.args:
        await update.effective_message.reply_text(
            "💡 <b>Usage:</b> <code>/price BTC</code>\n\n"
            "Examples:\n"
            "  /price BTC — Bitcoin\n"
            "  /price ETH — Ethereum\n"
            "  /price SOL — Solana",
            parse_mode=ParseMode.HTML,
        )
        return

    symbol = context.args[0].lower()
    coin_id = cg_client.resolve_symbol(symbol) or symbol

    data = await cg_client.get_coin_price(coin_id)
    if not data:
        # Try searching
        search = await cg_client.search_coin(symbol)
        if search and search.get("coins"):
            coin_id = search["coins"][0]["id"]
            data = await cg_client.get_coin_price(coin_id)

    if not data:
        await update.effective_message.reply_text(
            f"❌ Could not find price for <code>{symbol.upper()}</code>.\n"
            "Try using the full name or check /trending for popular coins.",
            parse_mode=ParseMode.HTML,
        )
        return

    price = data.get("usd", 0)
    change = data.get("usd_24h_change", 0) or 0
    mcap = data.get("usd_market_cap", 0) or 0

    if price >= 1:
        price_str = f"${price:,.2f}"
    elif price >= 0.01:
        price_str = f"${price:,.4f}"
    else:
        price_str = f"${price:,.8f}"

    change_emoji = "📈" if change >= 0 else "📉"
    mcap_str = f"${mcap:,.0f}" if mcap else "N/A"

    text = (
        f"💰 <b>{symbol.upper()}</b> ({coin_id})\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"💵 Price: <code>{price_str}</code>\n"
        f"{change_emoji} 24h Change: <code>{change:+.2f}%</code>\n"
        f"📊 Market Cap: <code>{mcap_str}</code>\n\n"
        f"🔔 Set alert: <code>/alert {symbol.upper()} {price:.0f}</code>\n"
        f"📊 Full analysis: /signals"
    )

    await update.effective_message.reply_text(text, parse_mode=ParseMode.HTML)


# ── /trending ─────────────────────────────────────────────────────────────────


async def cmd_trending(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show top trending coins from CoinGecko."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)

    data = await cg_client.get_trending()
    if not data or "coins" not in data:
        await update.effective_message.reply_text(
            "⚠️ Unable to fetch trending data. Please try again later."
        )
        return

    coins = data["coins"][:10]
    lines = [
        "🔥 <b>Trending Coins on CoinGecko</b>",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
    ]

    for i, entry in enumerate(coins, 1):
        coin = entry.get("item", {})
        name = coin.get("name", "Unknown")
        symbol = coin.get("symbol", "???").upper()
        rank = coin.get("market_cap_rank", "—")

        usd_price = coin.get("data", {}).get("price", "N/A") if "data" in coin else "N/A"
        change_24h = coin.get("data", {}).get("price_change_percentage_24h", {}).get("usd", 0) if "data" in coin else 0

        change_str = f"{change_24h:+.1f}%" if isinstance(change_24h, (int, float)) else "N/A"
        change_emoji = "📈" if isinstance(change_24h, (int, float)) and change_24h >= 0 else "📉"

        lines.append(
            f"  {i}. <b>{name}</b> ({symbol})\n"
            f"     💰 {usd_price}  {change_emoji} {change_str}  📊 Rank #{rank}"
        )

    lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "💡 Use /price [symbol] for detailed info",
    ])

    await update.effective_message.reply_text(
        "\n".join(lines), parse_mode=ParseMode.HTML
    )


# ── /signals ──────────────────────────────────────────────────────────────────


async def cmd_signals(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Fetch live prices, compute TA, and send top 3 BUY signals."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)

    if await _require_premium(update, "signals"):
        return

    await update.effective_message.reply_text(
        "🔄 <b>Analysing 20 coins...</b>\nThis may take a moment.",
        parse_mode=ParseMode.HTML,
    )

    message = await get_top_signals(top_n=3)
    await update.effective_message.reply_text(message, parse_mode=ParseMode.HTML)


# ── /accuracy ─────────────────────────────────────────────────────────────────


async def cmd_accuracy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show signal accuracy statistics."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)

    stats_7d = db.get_accuracy_stats(days=7)
    stats_30d = db.get_accuracy_stats(days=30)
    stats_all = db.get_accuracy_stats(days=3650)
    total_signals = db.get_total_signals()

    text = (
        "📈 <b>NeuraWealth OS — Signal Accuracy</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    )

    if stats_7d["total"] > 0:
        text += (
            f"<b>Last 7 Days:</b> {stats_7d['accuracy']:.0f}% accurate "
            f"({stats_7d['correct']}/{stats_7d['total']} signals correct)\n\n"
        )
    else:
        text += "<b>Last 7 Days:</b> Collecting data...\n\n"

    if stats_30d["total"] > 0:
        text += (
            f"<b>Last 30 Days:</b> {stats_30d['accuracy']:.0f}% accurate "
            f"({stats_30d['correct']}/{stats_30d['total']} signals correct)\n\n"
        )

    if stats_all["total"] > 0:
        text += (
            f"<b>All Time:</b> {stats_all['accuracy']:.0f}% accurate "
            f"({stats_all['correct']}/{stats_all['total']} signals correct)\n\n"
        )

    text += (
        f"📊 Total signals generated: <b>{total_signals:,}</b>\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Signals are evaluated 24 hours after generation.\n"
        "A signal is <b>correct</b> if the price moved in the\n"
        "predicted direction within 24 hours.\n\n"
        "📊 /signals — Get live signals\n"
        "📋 /performance — Full performance dashboard\n\n"
        "<i>Created by Charley for Angie</i>"
    )

    await update.effective_message.reply_text(text, parse_mode=ParseMode.HTML)


# ── /performance ──────────────────────────────────────────────────────────────


async def cmd_performance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show full performance dashboard."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)

    stats_7d = db.get_accuracy_stats(days=7)
    stats_30d = db.get_accuracy_stats(days=30)
    stats_all = db.get_accuracy_stats(days=3650)
    total_signals = db.get_total_signals()
    bw = db.get_best_worst_signals(days=7)

    text = (
        "🏆 <b>NeuraWealth OS — Performance Dashboard</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📊 <b>Total Signals Sent:</b> {total_signals:,}\n\n"
        "<b>Accuracy Rates:</b>\n"
    )

    if stats_7d["total"] > 0:
        text += f"  • 7-Day:  <b>{stats_7d['accuracy']:.1f}%</b> ({stats_7d['correct']}/{stats_7d['total']})\n"
    else:
        text += "  • 7-Day:  <i>Collecting data...</i>\n"

    if stats_30d["total"] > 0:
        text += f"  • 30-Day: <b>{stats_30d['accuracy']:.1f}%</b> ({stats_30d['correct']}/{stats_30d['total']})\n"
    else:
        text += "  • 30-Day: <i>Collecting data...</i>\n"

    if stats_all["total"] > 0:
        text += f"  • All-Time: <b>{stats_all['accuracy']:.1f}%</b> ({stats_all['correct']}/{stats_all['total']})\n"
    else:
        text += "  • All-Time: <i>Collecting data...</i>\n"

    text += "\n"

    # Best performing signal this week
    if bw["best"]:
        b = bw["best"]
        text += (
            f"🏅 <b>Best Signal This Week:</b>\n"
            f"  {b.get('symbol', b['coin_id'])} {b['signal_type']} "
            f"@ ${b['price']:,.2f} → ${b.get('outcome_price', 0):,.2f} "
            f"(<b>{b.get('pnl_percent', 0):+.2f}%</b>)\n\n"
        )

    # Worst performing signal this week
    if bw["worst"]:
        w = bw["worst"]
        text += (
            f"📉 <b>Worst Signal This Week:</b>\n"
            f"  {w.get('symbol', w['coin_id'])} {w['signal_type']} "
            f"@ ${w['price']:,.2f} → ${w.get('outcome_price', 0):,.2f} "
            f"(<b>{w.get('pnl_percent', 0):+.2f}%</b>)\n\n"
        )

    # Average gain per correct signal
    if stats_7d["avg_gain"] != 0:
        text += f"💰 <b>Avg Gain (correct signals):</b> {stats_7d['avg_gain']:+.2f}%\n"
    if stats_7d["avg_loss"] != 0:
        text += f"📉 <b>Avg Loss (incorrect signals):</b> {stats_7d['avg_loss']:+.2f}%\n"

    text += (
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📊 /signals — Get live signals\n"
        "📈 /accuracy — Quick accuracy view\n\n"
        "<i>Created by Charley for Angie</i>"
    )

    await update.effective_message.reply_text(text, parse_mode=ParseMode.HTML)


# ── /refer ────────────────────────────────────────────────────────────────────


async def cmd_refer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate and show the user's referral link."""
    if update.effective_message is None or update.effective_user is None:
        return

    user_id = update.effective_user.id
    db.upsert_user(user_id)

    ref_code = db.generate_referral_code(user_id)
    ref_count = db.get_referral_count(user_id)
    ref_link = f"https://t.me/{BOT_USERNAME}?start=ref_{ref_code}"

    text = (
        "🔗 <b>NeuraWealth OS — Referral Program</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Share your unique link and <b>both you and your friend</b>\n"
        f"get <b>{REFERRAL_BONUS_DAYS} days of Premium</b> for free!\n\n"
        f"🔗 <b>Your Referral Link:</b>\n"
        f"<code>{ref_link}</code>\n\n"
        f"👥 <b>Friends Referred:</b> {ref_count}\n"
        f"🎁 <b>Days Earned:</b> {ref_count * REFERRAL_BONUS_DAYS}\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📤 Share the link above with friends!\n"
        "They join → you both get Premium access.\n\n"
        "<i>Created by Charley for Angie</i>"
    )

    await update.effective_message.reply_text(text, parse_mode=ParseMode.HTML)


# ── /portfolio ────────────────────────────────────────────────────────────────


async def cmd_portfolio(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the user's portfolio with live valuations."""
    if update.effective_message is None or update.effective_user is None:
        return

    if await _require_premium(update, "portfolio"):
        return

    user_id = update.effective_user.id
    portfolio = db.get_portfolio(user_id)

    if not portfolio:
        await update.effective_message.reply_text(
            "💼 <b>Your Portfolio is Empty</b>\n\n"
            "Add coins with:\n"
            "  <code>/add BTC 0.5</code>\n"
            "  <code>/add ETH 2.0</code>\n"
            "  <code>/add SOL 10</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    # Fetch live prices
    coin_ids = [p["coin_id"] for p in portfolio]
    prices = await cg_client.get_price(coin_ids, include_24h_change=True)

    lines = [
        "💼 <b>Your Portfolio</b>",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
    ]

    total_value = 0.0

    for p in portfolio:
        coin_id = p["coin_id"]
        symbol = p["symbol"]
        amount = p["amount"]

        if prices and coin_id in prices:
            price = prices[coin_id].get("usd", 0)
            change = prices[coin_id].get("usd_24h_change", 0) or 0
            value = price * amount
            total_value += value

            change_emoji = "📈" if change >= 0 else "📉"
            lines.append(
                f"  <b>{symbol}</b>: {amount:.4f}\n"
                f"    💰 ${price:,.2f} × {amount:.4f} = <b>${value:,.2f}</b>\n"
                f"    {change_emoji} 24h: {change:+.2f}%"
            )
        else:
            lines.append(f"  <b>{symbol}</b>: {amount:.4f} (price unavailable)")

    lines.extend([
        "",
        f"💎 <b>Total Value: ${total_value:,.2f}</b>",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "➕ /add [coin] [amount] — Add more",
        "➖ /remove [coin] — Remove coin",
    ])

    await update.effective_message.reply_text(
        "\n".join(lines), parse_mode=ParseMode.HTML
    )


# ── /add ──────────────────────────────────────────────────────────────────────


async def cmd_add(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Add a coin to the user's portfolio."""
    if update.effective_message is None or update.effective_user is None:
        return

    if await _require_premium(update, "add"):
        return

    if not context.args or len(context.args) < 2:
        await update.effective_message.reply_text(
            "💡 <b>Usage:</b> <code>/add BTC 0.5</code>\n\n"
            "Examples:\n"
            "  /add BTC 0.5 — Add 0.5 Bitcoin\n"
            "  /add ETH 2.0 — Add 2 Ethereum\n"
            "  /add SOL 10 — Add 10 Solana",
            parse_mode=ParseMode.HTML,
        )
        return

    symbol = context.args[0].lower()
    try:
        amount = float(context.args[1])
        if amount <= 0:
            raise ValueError("Amount must be positive")
    except ValueError:
        await update.effective_message.reply_text(
            "❌ Invalid amount. Please use a positive number.\n"
            "Example: <code>/add BTC 0.5</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    coin_id = cg_client.resolve_symbol(symbol)
    if not coin_id:
        # Try searching
        search = await cg_client.search_coin(symbol)
        if search and search.get("coins"):
            coin_id = search["coins"][0]["id"]
            symbol = search["coins"][0].get("symbol", symbol)

    if not coin_id:
        await update.effective_message.reply_text(
            f"❌ Could not find coin <code>{symbol.upper()}</code>.",
            parse_mode=ParseMode.HTML,
        )
        return

    db.add_to_portfolio(update.effective_user.id, coin_id, symbol, amount)

    await update.effective_message.reply_text(
        f"✅ Added <b>{amount}</b> {symbol.upper()} to your portfolio!\n\n"
        "📊 View portfolio: /portfolio",
        parse_mode=ParseMode.HTML,
    )


# ── /remove ───────────────────────────────────────────────────────────────────


async def cmd_remove(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Remove a coin from the user's portfolio."""
    if update.effective_message is None or update.effective_user is None:
        return

    if await _require_premium(update, "remove"):
        return

    if not context.args:
        await update.effective_message.reply_text(
            "💡 <b>Usage:</b> <code>/remove BTC</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    symbol = context.args[0].lower()
    coin_id = cg_client.resolve_symbol(symbol) or symbol

    removed = db.remove_from_portfolio(update.effective_user.id, coin_id)
    if removed:
        await update.effective_message.reply_text(
            f"✅ Removed <b>{symbol.upper()}</b> from your portfolio.\n"
            "📊 View portfolio: /portfolio",
            parse_mode=ParseMode.HTML,
        )
    else:
        await update.effective_message.reply_text(
            f"❌ <b>{symbol.upper()}</b> not found in your portfolio.",
            parse_mode=ParseMode.HTML,
        )


# ── /alert ────────────────────────────────────────────────────────────────────


async def cmd_alert(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Set a price alert for a cryptocurrency."""
    if update.effective_message is None or update.effective_user is None:
        return

    if await _require_premium(update, "alert"):
        return

    if not context.args or len(context.args) < 2:
        await update.effective_message.reply_text(
            "💡 <b>Usage:</b> <code>/alert BTC 100000</code>\n\n"
            "This will notify you when BTC reaches $100,000.\n\n"
            "Examples:\n"
            "  /alert BTC 100000 — Alert when BTC hits $100K\n"
            "  /alert ETH 5000 — Alert when ETH hits $5K\n"
            "  /alert SOL 300 — Alert when SOL hits $300",
            parse_mode=ParseMode.HTML,
        )
        return

    symbol = context.args[0].lower()
    try:
        target_price = float(context.args[1])
        if target_price <= 0:
            raise ValueError
    except ValueError:
        await update.effective_message.reply_text(
            "❌ Invalid price. Please use a positive number.\n"
            "Example: <code>/alert BTC 100000</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    coin_id = cg_client.resolve_symbol(symbol)
    if not coin_id:
        search = await cg_client.search_coin(symbol)
        if search and search.get("coins"):
            coin_id = search["coins"][0]["id"]
            symbol = search["coins"][0].get("symbol", symbol)

    if not coin_id:
        await update.effective_message.reply_text(
            f"❌ Could not find coin <code>{symbol.upper()}</code>.",
            parse_mode=ParseMode.HTML,
        )
        return

    # Determine direction based on current price
    current = await cg_client.get_coin_price(coin_id)
    direction = "above"
    if current:
        current_price = current.get("usd", 0)
        direction = "above" if target_price > current_price else "below"

    alert_id = db.create_alert(
        user_id=update.effective_user.id,
        coin_id=coin_id,
        symbol=symbol,
        target_price=target_price,
        direction=direction,
    )

    arrow = "📈" if direction == "above" else "📉"
    await update.effective_message.reply_text(
        f"🔔 <b>Alert Set!</b> (#{alert_id})\n\n"
        f"{arrow} <b>{symbol.upper()}</b> → <code>${target_price:,.2f}</code>\n"
        f"Direction: {direction}\n"
        f"⏰ Checking every 60 seconds\n\n"
        f"You'll be notified when the price goes {direction} your target.",
        parse_mode=ParseMode.HTML,
    )


# ── /subscribe ────────────────────────────────────────────────────────────────


async def cmd_subscribe(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show subscription tiers with premium formatting and payment links."""
    if update.effective_message is None or update.effective_user is None:
        return

    db.upsert_user(update.effective_user.id)
    current_tier = db.get_user_tier(update.effective_user.id)

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "⭐ Premium — $49/mo",
                    url=SUBSCRIPTION_TIERS["premium"].get(
                        "payment_link", "https://buy.stripe.com/PLACEHOLDER"
                    ),
                ),
            ],
            [
                InlineKeyboardButton(
                    "🏢 Enterprise — $149/mo",
                    url=SUBSCRIPTION_TIERS["enterprise"].get(
                        "payment_link", "https://buy.stripe.com/PLACEHOLDER"
                    ),
                ),
            ],
        ]
    )

    current_emoji = SUBSCRIPTION_TIERS.get(current_tier, {}).get("emoji", "🆓")

    text = (
        "⭐ <b>NeuraWealth OS — Subscription Plans</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Your current plan: {current_emoji} <b>{current_tier.title()}</b>\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🆓 <b>Free</b> — $0/mo\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "  ✅ Live crypto prices\n"
        "  ✅ Trending coins\n"
        "  ✅ Signal accuracy stats\n"
        "  ✅ Referral program\n"
        "  ❌ AI trading signals\n"
        "  ❌ Portfolio tracking\n"
        "  ❌ Price alerts\n"
        "  ❌ Daily reports\n"
        "  ❌ Auto-delivery\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "⭐ <b>Premium</b> — $49/mo\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "  ✅ Everything in Free\n"
        "  ✅ AI-powered BUY/SELL signals\n"
        "  ✅ Target prices & stop-loss levels\n"
        "  ✅ Portfolio tracking with live P&L\n"
        "  ✅ Real-time price alerts (60s checks)\n"
        "  ✅ Daily market reports at 8 AM UTC\n"
        "  ✅ Auto-signal delivery every 4 hours\n"
        "  ✅ Signal accuracy proof & tracking\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🏢 <b>Enterprise</b> — $149/mo\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "  ✅ Everything in Premium\n"
        "  ✅ API access for custom integrations\n"
        "  ✅ Priority signal delivery\n"
        "  ✅ Direct support channel\n"
        "  ✅ Custom coin monitoring\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🎁 <b>New users get {FREE_TRIAL_DAYS} days free Premium!</b>\n"
        f"🔗 Refer friends for {REFERRAL_BONUS_DAYS} more free days → /refer\n\n"
        "Click a button below to subscribe:"
    )

    await update.effective_message.reply_text(
        text, parse_mode=ParseMode.HTML, reply_markup=keyboard
    )


# ── /report ───────────────────────────────────────────────────────────────────


async def cmd_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate and send a daily performance summary."""
    if update.effective_message is None or update.effective_user is None:
        return

    if await _require_premium(update, "report"):
        return

    await update.effective_message.reply_text(
        "📋 <b>Generating report...</b>", parse_mode=ParseMode.HTML
    )

    from signals import get_daily_report

    report = await get_daily_report()
    await update.effective_message.reply_text(report, parse_mode=ParseMode.HTML)


# ── Callback Query Handler ───────────────────────────────────────────────────


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline keyboard button presses."""
    query = update.callback_query
    if query is None:
        return

    await query.answer()

    data = query.data
    if data == "signals":
        if update.effective_user and _check_permission(update.effective_user.id, "signals"):
            msg = await get_top_signals(top_n=3)
            await query.message.reply_text(msg, parse_mode=ParseMode.HTML)  # type: ignore
        else:
            await query.message.reply_text(  # type: ignore
                "🔒 Signals require Premium. Use /subscribe to upgrade.",
                parse_mode=ParseMode.HTML,
            )
    elif data == "trending":
        await cmd_trending(update, context)
    elif data == "price_help":
        await query.message.reply_text(  # type: ignore
            "💡 Use <code>/price BTC</code> to check any coin's price.",
            parse_mode=ParseMode.HTML,
        )
    elif data == "subscribe":
        await cmd_subscribe(update, context)
    elif data == "help":
        await cmd_help(update, context)
    elif data == "accuracy":
        await cmd_accuracy(update, context)
    elif data == "refer":
        await cmd_refer(update, context)


# ── Unknown Command Handler ──────────────────────────────────────────────────


async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle unknown commands gracefully."""
    if update.effective_message is None:
        return
    await update.effective_message.reply_text(
        "❓ Unknown command. Use /help to see available commands.",
        parse_mode=ParseMode.HTML,
    )


# ── Error Handler ────────────────────────────────────────────────────────────


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Log errors and notify the user if possible."""
    logger.error("Exception while handling an update:", exc_info=context.error)

    if isinstance(update, Update) and update.effective_message:
        await update.effective_message.reply_text(
            "⚠️ An error occurred. Please try again later.\n"
            "If the issue persists, contact support.",
            parse_mode=ParseMode.HTML,
        )


# ── Post-Init Hook ───────────────────────────────────────────────────────────


async def post_init(application: Application) -> None:
    """Called after the application is initialised."""
    application.bot_data["db"] = db
    setup_scheduled_jobs(application)
    logger.info("NeuraWealth OS bot initialised and scheduled jobs started")


async def post_shutdown(application: Application) -> None:
    """Clean up resources on shutdown."""
    await cg_client.close()
    logger.info("NeuraWealth OS bot shut down cleanly")


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> None:
    """Start the bot."""
    if not TELEGRAM_BOT_TOKEN:
        logger.error(
            "TELEGRAM_BOT_TOKEN not set. "
            "Please set it in your .env file or environment variables."
        )
        sys.exit(1)

    application = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    # Register command handlers
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("price", cmd_price))
    application.add_handler(CommandHandler("trending", cmd_trending))
    application.add_handler(CommandHandler("signals", cmd_signals))
    application.add_handler(CommandHandler("portfolio", cmd_portfolio))
    application.add_handler(CommandHandler("add", cmd_add))
    application.add_handler(CommandHandler("remove", cmd_remove))
    application.add_handler(CommandHandler("alert", cmd_alert))
    application.add_handler(CommandHandler("subscribe", cmd_subscribe))
    application.add_handler(CommandHandler("report", cmd_report))
    application.add_handler(CommandHandler("accuracy", cmd_accuracy))
    application.add_handler(CommandHandler("performance", cmd_performance))
    application.add_handler(CommandHandler("refer", cmd_refer))

    # Callback query handler for inline buttons
    application.add_handler(CallbackQueryHandler(handle_callback))

    # Unknown command handler
    application.add_handler(
        MessageHandler(filters.COMMAND, unknown_command)
    )

    # Error handler
    application.add_error_handler(error_handler)

    # Start polling
    logger.info("Starting NeuraWealth OS bot...")
    application.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    main()
