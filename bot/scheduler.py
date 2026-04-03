"""
NeuraWealth OS Telegram Bot — Scheduler
========================================
Manages recurring jobs:
  • Auto-send top signals every 4 hours to premium subscribers
  • Price alert monitoring every 60 seconds
  • Daily market summary at 8 AM UTC
  • Welcome sequence for new users (3 messages over 24 hours)
  • Signal accuracy evaluation (hourly)
  • Free trial expiration checks (hourly)
"""

from __future__ import annotations

import logging
from datetime import time as dt_time
from typing import TYPE_CHECKING

from telegram import Bot
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from coingecko import cg_client
from config import (
    ACCURACY_CHECK_INTERVAL_HOURS,
    ALERT_CHECK_INTERVAL_SECONDS,
    DAILY_REPORT_HOUR_UTC,
    FREE_TRIAL_DAYS,
    SIGNAL_INTERVAL_HOURS,
    TRIAL_CHECK_INTERVAL_HOURS,
    WELCOME_DELAYS,
)
from database import Database
from signals import get_daily_report, get_top_signals

if TYPE_CHECKING:
    from telegram.ext import Application

logger = logging.getLogger(__name__)


# ── Welcome Sequence Messages ─────────────────────────────────────────────────

WELCOME_MESSAGES = [
    # Message 1 — Sent immediately on /start (handled in bot.py)
    None,
    # Message 2 — Sent 1 hour later
    (
        "👋 <b>Welcome back to NeuraWealth OS!</b>\n\n"
        "Here are some things you can do right now:\n\n"
        "📊 <b>/price BTC</b> — Check any crypto price instantly\n"
        "🔥 <b>/trending</b> — See what's hot in the market\n"
        "⭐ <b>/subscribe</b> — Unlock live signals & alerts\n\n"
        "Our AI-powered signal engine analyses RSI, MACD, and EMA\n"
        "crossovers across 20+ coins to find the best opportunities.\n\n"
        "💡 <i>Tip: Premium members get signals auto-delivered every 4 hours!</i>"
    ),
    # Message 3 — Sent 24 hours later
    (
        "🧠 <b>NeuraWealth OS — Your Edge in Crypto</b>\n\n"
        "You've been with us for 24 hours! Here's what Premium unlocks:\n\n"
        "🟢 <b>Live Signals</b> — Top 3 BUY opportunities with confidence scores\n"
        "🔔 <b>Price Alerts</b> — Get notified when coins hit your target\n"
        "💼 <b>Portfolio Tracker</b> — Track your holdings in real-time\n"
        "📋 <b>Daily Reports</b> — Market summary delivered at 8 AM UTC\n"
        "⚡ <b>Auto-Delivery</b> — Signals sent every 4 hours\n\n"
        "Ready to upgrade? → /subscribe\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "<i>Created by Charley for Angie</i>"
    ),
]


# ── Job Callbacks ─────────────────────────────────────────────────────────────


