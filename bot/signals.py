"""
NeuraWealth OS Telegram Bot — Signal Generation Engine
======================================================
Fetches live market data from CoinGecko, runs technical analysis,
and produces formatted Telegram-ready signal messages.
"""

from __future__ import annotations

import logging
from typing import Optional

from coingecko import cg_client
from config import MONITORED_COINS
from technical_analysis import Signal, TAResult, analyse_coin

logger = logging.getLogger(__name__)


# ── Formatting Helpers ────────────────────────────────────────────────────────

SIGNAL_EMOJI = {
    Signal.BUY: "🟢",
    Signal.SELL: "🔴",
    Signal.HOLD: "🟡",
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


def format_signal(ta: TAResult, rank: Optional[int] = None) -> str:
    """Format a single TAResult into a Telegram-ready HTML message block."""
    emoji = SIGNAL_EMOJI[ta.signal]
    header = f"{emoji} <b>{ta.signal.value}</b> | {ta.symbol}"
    if rank is not None:
        header = f"#{rank} {header}"

    lines = [
        header,
        f"💰 Price: <code>{_format_price(ta.current_price)}</code>",
        f"📊 24h: {_format_change(ta.price_change_24h)}",
        f"🎯 Confidence: <b>{ta.confidence:.0f}/100</b>  [{_confidence_bar(ta.confidence)}]",
        "",
        "<b>Indicators:</b>",
    ]

    if ta.rsi is not None:
        lines.append(f"  • RSI(14): <code>{ta.rsi:.1f}</code>")
    if ta.ema_short is not None and ta.ema_long is not None:
        lines.append(
            f"  • EMA 9/21: <code>{_format_price(ta.ema_short)}</code> / <code>{_format_price(ta.ema_long)}</code>"
        )
    if ta.macd_line is not None:
        lines.append(f"  • MACD: <code>{ta.macd_line:.4f}</code>")
    if ta.macd_histogram is not None:
        hist_emoji = "📗" if ta.macd_histogram > 0 else "📕"
        lines.append(f"  • Histogram: {hist_emoji} <code>{ta.macd_histogram:.4f}</code>")

    if ta.reasoning:
        lines.append("")
        lines.append("<b>Analysis:</b>")
        for reason in ta.reasoning:
            lines.append(f"  → {reason}")

    return "\n".join(lines)


def format_signal_summary(signals: list[TAResult], top_n: int = 3) -> str:
    """Format the top-N buy signals into a single Telegram message."""
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
        blocks.append(format_signal(sig, rank=i))

    footer = (
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "⏰ Updated just now  |  /signals to refresh\n"
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
    return format_signal_summary(signals, top_n=top_n)


async def get_daily_report() -> str:
    """Generate a daily market report."""
    signals = await generate_signals()
    if not signals:
        return "⚠️ Unable to generate daily report. Please try again later."
    return format_daily_report(signals)
