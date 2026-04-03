"""
NeuraWealth OS Telegram Bot — Test Suite
========================================
Tests CoinGecko API, technical analysis, signal generation,
and database operations without requiring a Telegram bot token.
"""

import asyncio
import os
import sys
import tempfile

import numpy as np


def test_technical_analysis():
    """Test RSI, EMA, MACD calculations with known data."""
    from technical_analysis import (
        Signal,
        analyse_coin,
        compute_ema,
        compute_ema_crossover,
        compute_macd,
        compute_rsi,
    )

    print("=" * 60)
    print("TEST: Technical Analysis")
    print("=" * 60)

    # Generate synthetic price data (uptrend)
    np.random.seed(42)
    n = 100
    trend = np.linspace(100, 130, n)
    noise = np.random.normal(0, 2, n)
    prices = trend + noise

    # Test RSI
    rsi = compute_rsi(prices)
    assert rsi is not None, "RSI should not be None"
    assert 0 <= rsi <= 100, f"RSI out of range: {rsi}"
    print(f"  ✅ RSI(14) = {rsi:.2f} (expected 50-80 for uptrend)")

    # Test EMA
    ema = compute_ema(prices, 9)
    assert len(ema) == len(prices), "EMA length mismatch"
    print(f"  ✅ EMA(9) last value = {ema[-1]:.2f}")

    # Test EMA crossover
    ema_s, ema_l, cross = compute_ema_crossover(prices)
    assert ema_s is not None, "EMA short should not be None"
    assert ema_l is not None, "EMA long should not be None"
    print(f"  ✅ EMA 9/21 crossover: {cross or 'none'}")

    # Test MACD
    ml, sl, hist, mcross = compute_macd(prices)
    assert ml is not None, "MACD line should not be None"
    print(f"  ✅ MACD line = {ml:.4f}, signal = {sl:.4f}, hist = {hist:.4f}")

    # Test full analysis pipeline
    result = analyse_coin(
        coin_id="test-coin",
        symbol="TEST",
        prices=prices.tolist(),
        current_price=float(prices[-1]),
        price_change_24h=5.2,
    )
    assert result.confidence >= 0, "Confidence should be >= 0"
    assert result.confidence <= 100, "Confidence should be <= 100"
    assert result.signal in (Signal.BUY, Signal.SELL, Signal.HOLD)
    print(f"  ✅ Full analysis: {result.signal.value} (confidence {result.confidence})")
    print(f"     Reasoning: {', '.join(result.reasoning)}")

    # Test with downtrend data
    down_prices = np.linspace(130, 90, n) + noise
    result_down = analyse_coin(
        coin_id="test-down",
        symbol="DOWN",
        prices=down_prices.tolist(),
        current_price=float(down_prices[-1]),
        price_change_24h=-8.5,
    )
    print(f"  ✅ Downtrend: {result_down.signal.value} (confidence {result_down.confidence})")

    # Test with insufficient data
    rsi_short = compute_rsi(np.array([100, 101, 102]))
    assert rsi_short is None, "RSI with insufficient data should be None"
    print("  ✅ RSI returns None for insufficient data")

    print()


def test_database():
    """Test database CRUD operations."""
    from database import Database

    print("=" * 60)
    print("TEST: Database Operations")
    print("=" * 60)

    # Use temp file for test DB
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        test_db_path = f.name

    try:
        tdb = Database(test_db_path)

        # Test user creation
        user = tdb.upsert_user(12345, "testuser", "Test")
        assert user["user_id"] == 12345
        assert user["tier"] == "free"
        print("  ✅ User created successfully")

        # Test user retrieval
        user2 = tdb.get_user(12345)
        assert user2 is not None
        assert user2["username"] == "testuser"
        print("  ✅ User retrieved successfully")

        # Test tier update
        tdb.set_user_tier(12345, "premium")
        assert tdb.get_user_tier(12345) == "premium"
        print("  ✅ User tier updated to premium")

        # Test portfolio
        tdb.add_to_portfolio(12345, "bitcoin", "BTC", 0.5)
        tdb.add_to_portfolio(12345, "ethereum", "ETH", 2.0)
        portfolio = tdb.get_portfolio(12345)
        assert len(portfolio) == 2
        assert portfolio[0]["amount"] == 0.5
        print(f"  ✅ Portfolio: {len(portfolio)} coins added")

        # Test portfolio accumulation
        tdb.add_to_portfolio(12345, "bitcoin", "BTC", 0.3)
        portfolio = tdb.get_portfolio(12345)
        btc = [p for p in portfolio if p["coin_id"] == "bitcoin"][0]
        assert btc["amount"] == 0.8, f"Expected 0.8, got {btc['amount']}"
        print("  ✅ Portfolio accumulation works (0.5 + 0.3 = 0.8 BTC)")

        # Test portfolio removal
        removed = tdb.remove_from_portfolio(12345, "ethereum")
        assert removed is True
        portfolio = tdb.get_portfolio(12345)
        assert len(portfolio) == 1
        print("  ✅ Portfolio removal works")

        # Test alerts
        alert_id = tdb.create_alert(12345, "bitcoin", "BTC", 100000.0, "above")
        alerts = tdb.get_active_alerts(12345)
        assert len(alerts) == 1
        assert alerts[0]["target_price"] == 100000.0
        print(f"  ✅ Alert created (ID: {alert_id})")

        # Test alert trigger
        tdb.trigger_alert(alert_id)
        alerts = tdb.get_active_alerts(12345)
        assert len(alerts) == 0
        print("  ✅ Alert triggered and deactivated")

        # Test premium users list
        tdb.upsert_user(99999, "freeuser", "Free")
        premium = tdb.get_premium_users()
        assert len(premium) == 1
        assert premium[0]["user_id"] == 12345
        print("  ✅ Premium user filtering works")

        # Test stats
        stats = tdb.get_stats()
        assert stats["total_users"] == 2
        assert stats["premium_users"] == 1
        print(f"  ✅ Stats: {stats}")

        # Test signal logging
        tdb.log_signal("bitcoin", "BUY", 75.0, 65000.0, "RSI oversold + MACD bullish")
        signals = tdb.get_recent_signals(hours=1)
        assert len(signals) == 1
        print("  ✅ Signal logging works")

    finally:
        os.unlink(test_db_path)

    print()


