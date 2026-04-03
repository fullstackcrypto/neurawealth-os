"""
NeuraWealth OS Telegram Bot — Signal Generation Engine
======================================================
Fetches live market data from CoinGecko, runs technical analysis,
and produces formatted Telegram-ready signal messages with premium
formatting, target/stop-loss levels, and accuracy tracking.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from coingecko import cg_client
from config import MONITORED_COINS
from technical_analysis import Signal, TAResult, analyse_coin

logger = logging.getLogger(__name__)

# Lazy import to avoid circular dependency — set by bot.py at startup
_db = None


def set_db(database):
    """Set the database reference for signal logging."""
    global _db
    _db = database


# ── Formatting Helpers ────────────────────────────────────────────────────────

SIGNAL_EMOJI = {
    Signal.BUY: "🟢",
    Signal.SELL: "🔴",
    Signal.HOLD: "🟡",
}

SIGNAL_LABEL = {
    Signal.BUY: "STRONG BUY",
    Signal.SELL: "STRONG SELL",
    Signal.HOLD: "HOLD",
}


def _format_price(price: float) -> str:
    if price >= 1:
        return f"${price:,.2f}"
    elif price >= 0.01:
        return f"${price:,.4f}"
    else:
        return f"${price:,.8f}"


def _format_change(change: float) -> str:
    arrow = "📈" if change >= 0 else "📉"
    return f"{arrow} {change:+.2f}%"


def _confidence_bar(score: float) -> str:
    filled = int(score / 10)
    empty = 10 - filled
    return "█" * filled + "░" * empty


def _compute_target_stop(ta: TAResult) -> tuple[float, float]:
    """Compute target price and stop-loss based on signal and volatility."""
    price = ta.current_price
    # Use confidence to scale target: higher confidence = wider target
    confidence_factor = ta.confidence / 100.0
    if ta.signal == Signal.BUY:
        target = price * (1 + 0.03 + 0.07 * confidence_factor)  # 3-10% upside
        stop = price * (1 - 0.02 - 0.03 * confidence_factor)    # 2-5% downside
    elif ta.signal == Signal.SELL:
        target = price * (1 - 0.03 - 0.07 * confidence_factor)  # 3-10% downside
        stop = price * (1 + 0.02 + 0.03 * confidence_factor)    # 2-5% upside
    else:
        target = price * 1.03
        stop = price * 0.97
    return round(target, 2), round(stop, 2)


def _rsi_label(rsi: float) -> str:
    if rsi < 30:
        return "Oversold"
    elif rsi < 40:
        return "Near oversold"
    elif rsi > 70:
        return "Overbought"
    elif rsi > 60:
        return "Near overbought"
    return "Neutral"


def _macd_label(ta: TAResult) -> str:
    if ta.macd_crossover == "bullish":
        return "Bullish crossover"
    elif ta.macd_crossover == "bearish":
        return "Bearish crossover"
    elif ta.macd_histogram is not None:
        return "Positive momentum" if ta.macd_histogram > 0 else "Negative momentum"
    return "Neutral"


def _ema_label(ta: TAResult) -> str:
    if ta.ema_crossover == "bullish":
        return "Golden cross"
    elif ta.ema_crossover == "bearish":
        return "Death cross"
    elif ta.ema_short is not None and ta.ema_long is not None:
        return "Bullish trend" if ta.ema_short > ta.ema_long else "Bearish trend"
    return "Neutral"


def format_signal_premium(ta: TAResult, rank: Optional[int] = None, accuracy_7d: float = 0.0, signal_number: int = 0) -> str:
    """Format a single TAResult into a premium Telegram-ready HTML message block."""
    emoji = SIGNAL_EMOJI[ta.signal]
    label = SIGNAL_LABEL[ta.signal]
    target, stop = _compute_target_stop(ta)

    # Coin name from symbol
    coin_name = ta.symbol

    target_pct = ((target - ta.current_price) / ta.current_price) * 100
    stop_pct = ((stop - ta.current_price) / ta.current_price) * 100

    now_str = datetime.now(timezone.utc).strftime("%b %d, %Y")

    lines = [
        "━━━━━━━━━━━━━━━━━━━━",
        f"{emoji} <b>{label} — {coin_name}</b>",
        "━━━━━━━━━━━━━━━━━━━━",
        f"💰 Price: <code>{_format_price(ta.current_price)}</code> ({ta.price_change_24h:+.1f}%)",
        f"📊 Confidence: <b>{ta.confidence:.0f}/100</b>",
        "━━━━━━━━━━━━━━━━━━━━",
    ]

    if ta.rsi is not None:
        lines.append(f"📈 RSI(14): <code>{ta.rsi:.1f}</code> — {_rsi_label(ta.rsi)}")
    lines.append(f"📉 MACD: {_macd_label(ta)}")
    lines.append(f"📊 EMA(9/21): {_ema_label(ta)}")
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"🎯 Target: <code>{_format_price(target)}</code> ({target_pct:+.1f}%)")
    lines.append(f"🛡️ Stop Loss: <code>{_format_price(stop)}</code> ({stop_pct:+.1f}%)")
    lines.append("━━━━━━━━━━━━━━━━━━━━")

    acc_str = f"{accuracy_7d:.0f}%" if accuracy_7d > 0 else "Tracking..."
    lines.append(f"✅ Bot Accuracy: {acc_str} (7-day)")
    if signal_number > 0:
        lines.append(f"⏰ Signal #{signal_number:,} | {now_str}")
    else:
        lines.append(f"⏰ {now_str}")
    lines.append("━━━━━━━━━━━━━━━━━━━━")

    return "\n".join(lines)


def format_signal(ta: TAResult, rank: Optional[int] = None) -> str:
    """Format a single TAResult into a Telegram-ready HTML message block (legacy)."""
    return format_signal_premium(ta, rank)


def format_signal_summary(signals: list[TAResult], top_n: int = 3, accuracy_7d: float = 0.0, signal_count: int = 0) -> str:
    """Format the top-N buy signals into a single Telegram message with premium formatting."""
    buy_signals = sorted(
        [s for s in signals if s.signal == Signal.BUY],
        key=lambda s: s.confidence,
        reverse=True,
    )[:top_n]

    if not buy_signals:
        # Fall back to top-N by confidence regardless of signal
        buy_signals = sorted(signals, key=lambda s: s.confidence, reverse=True)[:top_n]

    header = (
        "🧠 <b>NeuraWealth OS — Live Signals</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    )
    blocks = []
    for i, sig in enumerate(buy_signals, 1):
        blocks.append(format_signal_premium(sig, rank=i, accuracy_7d=accuracy_7d, signal_number=signal_count + i))

    # Log signals to database
    if _db is not None:
        for sig in buy_signals:
            target, stop = _compute_target_stop(sig)
            try:
                _db.log_signal(
                    coin_id=sig.coin_id,
                    signal_type=sig.signal.value,
                    confidence=sig.confidence,
                    price=sig.current_price,
                    reasoning="; ".join(sig.reasoning),
                    symbol=sig.symbol,
                    target_price=target,
                    stop_loss=stop,
                )
            except Exception as exc:
                logger.error("Failed to log signal for %s: %s", sig.symbol, exc)

    footer = (
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "⏰ Updated just now  |  /signals to refresh\n"
        "📊 /accuracy — View signal accuracy\n"
        "⭐ Upgrade to Premium for auto-delivery → /subscribe"
    )

    return header + "\n\n".join(blocks) + footer


def format_daily_report(signals: list[TAResult]) -> str:
    """Format a daily market summary."""
    buys = [s for s in signals if s.signal == Signal.BUY]
    sells = [s for s in signals if s.signal == Signal.SELL]
    holds = [s for s in signals if s.signal == Signal.HOLD]

    lines = [
        "📋 <b>NeuraWealth OS — Daily Market Report</b>",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        f"🟢 Buy signals: <b>{len(buys)}</b>",
        f"🔴 Sell signals: <b>{len(sells)}</b>",
        f"🟡 Hold signals: <b>{len(holds)}</b>",
        "",
    ]

    if buys:
        top = sorted(buys, key=lambda s: s.confidence, reverse=True)[:5]
        lines.append("<b>Top Buy Opportunities:</b>")
        for s in top:
            lines.append(
                f"  🟢 {s.symbol}: {_format_price(s.current_price)} "
                f"({_format_change(s.price_change_24h)}) — "
                f"Confidence {s.confidence:.0f}%"
            )
        lines.append("")

    if sells:
        top_sells = sorted(sells, key=lambda s: s.confidence)[:3]
        lines.append("<b>Caution — Sell Signals:</b>")
        for s in top_sells:
            lines.append(
                f"  🔴 {s.symbol}: {_format_price(s.current_price)} "
                f"({_format_change(s.price_change_24h)}) — "
                f"Confidence {s.confidence:.0f}%"
            )
        lines.append("")

    lines.extend([
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "📊 /signals for detailed analysis",
        "📈 /accuracy — Signal accuracy stats",
        "💼 /portfolio to track your holdings",
    ])

    return "\n".join(lines)


# ── Signal Generation ─────────────────────────────────────────────────────────


async def generate_signals(
    coin_ids: Optional[list[str]] = None,
) -> list[TAResult]:
    """
    Fetch market data for the given coins (or all monitored coins),
    run technical analysis, and return a list of TAResult objects.
    """
    ids = coin_ids or MONITORED_COINS
    results: list[TAResult] = []

    # Fetch market overview for prices and 24h change
    markets = await cg_client.get_markets(coin_ids=ids, per_page=len(ids))
    if not markets:
        logger.error("Failed to fetch market data from CoinGecko")
        return results

    for coin in markets:
        coin_id = coin["id"]
        symbol = coin.get("symbol", coin_id).upper()
        current_price = coin.get("current_price", 0)
        change_24h = coin.get("price_change_percentage_24h") or 0.0

        try:
            chart = await cg_client.get_market_chart(coin_id, days=30)
            if not chart or "prices" not in chart:
                logger.warning("No chart data for %s", coin_id)
                continue

            closing_prices = [p[1] for p in chart["prices"]]
            if len(closing_prices) < 30:
                logger.warning("Insufficient price history for %s (%d pts)", coin_id, len(closing_prices))
                continue

            ta = analyse_coin(
                coin_id=coin_id,
                symbol=symbol,
                prices=closing_prices,
                current_price=current_price,
                price_change_24h=change_24h,
            )
            results.append(ta)
            logger.info(
                "Signal for %s: %s (confidence %.1f)",
                symbol,
                ta.signal.value,
                ta.confidence,
            )

        except Exception as exc:
            logger.error("TA failed for %s: %s", coin_id, exc, exc_info=True)

    return results


async def get_top_signals(top_n: int = 3) -> str:
    """Generate signals and return a formatted Telegram message."""
    signals = await generate_signals()
    if not signals:
        return "⚠️ Unable to generate signals right now. Please try again later."

    # Get accuracy stats for display
    accuracy_7d = 0.0
    signal_count = 0
    if _db is not None:
        try:
            stats = _db.get_accuracy_stats(days=7)
            accuracy_7d = stats["accuracy"]
            signal_count = _db.get_total_signals()
        except Exception:
            pass

    return format_signal_summary(signals, top_n=top_n, accuracy_7d=accuracy_7d, signal_count=signal_count)


async def get_daily_report() -> str:
    """Generate a daily market report."""
    signals = await generate_signals()
    if not signals:
        return "⚠️ Unable to generate daily report. Please try again later."
    return format_daily_report(signals)