async def send_welcome_message(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send the next welcome sequence message to a new user."""
    job = context.job
    if job is None or job.data is None:
        return

    user_id: int = job.data["user_id"]
    step: int = job.data["step"]
    db: Database = job.data["db"]

    if step < 1 or step >= len(WELCOME_MESSAGES):
        return

    msg = WELCOME_MESSAGES[step]
    if msg is None:
        return

    try:
        await context.bot.send_message(
            chat_id=user_id, text=msg, parse_mode=ParseMode.HTML
        )
        db.update_welcome_step(user_id, step)
        logger.info("Welcome message %d sent to user %d", step, user_id)
    except Exception as exc:
        logger.error("Failed to send welcome msg to %d: %s", user_id, exc)


async def auto_send_signals(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send top signals to all premium subscribers."""
    db: Database = context.bot_data["db"]
    premium_users = db.get_premium_users()

    if not premium_users:
        logger.info("No premium users to send signals to")
        return

    logger.info("Generating auto-signals for %d premium users", len(premium_users))
    message = await get_top_signals(top_n=3)

    for user in premium_users:
        try:
            await context.bot.send_message(
                chat_id=user["user_id"],
                text=message,
                parse_mode=ParseMode.HTML,
            )
        except Exception as exc:
            logger.error(
                "Failed to send signal to user %d: %s", user["user_id"], exc
            )


async def check_price_alerts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Check all active price alerts and notify users when triggered."""
    db: Database = context.bot_data["db"]
    alerts = db.get_active_alerts()

    if not alerts:
        return

    # Collect unique coin IDs
    coin_ids = list({a["coin_id"] for a in alerts})

    try:
        prices = await cg_client.get_price(coin_ids)
    except Exception as exc:
        logger.error("Failed to fetch prices for alert check: %s", exc)
        return

    if not prices:
        return

    for alert in alerts:
        coin_id = alert["coin_id"]
        if coin_id not in prices:
            continue

        current_price = prices[coin_id].get("usd", 0)
        target = alert["target_price"]
        direction = alert["direction"]
        triggered = False

        if direction == "above" and current_price >= target:
            triggered = True
        elif direction == "below" and current_price <= target:
            triggered = True

        if triggered:
            db.trigger_alert(alert["id"])
            arrow = "📈" if direction == "above" else "📉"
            msg = (
                f"🔔 <b>Price Alert Triggered!</b>\n\n"
                f"{arrow} <b>{alert['symbol']}</b> has reached "
                f"<code>${current_price:,.2f}</code>\n"
                f"🎯 Your target: <code>${target:,.2f}</code> ({direction})\n\n"
                f"Use /price {alert['symbol']} for full details"
            )
            try:
                await context.bot.send_message(
                    chat_id=alert["user_id"],
                    text=msg,
                    parse_mode=ParseMode.HTML,
                )
                logger.info(
                    "Alert %d triggered for user %d (%s @ %.2f)",
                    alert["id"],
                    alert["user_id"],
                    alert["symbol"],
                    current_price,
                )
            except Exception as exc:
                logger.error(
                    "Failed to send alert to user %d: %s",
                    alert["user_id"],
                    exc,
                )


async def send_daily_report(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send the daily market summary to premium subscribers."""
    db: Database = context.bot_data["db"]
    premium_users = db.get_premium_users()

    if not premium_users:
        logger.info("No premium users for daily report")
        return

    logger.info("Generating daily report for %d users", len(premium_users))
    report = await get_daily_report()

    for user in premium_users:
        try:
            await context.bot.send_message(
                chat_id=user["user_id"],
                text=report,
                parse_mode=ParseMode.HTML,
            )
        except Exception as exc:
            logger.error(
                "Failed to send daily report to %d: %s", user["user_id"], exc
            )


async def check_signal_accuracy(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Evaluate signals that are 24h+ old and record outcomes."""
    db: Database = context.bot_data["db"]
    unchecked = db.get_unchecked_signals(min_age_hours=24)

    if not unchecked:
        return

    logger.info("Checking accuracy for %d signals", len(unchecked))

    # Collect unique coin IDs
    coin_ids = list({s["coin_id"] for s in unchecked})

    try:
        prices = await cg_client.get_price(coin_ids)
    except Exception as exc:
        logger.error("Failed to fetch prices for accuracy check: %s", exc)
        return

    if not prices:
        return

    for sig in unchecked:
        coin_id = sig["coin_id"]
        if coin_id not in prices:
            continue

        current_price = prices[coin_id].get("usd", 0)
        if current_price <= 0:
            continue

        signal_price = sig["price"]
        signal_type = sig["signal_type"]
        pnl_pct = ((current_price - signal_price) / signal_price) * 100

        # Determine correctness
        if signal_type == "BUY":
            outcome = "correct" if current_price > signal_price else "incorrect"
        elif signal_type == "SELL":
            outcome = "correct" if current_price < signal_price else "incorrect"
        else:
            outcome = "neutral"

        db.update_signal_outcome(
            signal_id=sig["id"],
            outcome_price=current_price,
            outcome=outcome,
            pnl_percent=pnl_pct,
        )
        logger.info(
            "Signal #%d (%s %s @ %.2f) → %s (now %.2f, PnL %.2f%%)",
            sig["id"], signal_type, sig.get("symbol", coin_id),
            signal_price, outcome, current_price, pnl_pct,
        )


async def check_expired_trials(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Downgrade expired trial users and notify them."""
    db: Database = context.bot_data["db"]
    expired = db.get_expired_trials()

    if not expired:
        return

    logger.info("Processing %d expired trials", len(expired))

    for user in expired:
        db.expire_trial(user["user_id"])
        msg = (
            "⏰ <b>Your Free Trial Has Ended</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Your {FREE_TRIAL_DAYS}-day free trial of NeuraWealth Premium is over.\n\n"
            "You enjoyed:\n"
            "  🟢 AI-powered trading signals\n"
            "  🔔 Real-time price alerts\n"
            "  💼 Portfolio tracking\n"
            "  📋 Daily market reports\n\n"
            "Don't lose your edge — upgrade now!\n\n"
            "⭐ <b>Premium — $49/mo</b>\n"
            "🏢 <b>Enterprise — $149/mo</b>\n\n"
            "→ /subscribe to continue\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "<i>Created by Charley for Angie</i>"
        )
        try:
            await context.bot.send_message(
                chat_id=user["user_id"],
                text=msg,
                parse_mode=ParseMode.HTML,
            )
            logger.info("Trial expiry notice sent to user %d", user["user_id"])
        except Exception as exc:
            logger.error("Failed to send trial expiry to %d: %s", user["user_id"], exc)


# ── Scheduler Setup ───────────────────────────────────────────────────────────


def schedule_welcome_sequence(
    app: "Application", user_id: int, db: Database
) -> None:
    """Schedule the welcome sequence messages for a new user."""
    for step in range(1, len(WELCOME_MESSAGES)):
        delay = WELCOME_DELAYS[step] if step < len(WELCOME_DELAYS) else 86400
        app.job_queue.run_once(
            send_welcome_message,
            when=delay,
            data={"user_id": user_id, "step": step, "db": db},
            name=f"welcome_{user_id}_{step}",
        )
    logger.info("Welcome sequence scheduled for user %d", user_id)


def setup_scheduled_jobs(app: "Application") -> None:
    """Register all recurring jobs on the application's JobQueue."""
    jq = app.job_queue

    # Auto-send signals every N hours
    jq.run_repeating(
        auto_send_signals,
        interval=SIGNAL_INTERVAL_HOURS * 3600,
        first=60,  # first run 60s after startup
        name="auto_signals",
    )
    logger.info("Scheduled auto-signals every %d hours", SIGNAL_INTERVAL_HOURS)

    # Price alert check every 60 seconds
    jq.run_repeating(
        check_price_alerts,
        interval=ALERT_CHECK_INTERVAL_SECONDS,
        first=30,
        name="alert_check",
    )
    logger.info("Scheduled alert checks every %ds", ALERT_CHECK_INTERVAL_SECONDS)

    # Daily report at 8 AM UTC
    jq.run_daily(
        send_daily_report,
        time=dt_time(hour=DAILY_REPORT_HOUR_UTC, minute=0, second=0),
        name="daily_report",
    )
    logger.info("Scheduled daily report at %02d:00 UTC", DAILY_REPORT_HOUR_UTC)

    # Signal accuracy evaluation every hour
    jq.run_repeating(
        check_signal_accuracy,
        interval=ACCURACY_CHECK_INTERVAL_HOURS * 3600,
        first=120,
        name="accuracy_check",
    )
    logger.info("Scheduled accuracy checks every %d hours", ACCURACY_CHECK_INTERVAL_HOURS)

    # Trial expiration check every hour
    jq.run_repeating(
        check_expired_trials,
        interval=TRIAL_CHECK_INTERVAL_HOURS * 3600,
        first=180,
        name="trial_check",
    )
    logger.info("Scheduled trial expiration checks every %d hours", TRIAL_CHECK_INTERVAL_HOURS)