async def test_coingecko():
    """Test CoinGecko API integration."""
    from coingecko import CoinGeckoClient

    print("=" * 60)
    print("TEST: CoinGecko API")
    print("=" * 60)

    client = CoinGeckoClient()

    try:
        # Test ping
        ok = await client.ping()
        print(f"  {'✅' if ok else '❌'} Ping: {'OK' if ok else 'FAILED'}")

        if not ok:
            print("  ⚠️ CoinGecko API unreachable — skipping remaining tests")
            return

        # Test symbol resolution
        btc_id = client.resolve_symbol("BTC")
        assert btc_id == "bitcoin"
        print(f"  ✅ Symbol resolution: BTC → {btc_id}")

        # Test price fetch
        price = await client.get_coin_price("bitcoin")
        if price:
            print(f"  ✅ BTC price: ${price.get('usd', 'N/A'):,.2f}")
            print(f"     24h change: {price.get('usd_24h_change', 'N/A'):.2f}%")
        else:
            print("  ⚠️ Price fetch returned None (rate limited?)")

        # Test multi-price
        prices = await client.get_price(["bitcoin", "ethereum"])
        if prices:
            for coin_id, data in prices.items():
                print(f"  ✅ {coin_id}: ${data.get('usd', 'N/A'):,.2f}")
        else:
            print("  ⚠️ Multi-price fetch returned None")

        # Test trending
        trending = await client.get_trending()
        if trending and "coins" in trending:
            coins = trending["coins"][:3]
            for c in coins:
                name = c.get("item", {}).get("name", "?")
                print(f"  ✅ Trending: {name}")
        else:
            print("  ⚠️ Trending fetch returned None")

        # Test market chart (for TA)
        chart = await client.get_market_chart("bitcoin", days=30)
        if chart and "prices" in chart:
            n_points = len(chart["prices"])
            print(f"  ✅ Market chart: {n_points} price points (30 days)")
        else:
            print("  ⚠️ Market chart returned None")

    finally:
        await client.close()

    print()


async def test_signal_generation():
    """Test the full signal generation pipeline."""
    from signals import format_signal, generate_signals, format_signal_summary

    print("=" * 60)
    print("TEST: Signal Generation (live data)")
    print("=" * 60)

    # Generate signals for a small set to avoid rate limits
    signals = await generate_signals(coin_ids=["bitcoin", "ethereum", "solana"])

    if not signals:
        print("  ⚠️ No signals generated (API may be rate limited)")
        print("     This is expected on the free CoinGecko tier.")
        return

    print(f"  ✅ Generated {len(signals)} signals")

    for s in signals:
        emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "🟡"}[s.signal.value]
        print(
            f"  {emoji} {s.symbol}: {s.signal.value} "
            f"(confidence {s.confidence:.0f}) @ ${s.current_price:,.2f}"
        )

    # Test formatting
    formatted = format_signal(signals[0], rank=1)
    assert len(formatted) > 0
    print(f"  ✅ Signal formatting works ({len(formatted)} chars)")

    summary = format_signal_summary(signals, top_n=3)
    assert len(summary) > 0
    print(f"  ✅ Summary formatting works ({len(summary)} chars)")

    print()


def test_config():
    """Test configuration loading."""
    from config import (
        MONITORED_COINS,
        SUBSCRIPTION_TIERS,
        SYMBOL_TO_ID,
    )

    print("=" * 60)
    print("TEST: Configuration")
    print("=" * 60)

    assert len(MONITORED_COINS) >= 10
    print(f"  ✅ Monitoring {len(MONITORED_COINS)} coins")

    assert len(SYMBOL_TO_ID) >= 20
    print(f"  ✅ {len(SYMBOL_TO_ID)} symbol mappings")

    assert "free" in SUBSCRIPTION_TIERS
    assert "premium" in SUBSCRIPTION_TIERS
    assert "enterprise" in SUBSCRIPTION_TIERS
    print(f"  ✅ {len(SUBSCRIPTION_TIERS)} subscription tiers")

    print()


async def main():
    print()
    print("🧠 NeuraWealth OS — Bot Test Suite")
    print("=" * 60)
    print()

    test_config()
    test_technical_analysis()
    test_database()
    await test_coingecko()
    await test_signal_generation()

    print("=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
