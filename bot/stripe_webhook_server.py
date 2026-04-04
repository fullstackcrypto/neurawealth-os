"""
NeuraWealth OS — Stripe Webhook Server
=======================================
A lightweight FastAPI server that receives Stripe webhook events and
notifies users in Telegram when their payment is processed.

Run alongside the bot:
    uvicorn stripe_webhook_server:app --host 0.0.0.0 --port 8080

Or deploy on Railway as a separate service pointing to the same repo.

Stripe Dashboard Setup:
  1. Go to Developers → Webhooks → Add endpoint
  2. Set URL to: https://your-domain.com/stripe/webhook
  3. Select events: checkout.session.completed,
                    customer.subscription.deleted,
                    invoice.payment_failed
  4. Copy the signing secret → set as STRIPE_WEBHOOK_SECRET env var

NeuraWealth OS
"""

from __future__ import annotations

import asyncio
import logging
import os

from fastapi import FastAPI, HTTPException, Request, Response
from telegram import Bot
from telegram.constants import ParseMode

from config import STRIPE_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN
from database import Database
from stripe_integration import construct_webhook_event, process_webhook_event

logger = logging.getLogger("neurawealth.webhook")

app = FastAPI(title="NeuraWealth OS Stripe Webhook")
db = Database()
bot = Bot(token=TELEGRAM_BOT_TOKEN)

# ── Upgrade / Downgrade Notification Messages ─────────────────────────────────

UPGRADE_MESSAGES = {
    "premium": (
        "🎉 <b>Payment Successful — Welcome to Premium!</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Your NeuraWealth OS account has been upgraded to <b>Premium</b>.\n\n"
        "You now have access to:\n"
        "  🟢 AI-powered BUY/SELL signals with targets & stop-losses\n"
        "  🔔 Real-time price alerts (60-second checks)\n"
        "  💼 Portfolio tracking with live P&L\n"
        "  📋 Daily market reports at 8 AM UTC\n"
        "  ⚡ Auto-signal delivery every 4 hours\n"
        "  📈 Signal accuracy tracking & proof\n\n"
        "Get your first signals now → /signals\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "<i>NeuraWealth OS</i>"
    ),
    "enterprise": (
        "🎉 <b>Payment Successful — Welcome to Enterprise!</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Your NeuraWealth OS account has been upgraded to <b>Enterprise</b>.\n\n"
        "You now have access to:\n"
        "  🟢 All Premium features\n"
        "  🚀 Priority signal delivery\n"
        "  🔑 API access for custom integrations\n"
        "  🐋 Whale alert monitoring\n"
        "  🎯 Custom coin monitoring\n"
        "  💬 Direct support channel\n\n"
        "Get your first signals now → /signals\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "<i>NeuraWealth OS</i>"
    ),
}

DOWNGRADE_MESSAGE = (
    "😔 <b>Subscription Cancelled</b>\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    "Your NeuraWealth OS subscription has been cancelled and your\n"
    "account has been returned to the Free tier.\n\n"
    "You can resubscribe at any time → /subscribe\n\n"
    "Thank you for using NeuraWealth OS!\n\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "<i>NeuraWealth OS</i>"
)

PAYMENT_FAILED_MESSAGE = (
    "⚠️ <b>Payment Failed</b>\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    "We were unable to process your last subscription payment.\n"
    "Stripe will automatically retry the payment.\n\n"
    "To avoid service interruption, please update your payment\n"
    "method in the Stripe customer portal.\n\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "<i>NeuraWealth OS</i>"
)


# ── Webhook Endpoint ──────────────────────────────────────────────────────────


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request) -> Response:
    """Receive and process Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = construct_webhook_event(payload, sig_header)
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    result = process_webhook_event(event, db)

    if result is None:
        return Response(content="ok", status_code=200)

    telegram_user_id = result.get("telegram_user_id")
    action = result.get("action")
    tier = result.get("tier", "premium")

    if telegram_user_id is None:
        return Response(content="ok", status_code=200)

    # Send Telegram notification
    try:
        if action == "upgraded":
            msg = UPGRADE_MESSAGES.get(tier, UPGRADE_MESSAGES["premium"])
        elif action == "downgraded":
            msg = DOWNGRADE_MESSAGE
        elif action == "payment_failed":
            msg = PAYMENT_FAILED_MESSAGE
        else:
            return Response(content="ok", status_code=200)

        await bot.send_message(
            chat_id=telegram_user_id,
            text=msg,
            parse_mode=ParseMode.HTML,
        )
        logger.info(
            "Sent %s notification to Telegram user %d", action, telegram_user_id
        )
    except Exception as exc:
        logger.error(
            "Failed to send Telegram notification to %d: %s", telegram_user_id, exc
        )

    return Response(content="ok", status_code=200)


# ── Health Check ──────────────────────────────────────────────────────────────


@app.get("/health")
async def health_check() -> dict:
    """Simple health check endpoint."""
    return {"status": "ok", "service": "NeuraWealth OS Stripe Webhook"}


# ── Entry Point ───────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("WEBHOOK_PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
