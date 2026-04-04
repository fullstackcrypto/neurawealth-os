/**
 * Technical Analysis Engine
 * Calculates RSI, EMA, MACD, and AI confidence scores
 */

/**
 * Validates any numeric series: must have enough elements and contain only
 * finite numbers. Used internally when the series may legitimately include
 * negative values (e.g. the MACD line).
 */
function validateFiniteArray(
  prices: number[],
  minLength: number,
  fnName: string
): void {
  if (!Array.isArray(prices) || prices.length < minLength) {
    throw new Error(
      `${fnName}: requires at least ${minLength} data points, got ${prices?.length ?? 0}`
    );
  }
  if (prices.some((p) => !isFinite(p))) {
    throw new Error(
      `${fnName}: array contains non-finite values (NaN or Infinity)`
    );
  }
}

/**
 * Validates a raw market price series: must be a finite array AND every
 * price must be strictly positive. Used for OHLCV inputs from the market.
 */
function validatePrices(
  prices: number[],
  minLength: number,
  fnName: string
): void {
  validateFiniteArray(prices, minLength, fnName);
  if (prices.some((p) => p <= 0)) {
    throw new Error(
      `${fnName}: price array contains invalid values (NaN, Infinity, or ≤ 0)`
    );
  }
}

export function calculateEMA(prices: number[], period: number): number[] {
  // EMA may be called on derived series (e.g. MACD line) that can have
  // negative values, so we only check finiteness and length here.
  validateFiniteArray(prices, period, "calculateEMA");
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
  // macdLine can contain negative values (EMA12 < EMA26 in a downtrend)
  const macdLine: number[] = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

export type SignalType = "BUY" | "SELL" | "HOLD";

export interface TechnicalSignal {
  rsi: number;
  ema9: number;
  ema21: number;
  emaCrossover: "BULLISH" | "BEARISH" | "NEUTRAL";
  macd: { macd: number; signal: number; histogram: number };
  aiConfidence: number;
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

  // AI Confidence Score based on indicator confluence
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

  const aiConfidence = Math.max(0, Math.min(100, score));
  let signal: SignalType = "HOLD";
  if (aiConfidence >= 65) signal = "BUY";
  else if (aiConfidence <= 35) signal = "SELL";

  return {
    rsi,
    ema9: ema9Current,
    ema21: ema21Current,
    emaCrossover,
    macd,
    aiConfidence,
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
🤖 AI Confidence: ${techSignal.aiConfidence}%

📈 RSI(14): ${techSignal.rsi.toFixed(1)}
📉 EMA 9/21: ${techSignal.emaCrossover}
📊 MACD: ${techSignal.macd.histogram > 0 ? "Bullish" : "Bearish"}

_Powered by NeuraWealth OS_`;
}
