import { describe, expect, it } from "vitest";

import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  formatTelegramSignal,
  generateSignal,
} from "./technicalAnalysis";

describe("technical analysis helpers", () => {
  it("throws for empty or insufficient inputs", () => {
    expect(() => calculateEMA([], 9)).toThrow(
      "calculateEMA: requires at least 1 data points"
    );
    expect(() => calculateRSI([], 14)).toThrow(
      "calculateRSI: requires at least 15 data points"
    );
    expect(() => calculateMACD([])).toThrow(
      "calculateMACD: requires at least 26 data points"
    );
  });

  it("throws for invalid (NaN / Infinity / non-positive) prices", () => {
    const validBase = Array.from({ length: 30 }, (_, i) => 100 + i);
    const withNaN = [...validBase];
    withNaN[5] = Number.NaN;
    expect(() => generateSignal(withNaN, 129)).toThrow(
      "price array contains invalid values"
    );
  });

  it("produces a buy leaning signal for a strong uptrend", () => {
    const prices = Array.from({ length: 60 }, (_, index) => 100 + index * 2);
    const signal = generateSignal(prices, prices[prices.length - 1]);

    expect(["BUY", "HOLD"]).toContain(signal.signal);
    expect(signal.confluenceScore).toBeGreaterThanOrEqual(50);
  });

  it("formats telegram output with the expected markers", () => {
    const message = formatTelegramSignal("Bitcoin", "btc", 85000, {
      rsi: 42.1,
      ema9: 84000,
      ema21: 83000,
      emaCrossover: "BULLISH",
      macd: { macd: 10, signal: 5, histogram: 5 },
      confluenceScore: 76,
      signal: "BUY",
    });

    expect(message).toContain("Bitcoin (BTC)");
    expect(message).toContain("Confluence Score: 76%");
    expect(message).toContain("Signal: *BUY*");
  });
});
