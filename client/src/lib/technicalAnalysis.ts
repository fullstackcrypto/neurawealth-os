/**
 * Technical Analysis Engine
 * Calculates RSI, EMA, MACD, and confluence scores
 */

function validatePrices(
  prices: number[],
  minLength: number,
  fnName: string
): void {
  if (!Array.isArray(prices) || prices.length < minLength) {
    throw new Error(
      `${fnName}: requires at least ${minLength} data points, got ${prices?.length ?? 0}`
    );
  }
  if (prices.some(p => !isFinite(p) || p <= 0)) {
    throw new Error(
      `${fnName}: price array contains invalid values (NaN, Infinity, or non-positive)`
    );
  }
}

function validateFiniteArray(
  arr: number[],
  minLength: number,
  fnName: string
): void {
  if (!Array.isArray(arr) || arr.length < minLength) {
    throw new Error(`${fnName}: requires at least ${minLength} data points`);
  }
  if (arr.some(v => !isFinite(v))) {
    throw new Error(`${fnName}: array contains NaN or Infinity`);
  }
}

/**
 * Computes the final EMA value for an array of signed numbers (e.g. MACD line).
 * Unlike calculateEMA, this does not require positive values and returns a
 * scalar rather than the full series.
 */
function computeSignedEMAValue(values: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function calculateEMA(prices: number[], period: number): number[] {
  validatePrices(prices, 1, "calculateEMA");
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  ema[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

export function calculateRSI(prices: number[], period = 14): number {
  validatePrices(prices, period + 1, "calculateRSI");
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
    }
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  validatePrices(prices, 26, "calculateMACD");
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine: number[] = ema12.map((v, i) => v - ema26[i]);
  validateFiniteArray(macdLine, 9, "calculateMACD");
  // Use computeSignedEMAValue for the signal line — MACD values can be
  // negative, so they cannot go through calculateEMA which requires positive prices.
  const signalValue = computeSignedEMAValue(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  return { macd, signal: signalValue, histogram: macd - signalValue };
}

export type SignalType = "BUY" | "SELL" | "HOLD";

export interface TechnicalSignal {
  rsi: number;
  ema9: number;
  ema21: number;
  emaCrossover: "BULLISH" | "BEARISH" | "NEUTRAL";
  macd: { macd: number; signal: number; histogram: number };
  confluenceScore: number;
  signal: SignalType;
}

export function generateSignal(
  prices: number[],
  currentPrice: number
): TechnicalSignal {
  const rsi = calculateRSI(prices);
  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  const ema9Current = ema9[ema9.length - 1];
  const ema21Current = ema21[ema21.length - 1];
  const emaCrossover =
    ema9Current > ema21Current * 1.002
      ? "BULLISH"
      : ema9Current < ema21Current * 0.998
        ? "BEARISH"
        : "NEUTRAL";
  const macd = calculateMACD(prices);

  // Confluence Score based on indicator confluence
  let score = 50;
  // RSI contribution
  if (rsi < 30)
    score += 15; // oversold = buy signal
  else if (rsi > 70)
    score -= 15; // overbought = sell signal
  else if (rsi < 45) score += 8;
  else if (rsi > 55) score -= 8;

  // EMA crossover contribution
  if (emaCrossover === "BULLISH") score += 20;
  else if (emaCrossover === "BEARISH") score -= 20;

  // MACD contribution
  if (macd.histogram > 0) score += 15;
  else if (macd.histogram < 0) score -= 15;

  // Price vs EMA21
  if (currentPrice > ema21Current) score += 5;
  else score -= 5;

  const confluenceScore = Math.max(0, Math.min(100, score));
  let signal: SignalType = "HOLD";
  if (confluenceScore >= 65) signal = "BUY";
  else if (confluenceScore <= 35) signal = "SELL";

  return {
    rsi,
    ema9: ema9Current,
    ema21: ema21Current,
    emaCrossover,
    macd,
    confluenceScore,
    signal,
  };
}

export function formatTelegramSignal(
  coinName: string,
  symbol: string,
  price: number,
  techSignal: TechnicalSignal
): string {
  const emoji =
    techSignal.signal === "BUY"
      ? "🟢"
      : techSignal.signal === "SELL"
        ? "🔴"
        : "🟡";
  return `${emoji} *${coinName} (${symbol.toUpperCase()})* ${emoji}

💰 Price: $${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
📊 Signal: *${techSignal.signal}*
🤖 Confluence Score: ${techSignal.confluenceScore}%

📈 RSI(14): ${techSignal.rsi.toFixed(1)}
📉 EMA 9/21: ${techSignal.emaCrossover}
📊 MACD: ${techSignal.macd.histogram > 0 ? "Bullish" : "Bearish"}

_Powered by NeuraWealth OS_`;
}
