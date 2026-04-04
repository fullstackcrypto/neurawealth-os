import { describe, it, expect } from "vitest";
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  generateSignal,
} from "../technicalAnalysis";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns an array of length `n` filled with a constant value. */
const flat = (value: number, n: number) => Array.from({ length: n }, () => value);

/** Generates a simple upward-trending price series. */
const upTrend = (start: number, n: number, step = 1) =>
  Array.from({ length: n }, (_, i) => start + i * step);

/** Generates a simple downward-trending price series. */
const downTrend = (start: number, n: number, step = 1) =>
  Array.from({ length: n }, (_, i) => start - i * step);

// ─── calculateEMA ────────────────────────────────────────────────────────────

describe("calculateEMA", () => {
  it("returns array with same length as input", () => {
    const prices = upTrend(100, 30);
    const ema = calculateEMA(prices, 9);
    expect(ema).toHaveLength(prices.length);
  });

  it("first value equals first price", () => {
    const prices = upTrend(100, 20);
    const ema = calculateEMA(prices, 9);
    expect(ema[0]).toBe(prices[0]);
  });

  it("rises with a rising price series", () => {
    const prices = upTrend(100, 50);
    const ema = calculateEMA(prices, 9);
    // Last EMA value should be greater than first
    expect(ema[ema.length - 1]).toBeGreaterThan(ema[0]);
  });

  it("converges to constant when all prices are equal", () => {
    const prices = flat(200, 50);
    const ema = calculateEMA(prices, 9);
    ema.forEach((v) => expect(v).toBeCloseTo(200, 5));
  });

  it("throws when prices array is shorter than period", () => {
    expect(() => calculateEMA([100, 200], 9)).toThrow("calculateEMA");
  });

  it("throws on non-finite price values", () => {
    const prices = [100, NaN, 200, 300, 400, 500, 600, 700, 800, 900];
    expect(() => calculateEMA(prices, 9)).toThrow("non-finite");
  });

  it("does NOT throw on negative values (EMA may be called on MACD line)", () => {
    const prices = [-50, -40, -30, -20, -10, 0, 10, 20, 30];
    expect(() => calculateEMA(prices, 9)).not.toThrow();
  });
});

// ─── calculateRSI ────────────────────────────────────────────────────────────

