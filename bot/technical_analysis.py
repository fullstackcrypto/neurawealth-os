"""
NeuraWealth OS Telegram Bot — Technical Analysis Engine
=======================================================
Pure-Python implementations of RSI, EMA, MACD, and a composite
confidence scorer.  No external TA library required — only numpy.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np

from config import (
    EMA_LONG,
    EMA_SHORT,
    MACD_FAST,
    MACD_SIGNAL,
    MACD_SLOW,
    RSI_PERIOD,
)

logger = logging.getLogger(__name__)


class Signal(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class TAResult:
    """Container for all technical-analysis outputs for a single coin."""

    coin_id: str
    symbol: str
    current_price: float
    price_change_24h: float  # percentage

    rsi: Optional[float] = None
    ema_short: Optional[float] = None
    ema_long: Optional[float] = None
    ema_crossover: Optional[str] = None  # "bullish" | "bearish" | None

    macd_line: Optional[float] = None
    macd_signal_line: Optional[float] = None
    macd_histogram: Optional[float] = None
    macd_crossover: Optional[str] = None  # "bullish" | "bearish" | None

    signal: Signal = Signal.HOLD
    confidence: float = 0.0
    reasoning: list[str] = field(default_factory=list)


# ── Core Calculations ─────────────────────────────────────────────────────────


def compute_ema(prices: np.ndarray, period: int) -> np.ndarray:
    """Compute Exponential Moving Average."""
    if len(prices) < period:
        return np.array([])
    alpha = 2.0 / (period + 1)
    ema = np.zeros_like(prices, dtype=float)
    ema[0] = prices[0]
    for i in range(1, len(prices)):
        ema[i] = alpha * prices[i] + (1 - alpha) * ema[i - 1]
    return ema


def compute_rsi(prices: np.ndarray, period: int = RSI_PERIOD) -> Optional[float]:
    """Compute the Relative Strength Index for the most recent bar."""
    if len(prices) < period + 1:
        return None
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100.0 - (100.0 / (1.0 + rs)))


def compute_macd(
    prices: np.ndarray,
    fast: int = MACD_FAST,
    slow: int = MACD_SLOW,
    signal_period: int = MACD_SIGNAL,
) -> tuple[Optional[float], Optional[float], Optional[float], Optional[str]]:
    """Return (macd_line, signal_line, histogram, crossover_direction)."""
    if len(prices) < slow + signal_period:
        return None, None, None, None

    ema_fast = compute_ema(prices, fast)
    ema_slow = compute_ema(prices, slow)
    macd_line = ema_fast - ema_slow

    signal_line = compute_ema(macd_line[slow - 1 :], signal_period)
    if len(signal_line) < 2:
        return None, None, None, None

    ml = float(macd_line[-1])
    sl = float(signal_line[-1])
    hist = ml - sl

    # Crossover detection (current vs previous bar)
    prev_ml = float(macd_line[-2])
    prev_sl = float(signal_line[-2])
    crossover = None
    if prev_ml <= prev_sl and ml > sl:
        crossover = "bullish"
    elif prev_ml >= prev_sl and ml < sl:
        crossover = "bearish"

    return ml, sl, hist, crossover


def compute_ema_crossover(
    prices: np.ndarray,
    short: int = EMA_SHORT,
    long: int = EMA_LONG,
) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Return (ema_short, ema_long, crossover_direction)."""
    if len(prices) < long + 1:
        return None, None, None

    ema_s = compute_ema(prices, short)
    ema_l = compute_ema(prices, long)

    crossover = None
    if ema_s[-2] <= ema_l[-2] and ema_s[-1] > ema_l[-1]:
        crossover = "bullish"
    elif ema_s[-2] >= ema_l[-2] and ema_s[-1] < ema_l[-1]:
        crossover = "bearish"

    return float(ema_s[-1]), float(ema_l[-1]), crossover


# ── Composite Confidence Scorer ───────────────────────────────────────────────


