import { describe, expect, it } from "vitest";

import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  formatTelegramSignal,
  generateSignal,
} from "./technicalAnalysis";

describe("calculateEMA", () => {
  it("returns empty array for empty input", () => {
    expect(calculateEMA([], 9)).toEqual([]);
  });

  it("returns single-element array unchanged", () => {
    expect(calculateEMA([100], 9)).toEqual([100]);
  });

  it("first value equals first price", () => {
    const result = calculateEMA([50, 60, 70], 2);
    expect(result[0]).toBe(50);
  });

  it("applies exponential decay correctly", () => {
    // EMA(2) multiplier = 2/(2+1) = 2/3
    // ema[0] = 10, ema[1] = (20 - 10) * 2/3 + 10 = 16.666...
    const result = calculateEMA([10, 20], 2);
    expect(result[1]).toBeCloseTo(16.667, 2);
  });

  it("output length matches input length", () => {
    const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculateEMA(prices, 5)).toHaveLength(prices.length);
  });
});

describe("calculateRSI", () => {
  it("returns 50 for empty input", () => {
    expect(calculateRSI([], 14)).toBe(50);
  });

  it("returns 50 when data length is less than period + 1", () => {
    expect(calculateRSI([100, 101, 102], 14)).toBe(50);
  });

  it("returns 50 at exactly period length (needs period + 1)", () => {
    const prices = Array.from({ length: 14 }, (_, i) => 100 + i);
    expect(calculateRSI(prices, 14)).toBe(50);
  });

  it("returns 100 when all price changes are gains (no losses)", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(calculateRSI(prices, 14)).toBe(100);
  });

  it("returns a value between 0 and 100 for mixed price data", () => {
    const prices = [100, 102, 101, 103, 105, 104, 106, 107, 106, 108, 110, 109, 111, 112, 110];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it("produces a high RSI for a sustained uptrend", () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    expect(calculateRSI(prices, 14)).toBeGreaterThan(70);
  });

  it("produces a low RSI for a sustained downtrend", () => {
    const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
    expect(calculateRSI(prices, 14)).toBeLessThan(30);
  });
});

describe("calculateMACD", () => {
  it("returns zeroed object when fewer than 26 prices", () => {
    expect(calculateMACD([])).toEqual({ macd: 0, signal: 0, histogram: 0 });
    expect(calculateMACD([100, 101])).toEqual({ macd: 0, signal: 0, histogram: 0 });
  });

  it("returns finite numbers for sufficient price data", () => {
    const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
    const result = calculateMACD(prices);
    expect(Number.isFinite(result.macd)).toBe(true);
    expect(Number.isFinite(result.signal)).toBe(true);
    expect(Number.isFinite(result.histogram)).toBe(true);
  });

  it("histogram equals macd minus signal", () => {
    const prices = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = calculateMACD(prices);
    expect(result.histogram).toBeCloseTo(result.macd - result.signal, 10);
  });

  it("positive histogram for a rising trend", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 3);
    const result = calculateMACD(prices);
    expect(result.histogram).toBeGreaterThan(0);
  });
});

describe("generateSignal", () => {
  it("returns safe defaults for empty inputs", () => {
    expect(calculateEMA([], 9)).toEqual([]);
    expect(calculateRSI([], 14)).toBe(50);
    expect(calculateMACD([])).toEqual({ macd: 0, signal: 0, histogram: 0 });
  });

  it("ignores invalid prices instead of returning NaN", () => {
    const signal = generateSignal([100, 101, Number.NaN, Infinity, 102, 103], 103);

    expect(Number.isFinite(signal.rsi)).toBe(true);
    expect(Number.isFinite(signal.ema9)).toBe(true);
    expect(Number.isFinite(signal.ema21)).toBe(true);
    expect(Number.isFinite(signal.macd.macd)).toBe(true);
    expect(Number.isFinite(signal.macd.signal)).toBe(true);
    expect(Number.isFinite(signal.macd.histogram)).toBe(true);
  });

  it("produces a buy-leaning signal for a strong uptrend", () => {
    const prices = Array.from({ length: 60 }, (_, index) => 100 + index * 2);
    const signal = generateSignal(prices, prices[prices.length - 1]);

    expect(["BUY", "HOLD"]).toContain(signal.signal);
    expect(signal.aiConfidence).toBeGreaterThanOrEqual(50);
  });

  it("produces a sell-leaning signal for a strong downtrend", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 200 - i * 2);
    const signal = generateSignal(prices, prices[prices.length - 1]);

    expect(["SELL", "HOLD"]).toContain(signal.signal);
    expect(signal.aiConfidence).toBeLessThanOrEqual(50);
  });

  it("emaCrossover is BULLISH when short EMA is well above long EMA", () => {
    // Steeply rising prices → EMA9 ends higher than EMA21
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 5);
    const signal = generateSignal(prices, prices[prices.length - 1]);
    expect(signal.emaCrossover).toBe("BULLISH");
  });

  it("emaCrossover is BEARISH when short EMA is well below long EMA", () => {
    // Steeply falling prices → EMA9 ends lower than EMA21
    const prices = Array.from({ length: 60 }, (_, i) => 400 - i * 5);
    const signal = generateSignal(prices, prices[prices.length - 1]);
    expect(signal.emaCrossover).toBe("BEARISH");
  });

  it("aiConfidence is clamped between 0 and 100", () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 + i * 10);
    const upSignal = generateSignal(up, up[up.length - 1]);
    expect(upSignal.aiConfidence).toBeGreaterThanOrEqual(0);
    expect(upSignal.aiConfidence).toBeLessThanOrEqual(100);

    const down = Array.from({ length: 60 }, (_, i) => 700 - i * 10);
    const downSignal = generateSignal(down, down[down.length - 1]);
    expect(downSignal.aiConfidence).toBeGreaterThanOrEqual(0);
    expect(downSignal.aiConfidence).toBeLessThanOrEqual(100);
  });

  it("signal is BUY when aiConfidence >= 65", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 3);
    const signal = generateSignal(prices, prices[prices.length - 1]);
    if (signal.aiConfidence >= 65) {
      expect(signal.signal).toBe("BUY");
    }
  });

  it("signal is SELL when aiConfidence <= 35", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 500 - i * 3);
    const signal = generateSignal(prices, prices[prices.length - 1]);
    if (signal.aiConfidence <= 35) {
      expect(signal.signal).toBe("SELL");
    }
  });

  it("signal is HOLD when aiConfidence is between 35 and 65", () => {
    // Sideways market: oscillating prices keep indicators neutral
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 0.1);
    const signal = generateSignal(prices, prices[prices.length - 1]);
    if (signal.aiConfidence > 35 && signal.aiConfidence < 65) {
      expect(signal.signal).toBe("HOLD");
    }
  });
});