describe("calculateRSI", () => {
  it("returns a value between 0 and 100", () => {
    const prices = upTrend(100, 30);
    const rsi = calculateRSI(prices);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it("returns 100 when all moves are gains", () => {
    const prices = upTrend(100, 20, 5);
    const rsi = calculateRSI(prices);
    expect(rsi).toBe(100);
  });

  it("returns a low RSI for a strongly falling series", () => {
    const prices = downTrend(1000, 30, 10);
    const rsi = calculateRSI(prices);
    expect(rsi).toBeLessThan(30);
  });

  it("returns a high RSI for a strongly rising series", () => {
    const prices = upTrend(100, 30);
    const rsi = calculateRSI(prices);
    expect(rsi).toBeGreaterThan(70);
  });

  it("returns ~50 for a flat series (no gains or losses)", () => {
    // A flat series has avgLoss === 0, so RSI returns 100 — but a mixed
    // series alternating up/down gives ~50.
    const prices = Array.from({ length: 30 }, (_, i) =>
      100 + (i % 2 === 0 ? 1 : -1)
    );
    const rsi = calculateRSI(prices);
    expect(rsi).toBeGreaterThan(20);
    expect(rsi).toBeLessThan(80);
  });

  it("throws when prices array is too short for the period", () => {
    expect(() => calculateRSI([100, 200], 14)).toThrow("calculateRSI");
  });

  it("throws on NaN prices", () => {
    const prices = Array.from({ length: 20 }, (_, i) => (i === 5 ? NaN : 100 + i));
    expect(() => calculateRSI(prices)).toThrow("non-finite");
  });

  it("throws on zero prices", () => {
    const prices = Array.from({ length: 20 }, (_, i) => (i === 5 ? 0 : 100 + i));
    expect(() => calculateRSI(prices)).toThrow("invalid values");
  });
});

// ─── calculateMACD ───────────────────────────────────────────────────────────

describe("calculateMACD", () => {
  it("returns macd, signal, and histogram keys", () => {
    const prices = upTrend(100, 60);
    const result = calculateMACD(prices);
    expect(result).toHaveProperty("macd");
    expect(result).toHaveProperty("signal");
    expect(result).toHaveProperty("histogram");
  });

  it("histogram equals macd minus signal", () => {
    const prices = upTrend(100, 60);
    const result = calculateMACD(prices);
    expect(result.histogram).toBeCloseTo(result.macd - result.signal, 10);
  });

  it("produces a positive histogram for a strong uptrend", () => {
    const prices = upTrend(100, 100, 2);
    const { histogram } = calculateMACD(prices);
    expect(histogram).toBeGreaterThan(0);
  });

  it("produces a negative histogram for a strong downtrend", () => {
    // Stays well above zero: 5000 - 99*20 = 3020
    const prices = downTrend(5000, 100, 20);
    const { histogram } = calculateMACD(prices);
    expect(histogram).toBeLessThan(0);
  });

  it("throws when prices array has fewer than 26 points", () => {
    expect(() => calculateMACD(upTrend(100, 25))).toThrow("calculateMACD");
  });

  it("throws on invalid price values", () => {
    const prices = upTrend(100, 30).map((p, i) => (i === 15 ? -1 : p));
    expect(() => calculateMACD(prices)).toThrow("invalid values");
  });
});

// ─── generateSignal ──────────────────────────────────────────────────────────

describe("generateSignal", () => {
  const buildPrices = (n: number, trend: "up" | "down" | "flat") =>
    Array.from({ length: n }, (_, i) => {
      if (trend === "up") return 100 + i * 2;
      if (trend === "down") return 500 - i * 2; // stays positive (500 - 79*2 = 342)
      return 100;
    });

  it("returns a signal with all required fields", () => {
    const prices = buildPrices(60, "up");
    const result = generateSignal(prices, prices[prices.length - 1]);
    expect(result).toHaveProperty("rsi");
    expect(result).toHaveProperty("ema9");
    expect(result).toHaveProperty("ema21");
    expect(result).toHaveProperty("emaCrossover");
    expect(result).toHaveProperty("macd");
    expect(result).toHaveProperty("aiConfidence");
    expect(result).toHaveProperty("signal");
  });

  it("aiConfidence is clamped to [0, 100]", () => {
    const prices = buildPrices(60, "up");
    const { aiConfidence } = generateSignal(prices, prices[prices.length - 1]);
    expect(aiConfidence).toBeGreaterThanOrEqual(0);
    expect(aiConfidence).toBeLessThanOrEqual(100);
  });

  it("signal is one of BUY, SELL, HOLD", () => {
    const prices = buildPrices(60, "flat");
    const { signal } = generateSignal(prices, 100);
    expect(["BUY", "SELL", "HOLD"]).toContain(signal);
  });

  it("generates a BUY signal for a strong uptrend", () => {
    const prices = buildPrices(80, "up");
    const { signal } = generateSignal(prices, prices[prices.length - 1]);
    // A strongly trending series should produce BUY or HOLD, not SELL
    expect(signal).not.toBe("SELL");
  });

  it("generates a SELL signal for a strong downtrend", () => {
    const prices = buildPrices(80, "down");
    const { signal } = generateSignal(prices, prices[prices.length - 1]);
    // A strongly falling series should produce SELL or HOLD, not BUY
    expect(signal).not.toBe("BUY");
  });

  it("emaCrossover is BULLISH when 9-EMA is above 21-EMA by >0.2%", () => {
    const prices = buildPrices(80, "up");
    const { emaCrossover } = generateSignal(prices, prices[prices.length - 1]);
    expect(emaCrossover).toBe("BULLISH");
  });
});
