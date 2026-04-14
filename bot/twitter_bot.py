"""
NeuraWealth OS — Automated X/Twitter Posting Bot
==================================================
Automated daily tweet scheduler using the 7-day marketing content calendar.
Designed to run alongside the Telegram bot on Railway.

Usage:
    TWITTER_API_KEY=xxx TWITTER_API_SECRET=xxx ... python twitter_bot.py

Environment Variables Required:
    TWITTER_API_KEY          - API Key (Consumer Key)
    TWITTER_API_SECRET       - API Secret (Consumer Secret)
    TWITTER_BEARER_TOKEN     - Bearer Token
    TWITTER_ACCESS_TOKEN     - Access Token
    TWITTER_ACCESS_TOKEN_SECRET - Access Token Secret
    TWITTER_ENABLED          - Set to "true" to enable posting (default: false)
    TWITTER_DRY_RUN          - Set to "true" to log tweets without posting (default: true)

NeuraWealth OS
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, time as dt_time, timezone
from pathlib import Path
from typing import Optional

# ── Configuration ─────────────────────────────────────────────────────────────

TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET: str = os.getenv("TWITTER_API_SECRET", "")
TWITTER_BEARER_TOKEN: str = os.getenv("TWITTER_BEARER_TOKEN", "")
TWITTER_ACCESS_TOKEN: str = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_TOKEN_SECRET: str = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")

# Safety switches — disabled by default until X API credits are available
TWITTER_ENABLED: bool = os.getenv("TWITTER_ENABLED", "false").lower() == "true"
TWITTER_DRY_RUN: bool = os.getenv("TWITTER_DRY_RUN", "true").lower() == "true"

# Posting schedule (hour in UTC)
DAILY_POST_HOUR_UTC: int = int(os.getenv("TWITTER_POST_HOUR_UTC", "14"))  # 10 AM EST

# ── Logging ───────────────────────────────────────────────────────────────────

LOG_FORMAT = "%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s"
logging.basicConfig(
    format=LOG_FORMAT,
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("neurawealth.twitter")

# ── 7-Day Content Schedule ────────────────────────────────────────────────────
# Each entry: (day_number, tweet_text, optional_asset_filename)
# The schedule repeats weekly. Day 1 = Monday (or the first day the bot starts).

CONTENT_SCHEDULE: list[dict] = [
    {
        "day": 1,
        "label": "Launch Announcement",
        "tweet": (
            "In crypto, the whole must be greater than the sum of its parts. "
            "1+1=3.\n\n"
            "NeuraWealth OS combines institutional-grade AI with autonomous "
            "execution to create a compounding wealth engine.\n\n"
            "Stop trading linearly. Start scaling exponentially.\n\n"
            "#CryptoTrading #AITrading #NeuraWealthOS"
        ),
        "asset": "ad_creative_1.png",
    },
    {
        "day": 2,
        "label": "Philosophy of Alignment",
        "tweet": (
            "We didn't just build a trading bot; we built an aligned intelligence.\n\n"
            "NeuraWealth OS is meticulously engineered to adhere to your specific "
            "risk parameters and financial goals.\n\n"
            "It doesn't just execute; it understands.\n\n"
            "#CryptoSuccess #AutomatedTrading #NeuraWealthOS"
        ),
        "asset": "ad_creative_4.png",
    },
    {
        "day": 3,
        "label": "Security & Infrastructure",
        "tweet": (
            "Your portfolio is only as secure as the infrastructure it runs on.\n\n"
            "NeuraWealth OS is built with frontier-level defensive architecture, "
            "ensuring your automated strategies execute flawlessly and securely.\n\n"
            "Trade with absolute confidence.\n\n"
            "#CryptoSecurity #WealthGeneration #AIInvesting"
        ),
        "asset": None,
    },
    {
        "day": 4,
        "label": "The Autonomous Agent Era",
        "tweet": (
            "The era of manual chart reading is over.\n\n"
            "Welcome to the age of the autonomous agent. NeuraWealth OS operates "
            "synchronously with the market, planning multi-step strategies and "
            "executing them with zero hesitation.\n\n"
            "Your personal quant, always on.\n\n"
            "#CryptoBot #TelegramBot #PassiveIncome"
        ),
        "asset": "ad_creative_3.png",
    },
    {
        "day": 5,
        "label": "Data Synthesis & Signals",
        "tweet": (
            "The market generates millions of data points per second. "
            "Human cognition can't keep up.\n\n"
            "NeuraWealth OS leverages advanced context engineering to synthesize "
            "this data into high-confidence BUY/HOLD/SELL signals.\n\n"
            "Don't trade blind.\n\n"
            "#CryptoMarket #Investment #NeuraWealth"
        ),
        "asset": "ad_creative_2.png",
    },
    {
        "day": 6,
        "label": "The Psychological Edge",
        "tweet": (
            '"NeuraWealth OS removed the emotion from my trading. '
            "It's the most psychologically settled I've ever felt while "
            'managing my portfolio." — Early Adopter\n\n'
            "Ready to experience the difference?\n\n"
            "Try NeuraWealth OS today!\n\n"
            "#Testimonial #CryptoTrader #AIPowered"
        ),
        "asset": None,
    },
    {
        "day": 7,
        "label": "Structural Trading",
        "tweet": (
            "Stop trading on instinct. Start trading on structure.\n\n"
            "NeuraWealth OS brings the rigor of a four-layer context system "
            "to your Telegram, making complex crypto analysis simple and "
            "actionable.\n\n"
            "#SmartTrading #CryptoAnalysis #FinTech"
        ),
        "asset": None,
    },
]


# ── Twitter API Client ────────────────────────────────────────────────────────

class TwitterClient:
    """Lightweight wrapper around the X/Twitter API v2 using tweepy."""

    def __init__(self) -> None:
        self._client: Optional[object] = None
        self._api_v1: Optional[object] = None

    def _ensure_client(self) -> None:
        """Lazily initialise the tweepy client on first use."""
        if self._client is not None:
            return

        try:
            import tweepy
        except ImportError:
            logger.error(
                "tweepy is not installed. Run: pip install tweepy"
            )
            raise

        # OAuth 1.0a for posting tweets (v2 API)
        self._client = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
        )

        # OAuth 1.0a for media upload (v1.1 API — required for image uploads)
        auth = tweepy.OAuth1UserHandler(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
        )
        self._api_v1 = tweepy.API(auth)
        logger.info("Twitter client initialised successfully")

    def verify_credentials(self) -> bool:
        """Test that the credentials are valid."""
        self._ensure_client()
        try:
            me = self._client.get_me()  # type: ignore[union-attr]
            if me and me.data:
                logger.info("Authenticated as @%s (id=%s)", me.data.username, me.data.id)
                return True
        except Exception as exc:
            logger.error("Credential verification failed: %s", exc)
        return False

    def post_tweet(self, text: str, media_path: Optional[str] = None) -> bool:
        """Post a tweet, optionally with an image attachment.

        Returns True on success, False on failure.
        """
        self._ensure_client()

        media_ids = None
        if media_path and os.path.isfile(media_path):
            try:
                media = self._api_v1.media_upload(media_path)  # type: ignore[union-attr]
                media_ids = [media.media_id]
                logger.info("Uploaded media: %s → media_id=%s", media_path, media.media_id)
            except Exception as exc:
                logger.warning("Media upload failed (posting without image): %s", exc)

        try:
            response = self._client.create_tweet(  # type: ignore[union-attr]
                text=text,
                media_ids=media_ids,
            )
            if response and response.data:
                tweet_id = response.data.get("id", "unknown")
                logger.info("Tweet posted successfully: id=%s", tweet_id)
                return True
        except Exception as exc:
            logger.error("Failed to post tweet: %s", exc)

        return False


twitter_client = TwitterClient()


# ── Scheduling Logic ──────────────────────────────────────────────────────────

def get_todays_content() -> dict:
    """Return the content entry for today based on a rotating 7-day cycle.

    Uses the ISO weekday (Monday=1 … Sunday=7) mapped to the schedule.
    """
    today = datetime.now(timezone.utc)
    # Map ISO weekday (1-7) to schedule index (0-6)
    day_index = (today.isoweekday() - 1) % 7
    return CONTENT_SCHEDULE[day_index]


def resolve_asset_path(asset_filename: Optional[str]) -> Optional[str]:
    """Resolve an asset filename to an absolute path in the marketing directory."""
    if not asset_filename:
        return None
    # Try relative to the bot directory first, then marketing/ad_creatives
    candidates = [
        Path(__file__).parent.parent / "marketing" / "ad_creatives" / asset_filename,
        Path(__file__).parent / asset_filename,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    logger.warning("Asset not found: %s", asset_filename)
    return None


async def post_daily_tweet() -> None:
    """Select today's content and post it to X/Twitter."""
    content = get_todays_content()
    tweet_text = content["tweet"]
    asset_path = resolve_asset_path(content.get("asset"))

    logger.info(
        "Daily tweet — Day %d: %s (asset: %s)",
        content["day"],
        content["label"],
        asset_path or "none",
    )

    if not TWITTER_ENABLED:
        logger.warning(
            "TWITTER_ENABLED is false — skipping post. "
            "Set TWITTER_ENABLED=true when X API credits are available."
        )
        return

    if TWITTER_DRY_RUN:
        logger.info("[DRY RUN] Would post:\n%s", tweet_text)
        if asset_path:
            logger.info("[DRY RUN] With image: %s", asset_path)
        return

    success = twitter_client.post_tweet(tweet_text, media_path=asset_path)
    if success:
        logger.info("Daily tweet posted successfully for Day %d", content["day"])
    else:
        logger.error("Failed to post daily tweet for Day %d", content["day"])


