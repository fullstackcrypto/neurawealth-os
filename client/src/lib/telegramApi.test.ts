import { describe, expect, it } from "vitest";

import {
  BOT_COMMANDS,
  formatDailyReport,
  formatSignalMessage,
} from "./telegramApi";

describe("formatSignalMessage", () => {
  it("includes coin name and uppercased symbol", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.1, "BULLISH", "Bullish");
    expect(msg).toContain("Bitcoin (BTC)");
  });

  it("uses green emoji for BUY signal", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.1, "BULLISH", "Bullish");
    expect(msg).toContain("🟢");
    expect(msg).not.toContain("🔴");
    expect(msg).not.toContain("🟡");
  });

  it("uses red emoji for SELL signal", () => {
    const msg = formatSignalMessage("Ethereum", "eth", 1800, "SELL", 22, 78.5, "BEARISH", "Bearish");
    expect(msg).toContain("🔴");
    expect(msg).not.toContain("🟢");
  });

  it("uses yellow emoji for HOLD signal", () => {
    const msg = formatSignalMessage("Solana", "sol", 120, "HOLD", 50, 52, "NEUTRAL", "Neutral");
    expect(msg).toContain("🟡");
    expect(msg).not.toContain("🟢");
    expect(msg).not.toContain("🔴");
  });

  it("includes all key fields in the output", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.1, "BULLISH", "Bullish");
    expect(msg).toContain("Signal: *BUY*");
    expect(msg).toContain("AI Confidence: 78%");
    expect(msg).toContain("RSI(14): 42.1");
    expect(msg).toContain("EMA 9/21: BULLISH");
    expect(msg).toContain("MACD: Bullish");
  });

  it("includes the NeuraWealth OS footer", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.1, "BULLISH", "Bullish");
    expect(msg).toContain("NeuraWealth OS");
  });

  it("formats high price with commas", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.1, "BULLISH", "Bullish");
    expect(msg).toContain("85,000");
  });

  it("formats price with up to 6 decimal places for small prices", () => {
    const msg = formatSignalMessage("Shiba Inu", "shib", 0.0000125, "HOLD", 50, 52, "NEUTRAL", "Neutral");
    // toLocaleString with maximumFractionDigits:6 rounds 0.0000125 → 0.000013
    expect(msg).toContain("0.000013");
  });

  it("RSI is formatted to one decimal place", () => {
    const msg = formatSignalMessage("Bitcoin", "btc", 85000, "BUY", 78, 42.0, "BULLISH", "Bullish");
    expect(msg).toContain("42.0");
  });
});

describe("formatDailyReport", () => {
  const topMover = { name: "Solana", change: 8.5 };
  const biggestDrop = { name: "Polkadot", change: -5.2 };

  it("includes report header", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("Daily Market Report");
  });

  it("includes signal counts", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("BUY Signals: 5");
    expect(report).toContain("HOLD Signals: 10");
    expect(report).toContain("SELL Signals: 3");
  });

  it("includes top mover and biggest drop names", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("Solana");
    expect(report).toContain("Polkadot");
  });

  it("includes total signals count", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("18");
  });

  it("includes the NeuraWealth OS footer", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("NeuraWealth OS");
  });

  it("formats the top mover percentage with one decimal", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("+8.5%");
  });

  it("formats the biggest drop percentage with one decimal", () => {
    const report = formatDailyReport(5, 10, 3, topMover, biggestDrop, 18);
    expect(report).toContain("-5.2%");
  });

  it("handles zero counts", () => {
    const report = formatDailyReport(0, 0, 0, topMover, biggestDrop, 0);
    expect(report).toContain("BUY Signals: 0");
    expect(report).toContain("HOLD Signals: 0");
    expect(report).toContain("SELL Signals: 0");
  });
});

describe("BOT_COMMANDS", () => {
  it("defines at least four commands", () => {
    expect(BOT_COMMANDS.length).toBeGreaterThanOrEqual(4);
  });

  it("each command has a command string, description, and handler", () => {
    for (const cmd of BOT_COMMANDS) {
      expect(typeof cmd.command).toBe("string");
      expect(cmd.command.startsWith("/")).toBe(true);
      expect(typeof cmd.description).toBe("string");
      expect(typeof cmd.handler).toBe("function");
    }
  });

  it("/start handler returns a welcome message", () => {
    const startCmd = BOT_COMMANDS.find(c => c.command === "/start");
    expect(startCmd).toBeDefined();
    const response = startCmd!.handler([]);
    expect(response).toContain("NeuraWealth OS");
    expect(response.length).toBeGreaterThan(20);
  });

  it("/price handler without args defaults to BTC", () => {
    const priceCmd = BOT_COMMANDS.find(c => c.command === "/price");
    expect(priceCmd).toBeDefined();
    const response = priceCmd!.handler([]);
    expect(response).toContain("BTC");
  });

  it("/price handler uses provided coin symbol", () => {
    const priceCmd = BOT_COMMANDS.find(c => c.command === "/price");
    expect(priceCmd).toBeDefined();
    const response = priceCmd!.handler(["eth"]);
    expect(response).toContain("ETH");
  });

  it("/alert handler includes coin and price in response", () => {
    const alertCmd = BOT_COMMANDS.find(c => c.command === "/alert");
    expect(alertCmd).toBeDefined();
    const response = alertCmd!.handler(["BTC", "100000"]);
    expect(response).toContain("BTC");
    expect(response).toContain("100000");
  });

  it("/alert handler without args defaults to BTC at $0", () => {
    const alertCmd = BOT_COMMANDS.find(c => c.command === "/alert");
    expect(alertCmd).toBeDefined();
    const response = alertCmd!.handler([]);
    expect(response).toContain("BTC");
    expect(response).toContain("$0");
  });

  it("/signals handler returns a non-empty string", () => {
    const signalsCmd = BOT_COMMANDS.find(c => c.command === "/signals");
    expect(signalsCmd).toBeDefined();
    const response = signalsCmd!.handler([]);
    expect(response.length).toBeGreaterThan(0);
  });

  it("/report handler returns a non-empty string", () => {
    const reportCmd = BOT_COMMANDS.find(c => c.command === "/report");
    expect(reportCmd).toBeDefined();
    const response = reportCmd!.handler([]);
    expect(response.length).toBeGreaterThan(0);
  });
});
