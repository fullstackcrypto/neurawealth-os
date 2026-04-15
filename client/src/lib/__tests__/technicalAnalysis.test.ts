import { describe, expect, it } from "vitest";

import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  generateSignal,
} from "../technicalAnalysis";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Monotonically rising prices — triggers BULLISH crossover, positive MACD */
const rising = Array.from({ length: 60 }, (_, i) => 100 + i * 2);

/** Monotonically falling prices — triggers BEARISH crossover, negative MACD */
const falling = Array.from({ length: 60 }, (_, i) => 300 - i * 2);

/** Flat prices */
const flat = Array.from({ length: 60 }, () => 150);

// ── calculateEMA ──────────────────────────────────────────────────────────────

describe("calculateEMA", () => {
  it("returns an array with the same length as the input", () => {
    const result = calculateEMA(rising, 9);
    expect(result).toHaveLength(rising.length);
  });

  it("first value equals the first price", () => {
    const result = calculateEMA(rising, 9);
    expect(result[0]).toBe(rising[0]);
  });

  it("EMA tracks a rising trend upward", () => {
    const result = calculateEMA(rising, 9);
    expect(result[result.length - 1]).toBeGreaterThan(result[0]);
  });

  it("EMA converges to the price on flat input", () => {
    const result = calculateEMA(flat, 9);
    // All prices are identical, so the EMA should equal that price throughout
    result.forEach(v => expect(v).toBeCloseTo(150, 5));
  });

  it("throws for an empty array", () => {
    expect(() => calculateEMA([], 9)).toThrow(
      "calculateEMA: requires at least 1 data points"
    );
  });

  it("throws when the array contains NaN", () => {
    const withNaN = [...rising];
    withNaN[5] = Number.NaN;
    expect(() => calculateEMA(withNaN, 9)).toThrow("invalid values");
  });

  it("throws when the array contains negative values", () => {
    const withNeg = [...rising];
    withNeg[5] = -1;
    expect(() => calculateEMA(withNeg, 9)).toThrow("invalid values");
  });
});

// ── calculateRSI ──────────────────────────────────────────────────────────────

describe("calculateRSI", () => {
  it("returns a value in [0, 100]", () => {
    const rsi = calculateRSI(rising);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it("returns 100 when every change is a gain", () => {
    // strictly rising series → no losses
    const rsi = calculateRSI(rising);
    expect(rsi).toBe(100);
  });

  it("returns a low RSI for a strongly falling series", () => {
    const rsi = calculateRSI(falling);
    expect(rsi).toBeLessThan(50);
  });

  it("returns a high RSI for a strongly rising series", () => {
    const rsi = calculateRSI(rising);
    expect(rsi).toBeGreaterThan(50);
  });

  it("returns ~50 for a mixed (zigzag) series", () => {
    const mixed = Array.from({ length: 30 }, (_, i) =>
      i % 2 === 0 ? 100 : 102
    );
    const rsi = calculateRSI(mixed);
    expect(rsi).toBeGreaterThan(40);
    expect(rsi).toBeLessThan(60);
  });

  it("throws when the array is too short (< period + 1)", () => {
    expect(() => calculateRSI([100, 101, 102], 14)).toThrow(
      "calculateRSI: requires at least 15 data points"
    );
  });

  it("throws when the array contains NaN", () => {
    const withNaN = [...rising];
    withNaN[0] = Number.NaN;
    expect(() => calculateRSI(withNaN)).toThrow("invalid values");
  });

  it("throws when the array contains zero (non-positive)", () => {
    const withZero = [...rising];
    withZero[3] = 0;
    expect(() => calculateRSI(withZero)).toThrow("invalid values");
  });
});

// ── calculateMACD ─────────────────────────────────────────────────────────────

describe("calculateMACD", () => {
  it("returns an object with macd, signal, and histogram keys", () => {
    const result = calculateMACD(rising);
    expect(result).toHaveProperty("macd");
    expect(result).toHaveProperty("signal");
    expect(result).toHaveProperty("histogram");
  });

  it("histogram equals macd minus signal", () => {
    const result = calculateMACD(rising);
    expect(result.histogram).toBeCloseTo(result.macd - result.signal, 10);
  });

  it("returns a positive histogram for a rising series", () => {
    const result = calculateMACD(rising);
    expect(result.histogram).toBeGreaterThan(0);
  });

  it("returns a negative histogram for a falling series", () => {
    const result = calculateMACD(falling);
    expect(result.histogram).toBeLessThan(0);
  });

  it("throws when the array has fewer than 26 values", () => {
    expect(() => calculateMACD(Array.from({ length: 20 }, () => 100))).toThrow(
      "calculateMACD: requires at least 26 data points"
    );
  });

  it("throws when the array contains invalid values", () => {
    const withNaN = [...rising];
    withNaN[10] = Number.NaN;
    expect(() => calculateMACD(withNaN)).toThrow("invalid values");
  });
});

// ── generateSignal ────────────────────────────────────────────────────────────

describe("generateSignal", () => {
  it("returns an object with all required fields", () => {
    const sig = generateSignal(rising, rising[rising.length - 1]);
    expect(sig).toHaveProperty("rsi");
    expect(sig).toHaveProperty("ema9");
    expect(sig).toHaveProperty("ema21");
    expect(sig).toHaveProperty("emaCrossover");
    expect(sig).toHaveProperty("macd");
    expect(sig).toHaveProperty("confluenceScore");
    expect(sig).toHaveProperty("signal");
  });

  it("confluenceScore is clamped to [0, 100]", () => {
    const sig = generateSignal(rising, rising[rising.length - 1]);
    expect(sig.confluenceScore).toBeGreaterThanOrEqual(0);
    expect(sig.confluenceScore).toBeLessThanOrEqual(100);
  });

  it("signal is one of BUY, SELL, or HOLD", () => {
    const sig = generateSignal(rising, rising[rising.length - 1]);
    expect(["BUY", "SELL", "HOLD"]).toContain(sig.signal);
  });

  it("does not return SELL for a strong uptrend", () => {
    const sig = generateSignal(rising, rising[rising.length - 1]);
    expect(sig.signal).not.toBe("SELL");
  });

  it("does not return BUY for a strong downtrend", () => {
    const sig = generateSignal(falling, falling[falling.length - 1]);
    expect(sig.signal).not.toBe("BUY");
  });

  it("returns BULLISH emaCrossover for a strong uptrend", () => {
    const sig = generateSignal(rising, rising[rising.length - 1]);
    expect(sig.emaCrossover).toBe("BULLISH");
  });
});
