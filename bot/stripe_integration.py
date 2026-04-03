"""
NeuraWealth OS — Stripe Payment Integration
============================================
Handles subscription payments for Premium ($49/mo) and Enterprise ($149/mo) tiers.

Payment Flow:
  1. User taps a payment link in /subscribe
  2. User completes payment on Stripe-hosted page
  3. Stripe fires a webhook (checkout.session.completed)
  4. Webhook handler upgrades the user's tier in the SQLite database

Webhook Setup:
  - Deploy the FastAPI webhook server (stripe_webhook_server.py) or use an
    existing web framework.
  - Set the endpoint URL in Stripe Dashboard → Developers → Webhooks.
  - Copy the signing secret into STRIPE_WEBHOOK_SECRET env variable.

Created by Charley for Angie
"""

from __future__ import annotations

import logging
from typing import Optional

import stripe

from config import (
    STRIPE_ENTERPRISE_PAYMENT_LINK,
    STRIPE_ENTERPRISE_PRICE_ID,
    STRIPE_ENTERPRISE_PRODUCT_ID,
    STRIPE_PREMIUM_PAYMENT_LINK,
    STRIPE_PREMIUM_PRICE_ID,
    STRIPE_PREMIUM_PRODUCT_ID,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
)

logger = logging.getLogger("neurawealth.stripe")

# Initialise the Stripe client
stripe.api_key = STRIPE_SECRET_KEY


# ── Tier Mapping ──────────────────────────────────────────────────────────────

# Maps Stripe Price IDs → internal tier names
PRICE_TO_TIER: dict[str, str] = {
    STRIPE_PREMIUM_PRICE_ID: "premium",
    STRIPE_ENTERPRISE_PRICE_ID: "enterprise",
}

# Maps Stripe Product IDs → internal tier names (fallback)
PRODUCT_TO_TIER: dict[str, str] = {
    STRIPE_PREMIUM_PRODUCT_ID: "premium",
    STRIPE_ENTERPRISE_PRODUCT_ID: "enterprise",
}


# ── Payment Link Helpers ──────────────────────────────────────────────────────


def get_payment_link(tier: str) -> str:
    """Return the Stripe Payment Link URL for the given tier."""
    if tier == "premium":
        return STRIPE_PREMIUM_PAYMENT_LINK
    elif tier == "enterprise":
        return STRIPE_ENTERPRISE_PAYMENT_LINK
    return ""


# ── Checkout Session ──────────────────────────────────────────────────────────


def create_checkout_session(
    tier: str,
    telegram_user_id: int,
    success_url: str = "https://t.me/NeuraWealthBot?start=payment_success",
    cancel_url: str = "https://t.me/NeuraWealthBot?start=payment_cancelled",
) -> Optional[str]:
    """
    Create a Stripe Checkout Session for the given tier.

    Returns the checkout URL, or None on failure.
    The telegram_user_id is stored in session metadata so the webhook
    can identify which Telegram user to upgrade.
    """
    price_id = (
        STRIPE_PREMIUM_PRICE_ID if tier == "premium" else STRIPE_ENTERPRISE_PRICE_ID
    )

    if not price_id:
        logger.error("No price ID configured for tier: %s", tier)
        return None

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"telegram_user_id": str(telegram_user_id), "tier": tier},
            subscription_data={
                "metadata": {
                    "telegram_user_id": str(telegram_user_id),
                    "tier": tier,
                }
            },
        )
        logger.info(
            "Created checkout session %s for user %d (tier: %s)",
            session.id,
            telegram_user_id,
            tier,
        )
        return session.url
    except stripe.StripeError as exc:
        logger.error("Stripe checkout session creation failed: %s", exc)
        return None


# ── Webhook Handler ───────────────────────────────────────────────────────────


def construct_webhook_event(payload: bytes, sig_header: str) -> Optional[stripe.Event]:
    """
    Verify and construct a Stripe webhook Event from the raw request body
    and the Stripe-Signature header.

    Returns the Event object, or None if verification fails.
    """
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning(
            "STRIPE_WEBHOOK_SECRET not set — skipping signature verification"
        )
        try:
            import json
            return stripe.Event.construct_from(
                json.loads(payload), stripe.api_key
            )
        except Exception as exc:
            logger.error("Failed to parse webhook payload: %s", exc)
            return None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        return event
    except stripe.errors.SignatureVerificationError as exc:
        logger.error("Webhook signature verification failed: %s", exc)
        return None
    except Exception as exc:
        logger.error("Webhook construction failed: %s", exc)
        return None