# ── Standalone Scheduler ──────────────────────────────────────────────────────

async def run_scheduler() -> None:
    """Run the Twitter bot as a standalone scheduler.

    Posts one tweet per day at the configured hour (UTC).
    This function runs forever and is suitable for deployment on Railway.
    """
    logger.info("=" * 60)
    logger.info("NeuraWealth OS — Twitter Bot Starting")
    logger.info("=" * 60)
    logger.info("TWITTER_ENABLED  = %s", TWITTER_ENABLED)
    logger.info("TWITTER_DRY_RUN  = %s", TWITTER_DRY_RUN)
    logger.info("Post hour (UTC)  = %02d:00", DAILY_POST_HOUR_UTC)
    logger.info("=" * 60)

    if not TWITTER_ENABLED:
        logger.warning(
            "Twitter posting is DISABLED. "
            "Set TWITTER_ENABLED=true in environment to activate."
        )

    # Validate credentials on startup (only if enabled and not dry-run)
    if TWITTER_ENABLED and not TWITTER_DRY_RUN:
        if not all([TWITTER_API_KEY, TWITTER_API_SECRET,
                    TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET]):
            logger.error(
                "Missing Twitter API credentials. "
                "Set TWITTER_API_KEY, TWITTER_API_SECRET, "
                "TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET."
            )
            sys.exit(1)
        twitter_client.verify_credentials()

    posted_today = False

    while True:
        now = datetime.now(timezone.utc)

        # Reset the posted flag at midnight UTC
        if now.hour == 0 and now.minute == 0:
            posted_today = False

        # Post at the scheduled hour
        if now.hour == DAILY_POST_HOUR_UTC and not posted_today:
            await post_daily_tweet()
            posted_today = True

        # Sleep for 60 seconds between checks
        await asyncio.sleep(60)


# ── Integration with Telegram Bot ─────────────────────────────────────────────

def setup_twitter_jobs(app) -> None:
    """Register the daily tweet job on the Telegram bot's JobQueue.

    Call this from bot.py's main() to run Twitter posting alongside
    the Telegram bot instead of as a standalone process.

    Usage in bot.py:
        from twitter_bot import setup_twitter_jobs
        setup_twitter_jobs(app)
    """
    async def _daily_tweet_job(context) -> None:
        await post_daily_tweet()

    app.job_queue.run_daily(
        _daily_tweet_job,
        time=dt_time(hour=DAILY_POST_HOUR_UTC, minute=0, second=0),
        name="daily_twitter_post",
    )
    logger.info(
        "Twitter daily post scheduled at %02d:00 UTC (enabled=%s, dry_run=%s)",
        DAILY_POST_HOUR_UTC,
        TWITTER_ENABLED,
        TWITTER_DRY_RUN,
    )


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting NeuraWealth OS Twitter Bot (standalone mode)")
    try:
        asyncio.run(run_scheduler())
    except KeyboardInterrupt:
        logger.info("Twitter bot stopped by user")
    except Exception as exc:
        logger.error("Twitter bot crashed: %s", exc, exc_info=True)
        sys.exit(1)
