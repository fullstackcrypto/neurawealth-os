"""
NeuraWealth OS Telegram Bot — CoinGecko API Client
===================================================
Async wrapper around the CoinGecko free (v3) API with built-in
rate limiting, retries, and response caching.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

import aiohttp

from config import (
    COINGECKO_API_KEY,
    COINGECKO_BASE_URL,
    COINGECKO_RATE_LIMIT,
    SYMBOL_TO_ID,
)

logger = logging.getLogger(__name__)


class CoinGeckoClient:
    """Async CoinGecko API client with rate limiting and caching."""

    def __init__(self) -> None:
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request: float = 0.0
        self._cache: dict[str, tuple[float, Any]] = {}
        self._cache_ttl: float = 30.0  # seconds

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            headers: dict[str, str] = {"Accept": "application/json"}
            if COINGECKO_API_KEY:
                headers["x-cg-demo-api-key"] = COINGECKO_API_KEY
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < COINGECKO_RATE_LIMIT:
            await asyncio.sleep(COINGECKO_RATE_LIMIT - elapsed)
        self._last_request = time.monotonic()

    async def _get(
        self, path: str, params: Optional[dict[str, str]] = None, cache_ttl: float | None = None
    ) -> Any:
        ttl = cache_ttl if cache_ttl is not None else self._cache_ttl
        cache_key = f"{path}:{params}"
        if cache_key in self._cache:
            ts, data = self._cache[cache_key]
            if time.monotonic() - ts < ttl:
                return data

        await self._rate_limit()
        session = await self._get_session()
        url = COINGECKO_BASE_URL + path

        for attempt in range(3):
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 429:
                        wait = 60 * (attempt + 1)
                        logger.warning("CoinGecko rate limited. Waiting %ds", wait)
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    data = await resp.json()
                    self._cache[cache_key] = (time.monotonic(), data)
                    return data
            except aiohttp.ClientError as exc:
                logger.error("CoinGecko request failed (attempt %d): %s", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        return None

    # ── Public helpers ────────────────────────────────────────────────────

    @staticmethod
    def resolve_symbol(symbol: str) -> Optional[str]:
        """Resolve a ticker symbol (e.g. 'BTC') to a CoinGecko ID."""
        return SYMBOL_TO_ID.get(symbol.lower())

    # ── Price endpoints ───────────────────────────────────────────────────

    async def get_price(
        self,
        coin_ids: list[str],
        vs_currency: str = "usd",
        include_24h_change: bool = True,
        include_market_cap: bool = False,
    ) -> Optional[dict[str, Any]]:
        params: dict[str, str] = {
            "ids": ",".join(coin_ids),
            "vs_currencies": vs_currency,
            "include_24hr_change": str(include_24h_change).lower(),
            "include_market_cap": str(include_market_cap).lower(),
        }
        return await self._get("/simple/price", params)

    async def get_coin_price(
        self, coin_id: str, vs_currency: str = "usd"
    ) -> Optional[dict[str, Any]]:
        data = await self.get_price(
            [coin_id], vs_currency, include_24h_change=True, include_market_cap=True
        )
        if data and coin_id in data:
            return data[coin_id]
        return None

    # ── Market data (for TA) ──────────────────────────────────────────────

    async def get_market_chart(
        self, coin_id: str, days: int = 30, vs_currency: str = "usd"
    ) -> Optional[dict[str, Any]]:
        params = {
            "vs_currency": vs_currency,
            "days": str(days),
        }
        return await self._get(f"/coins/{coin_id}/market_chart", params, cache_ttl=300)

    async def get_markets(
        self,
        coin_ids: Optional[list[str]] = None,
        vs_currency: str = "usd",
        per_page: int = 50,
        page: int = 1,
        sparkline: bool = False,
    ) -> Optional[list[dict[str, Any]]]:
        params: dict[str, str] = {
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": str(per_page),
            "page": str(page),
            "sparkline": str(sparkline).lower(),
            "price_change_percentage": "1h,24h,7d",
        }
        if coin_ids:
            params["ids"] = ",".join(coin_ids)
        return await self._get("/coins/markets", params)

    # ── Trending ──────────────────────────────────────────────────────────

    async def get_trending(self) -> Optional[dict[str, Any]]:
        return await self._get("/search/trending", cache_ttl=120)

    # ── OHLC (for candle-based TA) ────────────────────────────────────────

    async def get_ohlc(
        self, coin_id: str, days: int = 30, vs_currency: str = "usd"
    ) -> Optional[list[list[float]]]:
        params = {"vs_currency": vs_currency, "days": str(days)}
        return await self._get(f"/coins/{coin_id}/ohlc", params, cache_ttl=300)

    # ── Coin info ─────────────────────────────────────────────────────────

    async def search_coin(self, query: str) -> Optional[dict[str, Any]]:
        return await self._get("/search", {"query": query})

    async def ping(self) -> bool:
        data = await self._get("/ping")
        return data is not None


# Module-level singleton
cg_client = CoinGeckoClient()
