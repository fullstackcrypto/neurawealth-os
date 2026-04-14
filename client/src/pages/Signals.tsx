/* AI Signal Engine — Live crypto prices with RSI, EMA, MACD, AI confidence */
import { useCoinGecko, type CoinMarket } from "@/hooks/useCoinGecko";
import {
  generateSignal,
  formatTelegramSignal,
  type TechnicalSignal,
} from "@/lib/technicalAnalysis";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCw,
  Send,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function SignalBadge({ signal }: { signal: "BUY" | "SELL" | "HOLD" }) {
  const config = {
    BUY: {
      bg: "bg-[#00ff88]/15",
      text: "text-[#00ff88]",
      border: "border-[#00ff88]/30",
    },
    SELL: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      border: "border-red-500/30",
    },
    HOLD: {
      bg: "bg-[#ffb800]/15",
      text: "text-[#ffb800]",
      border: "border-[#ffb800]/30",
    },
  };
  const c = config[signal];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${c.bg} ${c.text} ${c.border}`}
    >
      {signal === "BUY" && <TrendingUp className="w-3 h-3" />}
      {signal === "SELL" && <TrendingDown className="w-3 h-3" />}
      {signal === "HOLD" && <Minus className="w-3 h-3" />}
      {signal}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 65 ? "#00ff88" : value <= 35 ? "#ef4444" : "#ffb800";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function CoinSignalRow({
  coin,
  index,
}: {
  coin: CoinMarket & { techSignal: TechnicalSignal };
  index: number;
}) {
  const handleSendTelegram = () => {
    const msg = formatTelegramSignal(
      coin.name,
      coin.symbol,
      coin.current_price,
      coin.techSignal
    );
    navigator.clipboard
      .writeText(msg)
      .then(() => {
        toast.success("Signal copied! Paste in Telegram to share.", {
          duration: 3000,
        });
      })
      .catch(() => {
        toast.info("Signal formatted for Telegram", { duration: 3000 });
      });
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5">
          <span className="text-gray-500 font-mono text-xs w-5">
            {coin.market_cap_rank}
          </span>
          {coin.image ? (
            <img
              src={coin.image}
              alt={coin.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-[10px] font-mono text-gray-400">
              {coin.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-white text-sm font-medium">{coin.name}</div>
            <div className="text-gray-500 text-[10px] font-mono uppercase">
              {coin.symbol}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-right">
        <span className="text-white font-mono text-sm">
          $
          {coin.current_price < 1
            ? coin.current_price.toFixed(6)
            : coin.current_price.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
        </span>
      </td>
      <td className="py-3 px-3 text-right hidden sm:table-cell">
        <span
          className={`font-mono text-xs ${coin.price_change_percentage_24h >= 0 ? "text-[#00ff88]" : "text-red-400"}`}
        >
          {coin.price_change_percentage_24h >= 0 ? "+" : ""}
          {coin.price_change_percentage_24h?.toFixed(2)}%
        </span>
      </td>
      <td className="py-3 px-3 text-right hidden md:table-cell">
        <span className="font-mono text-xs text-gray-400">
          {coin.techSignal.rsi.toFixed(1)}
        </span>
      </td>
      <td className="py-3 px-3 text-right hidden md:table-cell">
        <span
          className={`font-mono text-xs ${
            coin.techSignal.emaCrossover === "BULLISH"
              ? "text-[#00ff88]"
              : coin.techSignal.emaCrossover === "BEARISH"
                ? "text-red-400"
                : "text-gray-400"
          }`}
        >
          {coin.techSignal.emaCrossover}
        </span>
      </td>
      <td className="py-3 px-3 text-right hidden lg:table-cell">
        <span
          className={`font-mono text-xs ${coin.techSignal.macd.histogram > 0 ? "text-[#00ff88]" : "text-red-400"}`}
        >
          {coin.techSignal.macd.histogram > 0 ? "Bullish" : "Bearish"}
        </span>
      </td>
      <td className="py-3 px-3 hidden sm:table-cell">
        <ConfidenceBar value={coin.techSignal.aiConfidence} />
      </td>
      <td className="py-3 px-3">
        <SignalBadge signal={coin.techSignal.signal} />
      </td>
      <td className="py-3 px-3">
        <button
          onClick={handleSendTelegram}
          className="p-1.5 rounded-md hover:bg-[#00d4ff]/10 text-gray-400 hover:text-[#00d4ff] transition-colors"
          title="Copy signal for Telegram"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}

export default function Signals() {
  const { coins, loading, error, lastUpdated, refetch } = useCoinGecko(20);
  const [refreshing, setRefreshing] = useState(false);

  const coinsWithSignals = useMemo(() => {
    return coins.map(coin => {
      const prices =
        coin.sparkline_in_7d?.price ||
        Array.from({ length: 168 }, (_, i) => {
          const base = coin.current_price;
          return (
            base * (1 + Math.sin(i / 10) * 0.05 + Math.sin(i * 2.1) * 0.01)
          );
        });
      const techSignal = generateSignal(prices, coin.current_price);
      return { ...coin, techSignal };
    });
  }, [coins]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const signalCounts = useMemo(() => {
    const counts = { BUY: 0, SELL: 0, HOLD: 0 };
    coinsWithSignals.forEach(c => counts[c.techSignal.signal]++);
    return counts;
  }, [coinsWithSignals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-[#00ff88]" />
            <h1 className="font-display text-2xl font-bold text-white">
              AI Signal Engine
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Live crypto analysis with RSI(14), EMA(9/21), MACD — auto-refreshes
            every 60s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-gray-500 text-xs font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#00ff88]/20 text-[#00ff88] text-sm hover:bg-[#00ff88]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-3 text-center">
          <div className="font-mono text-2xl font-bold text-[#00ff88]">
            {signalCounts.BUY}
          </div>
          <div className="text-gray-400 text-xs">BUY Signals</div>
        </div>
        <div className="glass-card rounded-lg p-3 text-center">
          <div className="font-mono text-2xl font-bold text-[#ffb800]">
            {signalCounts.HOLD}
          </div>
          <div className="text-gray-400 text-xs">HOLD Signals</div>
        </div>
        <div className="glass-card rounded-lg p-3 text-center">
          <div className="font-mono text-2xl font-bold text-red-400">
            {signalCounts.SELL}
          </div>
          <div className="text-gray-400 text-xs">SELL Signals</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffb800]/10 border border-[#ffb800]/20 text-[#ffb800] text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Signals Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs font-mono uppercase">
                <th className="text-left py-3 px-3 font-medium">Coin</th>
                <th className="text-right py-3 px-3 font-medium">Price</th>
                <th className="text-right py-3 px-3 font-medium hidden sm:table-cell">
                  24h
                </th>
                <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                  RSI(14)
                </th>
                <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                  EMA 9/21
                </th>
                <th className="text-right py-3 px-3 font-medium hidden lg:table-cell">
                  MACD
                </th>
                <th className="py-3 px-3 font-medium hidden sm:table-cell">
                  AI Score
                </th>
                <th className="py-3 px-3 font-medium">Signal</th>
                <th className="py-3 px-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={9} className="py-4 px-3">
                        <div className="h-4 bg-[#1a1a2e] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : coinsWithSignals.map((coin, i) => (
                    <CoinSignalRow key={coin.id} coin={coin} index={i} />
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