def score_confidence(ta: TAResult) -> TAResult:
    """
    Compute a 0-100 confidence score from the TA indicators and assign
    an overall BUY / SELL / HOLD signal with reasoning.
    """
    score = 50.0  # neutral baseline
    reasons: list[str] = []

    # ── RSI component (max ±20 pts) ───────────────────────────────────────
    if ta.rsi is not None:
        if ta.rsi < 30:
            bonus = min(20.0, (30 - ta.rsi) * 1.0)
            score += bonus
            reasons.append(f"RSI oversold ({ta.rsi:.1f})")
        elif ta.rsi > 70:
            penalty = min(20.0, (ta.rsi - 70) * 1.0)
            score -= penalty
            reasons.append(f"RSI overbought ({ta.rsi:.1f})")
        elif 40 <= ta.rsi <= 60:
            reasons.append(f"RSI neutral ({ta.rsi:.1f})")
        elif ta.rsi < 40:
            score += 5
            reasons.append(f"RSI leaning oversold ({ta.rsi:.1f})")
        else:
            score -= 5
            reasons.append(f"RSI leaning overbought ({ta.rsi:.1f})")

    # ── EMA crossover component (max ±15 pts) ────────────────────────────
    if ta.ema_crossover == "bullish":
        score += 15
        reasons.append("EMA 9/21 bullish crossover")
    elif ta.ema_crossover == "bearish":
        score -= 15
        reasons.append("EMA 9/21 bearish crossover")
    elif ta.ema_short is not None and ta.ema_long is not None:
        if ta.ema_short > ta.ema_long:
            score += 5
            reasons.append("Price above EMA 21 (bullish trend)")
        else:
            score -= 5
            reasons.append("Price below EMA 21 (bearish trend)")

    # ── MACD component (max ±15 pts) ─────────────────────────────────────
    if ta.macd_crossover == "bullish":
        score += 15
        reasons.append("MACD bullish crossover")
    elif ta.macd_crossover == "bearish":
        score -= 15
        reasons.append("MACD bearish crossover")
    elif ta.macd_histogram is not None:
        if ta.macd_histogram > 0:
            score += 5
            reasons.append("MACD histogram positive")
        else:
            score -= 5
            reasons.append("MACD histogram negative")

    # ── 24h momentum (max ±10 pts) ────────────────────────────────────────
    if ta.price_change_24h > 5:
        score += 5
        reasons.append(f"Strong 24h momentum (+{ta.price_change_24h:.1f}%)")
    elif ta.price_change_24h > 2:
        score += 3
        reasons.append(f"Positive 24h momentum (+{ta.price_change_24h:.1f}%)")
    elif ta.price_change_24h < -5:
        score -= 5
        reasons.append(f"Negative 24h momentum ({ta.price_change_24h:.1f}%)")
    elif ta.price_change_24h < -2:
        score -= 3
        reasons.append(f"Slight 24h decline ({ta.price_change_24h:.1f}%)")

    # ── Clamp & classify ─────────────────────────────────────────────────
    score = max(0.0, min(100.0, score))

    if score >= 65:
        ta.signal = Signal.BUY
    elif score <= 35:
        ta.signal = Signal.SELL
    else:
        ta.signal = Signal.HOLD

    ta.confidence = round(score, 1)
    ta.reasoning = reasons
    return ta


# ── Full Analysis Pipeline ────────────────────────────────────────────────────


def analyse_coin(
    coin_id: str,
    symbol: str,
    prices: list[float],
    current_price: float,
    price_change_24h: float,
) -> TAResult:
    """Run the full TA pipeline on a list of historical closing prices."""
    arr = np.array(prices, dtype=float)

    rsi = compute_rsi(arr)
    ema_s, ema_l, ema_cross = compute_ema_crossover(arr)
    macd_l, macd_sl, macd_h, macd_cross = compute_macd(arr)

    result = TAResult(
        coin_id=coin_id,
        symbol=symbol.upper(),
        current_price=current_price,
        price_change_24h=price_change_24h,
        rsi=rsi,
        ema_short=ema_s,
        ema_long=ema_l,
        ema_crossover=ema_cross,
        macd_line=macd_l,
        macd_signal_line=macd_sl,
        macd_histogram=macd_h,
        macd_crossover=macd_cross,
    )

    return score_confidence(result)
