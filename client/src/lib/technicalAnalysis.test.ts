import { describe, expect, it } from "vitest";

import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  formatTelegramSignal,
  generateSignal,
} from "./technicalAnalysis";

describe("technical analysis helpers", () => {
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

  it("produces a buy leaning signal for a strong uptrend", () => {
    const prices = Array.from({ length: 60 }, (_, index) => 100 + index * 2);
    const signal = generateSignal(prices, prices[prices.length - 1]);

    expect(["BUY", "HOLD"]).toContain(signal.signal);
    expect(signal.aiConfidence).toBeGreaterThanOrEqual(50);
  });

  it("formats telegram output with the expected markers", () => {
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
  });
});