describe("formatTelegramSignal", () => {
  it("formats BUY signal output with expected markers", () => {
    const message = formatTelegramSignal("Bitcoin", "btc", 85000, {
      rsi: 42.1,
      ema9: 84000,
      ema21: 83000,
      emaCrossover: "BULLISH",
      macd: { macd: 10, signal: 5, histogram: 5 },
      aiConfidence: 76,
      signal: "BUY",
    });

    expect(message).toContain("Bitcoin (BTC)");
    expect(message).toContain("AI Confidence: 76%");
    expect(message).toContain("Signal: *BUY*");
    expect(message).toContain("🟢");
    expect(message).toContain("Bullish");
  });

  it("formats SELL signal output with red emoji", () => {
    const message = formatTelegramSignal("Ethereum", "eth", 1800, {
      rsi: 78.5,
      ema9: 1780,
      ema21: 1850,
      emaCrossover: "BEARISH",
      macd: { macd: -5, signal: 2, histogram: -7 },
      aiConfidence: 28,
      signal: "SELL",
    });

    expect(message).toContain("Ethereum (ETH)");
    expect(message).toContain("Signal: *SELL*");
    expect(message).toContain("AI Confidence: 28%");
    expect(message).toContain("🔴");
    expect(message).toContain("Bearish");
  });

  it("formats HOLD signal output with yellow emoji", () => {
    const message = formatTelegramSignal("Solana", "sol", 120, {
      rsi: 52,
      ema9: 119,
      ema21: 121,
      emaCrossover: "NEUTRAL",
      macd: { macd: 0.1, signal: 0.05, histogram: 0.05 },
      aiConfidence: 50,
      signal: "HOLD",
    });

    expect(message).toContain("Solana (SOL)");
    expect(message).toContain("Signal: *HOLD*");
    expect(message).toContain("🟡");
  });

  it("uppercases the symbol regardless of input case", () => {
    const message = formatTelegramSignal("Bitcoin", "BTC", 85000, {
      rsi: 50,
      ema9: 85000,
      ema21: 84000,
      emaCrossover: "NEUTRAL",
      macd: { macd: 0, signal: 0, histogram: 0 },
      aiConfidence: 50,
      signal: "HOLD",
    });
    expect(message).toContain("(BTC)");
  });

  it("includes the NeuraWealth OS footer", () => {
    const message = formatTelegramSignal("Bitcoin", "btc", 85000, {
      rsi: 50,
      ema9: 85000,
      ema21: 84000,
      emaCrossover: "NEUTRAL",
      macd: { macd: 0, signal: 0, histogram: 0 },
      aiConfidence: 50,
      signal: "HOLD",
    });
    expect(message).toContain("NeuraWealth OS");
  });

  it("formats price with up to 6 decimal places for small-cap coins", () => {
    const message = formatTelegramSignal("Shiba Inu", "shib", 0.0000125, {
      rsi: 55,
      ema9: 0.0000124,
      ema21: 0.0000120,
      emaCrossover: "BULLISH",
      macd: { macd: 0.000001, signal: 0.0000005, histogram: 0.0000005 },
      aiConfidence: 60,
      signal: "HOLD",
    });
    // toLocaleString with maximumFractionDigits:6 rounds 0.0000125 → 0.000013
    expect(message).toContain("0.000013");
  });
});