def process_webhook_event(event: stripe.Event, db) -> Optional[dict]:
    """
    Process a verified Stripe webhook event.

    Handles:
      - checkout.session.completed → upgrade user to paid tier
      - customer.subscription.deleted → downgrade user to free tier

    Returns a dict with 'telegram_user_id' and 'tier' if a user was
    upgraded/downgraded, or None if no action was taken.
    """
    event_type = event["type"]
    data_object = event["data"]["object"]

    logger.info("Processing Stripe webhook: %s", event_type)

    if event_type == "checkout.session.completed":
        return _handle_checkout_completed(data_object, db)

    elif event_type == "customer.subscription.deleted":
        return _handle_subscription_deleted(data_object, db)

    elif event_type == "invoice.payment_failed":
        return _handle_payment_failed(data_object, db)

    logger.debug("Unhandled webhook event type: %s", event_type)
    return None


def _handle_checkout_completed(session: dict, db) -> Optional[dict]:
    """Upgrade the user's tier after a successful checkout."""
    metadata = session.get("metadata") or {}
    telegram_user_id_str = metadata.get("telegram_user_id")
    tier = metadata.get("tier")

    if not telegram_user_id_str or not tier:
        # Try to extract from subscription metadata
        subscription_id = session.get("subscription")
        if subscription_id:
            try:
                sub = stripe.Subscription.retrieve(subscription_id)
                sub_meta = sub.get("metadata") or {}
                telegram_user_id_str = sub_meta.get("telegram_user_id")
                tier = sub_meta.get("tier")
            except stripe.StripeError as exc:
                logger.error("Failed to retrieve subscription: %s", exc)

    if not telegram_user_id_str:
        logger.warning("checkout.session.completed: no telegram_user_id in metadata")
        return None

    try:
        telegram_user_id = int(telegram_user_id_str)
    except ValueError:
        logger.error("Invalid telegram_user_id in metadata: %s", telegram_user_id_str)
        return None

    # Determine tier from price if not in metadata
    if not tier:
        line_items = session.get("line_items", {}).get("data", [])
        for item in line_items:
            price_id = item.get("price", {}).get("id")
            if price_id in PRICE_TO_TIER:
                tier = PRICE_TO_TIER[price_id]
                break

    if not tier:
        tier = "premium"  # Safe default

    # Upgrade the user in the database
    stripe_customer_id = session.get("customer")
    stripe_subscription_id = session.get("subscription")

    db.upgrade_user_tier(
        user_id=telegram_user_id,
        tier=tier,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
    )

    logger.info(
        "User %d upgraded to %s (customer: %s, subscription: %s)",
        telegram_user_id,
        tier,
        stripe_customer_id,
        stripe_subscription_id,
    )

    return {"telegram_user_id": telegram_user_id, "tier": tier, "action": "upgraded"}


def _handle_subscription_deleted(subscription: dict, db) -> Optional[dict]:
    """Downgrade the user to free when their subscription is cancelled."""
    metadata = subscription.get("metadata") or {}
    telegram_user_id_str = metadata.get("telegram_user_id")

    if not telegram_user_id_str:
        # Try to find by Stripe customer ID
        customer_id = subscription.get("customer")
        if customer_id:
            user = db.get_user_by_stripe_customer(customer_id)
            if user:
                telegram_user_id_str = str(user["user_id"])

    if not telegram_user_id_str:
        logger.warning("subscription.deleted: no telegram_user_id found")
        return None

    try:
        telegram_user_id = int(telegram_user_id_str)
    except ValueError:
        return None

    db.downgrade_user_tier(telegram_user_id, "free")
    logger.info("User %d downgraded to free (subscription cancelled)", telegram_user_id)

    return {"telegram_user_id": telegram_user_id, "tier": "free", "action": "downgraded"}


def _handle_payment_failed(invoice: dict, db) -> Optional[dict]:
    """Log payment failures — no immediate downgrade, Stripe retries first."""
    customer_id = invoice.get("customer")
    if customer_id:
        user = db.get_user_by_stripe_customer(customer_id)
        if user:
            logger.warning(
                "Payment failed for user %d (customer: %s)",
                user["user_id"],
                customer_id,
            )
            return {
                "telegram_user_id": user["user_id"],
                "tier": user.get("tier", "premium"),
                "action": "payment_failed",
            }
    return None


# ── Subscription Management ───────────────────────────────────────────────────


def cancel_subscription(stripe_subscription_id: str) -> bool:
    """Cancel a Stripe subscription immediately."""
    try:
        stripe.Subscription.cancel(stripe_subscription_id)
        logger.info("Cancelled subscription: %s", stripe_subscription_id)
        return True
    except stripe.StripeError as exc:
        logger.error("Failed to cancel subscription %s: %s", stripe_subscription_id, exc)
        return False


def get_subscription_status(stripe_subscription_id: str) -> Optional[str]:
    """Return the status of a Stripe subscription (active, past_due, cancelled, etc.)."""
    try:
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        return sub.get("status")
    except stripe.StripeError as exc:
        logger.error("Failed to retrieve subscription %s: %s", stripe_subscription_id, exc)
        return None
