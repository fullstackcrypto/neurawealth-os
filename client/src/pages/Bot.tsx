/* Trading Bot Dashboard — paper trading simulation with real BTC price */
import { useBtcPrice } from "@/hooks/useCoinGecko";
import { tradeHistory, pnlChartData } from "@/lib/mockData";
import { motion } from "framer-motion";
import {
  Bot as BotIcon,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Settings,
  Shield,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

const strategies = [
  {
    id: "momentum",
    name: "Momentum",
    desc: "Follows strong price trends using EMA crossovers",
    winRate: "68%",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    desc: "Buys oversold and sells overbought conditions",
    winRate: "62%",
  },
  {
    id: "breakout",
    name: "Breakout",
    desc: "Enters on price breakouts above resistance levels",
    winRate: "71%",
  },
];

export default function Bot() {
  const { price, change24h } = useBtcPrice();
  const [botActive, setBotActive] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState("momentum");

  const toggleBot = () => {
    setBotActive(!botActive);
    toast.success(botActive ? "Bot paused" : "Bot activated");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BotIcon className="w-5 h-5 text-[#00d4ff]" />
            <h1 className="font-display text-2xl font-bold text-white">
              Trading Bot
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Paper trading simulation with real BTC price from CoinGecko
          </p>
        </div>
        <button
          onClick={toggleBot}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            botActive
              ? "bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00ff88]/90"
              : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          }`}
        >
          {botActive ? (
            <>
              <Pause className="w-4 h-4" /> ACTIVE
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> PAUSED
            </>
          )}
        </button>
      </div>

      {/* Live BTC Price + Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="text-gray-400 text-xs mb-1">BTC Price (Live)</div>
          <div className="font-mono text-xl font-bold text-white">
            ${price.toLocaleString()}
          </div>
          <div
            className={`font-mono text-xs mt-1 ${change24h >= 0 ? "text-[#00ff88]" : "text-red-400"}`}
          >
            {change24h >= 0 ? "+" : ""}
            {change24h.toFixed(2)}% 24h
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="text-gray-400 text-xs mb-1">Total P&L</div>
          <div className="font-mono text-xl font-bold text-[#00ff88]">
            +$1,005
          </div>
          <div className="text-[#00ff88] text-xs font-mono mt-1">+10.05%</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="text-gray-400 text-xs mb-1">Win Rate</div>
          <div className="font-mono text-xl font-bold text-white">75%</div>
          <div className="text-gray-400 text-xs font-mono mt-1">6/8 trades</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="text-gray-400 text-xs mb-1">Total Trades</div>
          <div className="font-mono text-xl font-bold text-white">8</div>
          <div className="text-gray-400 text-xs font-mono mt-1">
            Last 7 days
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* P&L Chart — 2/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">
                Cumulative P&L
              </h3>
              <p className="text-gray-400 text-xs">Paper trading simulation</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#00ff88]" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={pnlChartData}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${value}`, "P&L"]}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#00ff88"
                fill="url(#pnlGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Strategy Selector — 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-[#ffb800]" />
              <h3 className="font-display font-semibold text-white">
                Strategy
              </h3>
            </div>
            <div className="space-y-2">
              {strategies.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStrategy(s.id);
                    toast.info(`Strategy: ${s.name}`);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedStrategy === s.id
                      ? "border-[#00ff88]/30 bg-[#00ff88]/5"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">
                      {s.name}
                    </span>
                    <span className="text-[#00ff88] text-xs font-mono">
                      {s.winRate}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Risk Management */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#00d4ff]" />
              <h3 className="font-display font-semibold text-white text-sm">
                Risk Settings
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Max Position</span>
                <span className="text-white font-mono">$2,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stop Loss</span>
                <span className="text-red-400 font-mono">-5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Take Profit</span>
                <span className="text-[#00ff88] font-mono">+10%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Daily Loss</span>
                <span className="text-red-400 font-mono">-$500</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trade History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-white/5">
          <h3 className="font-display font-semibold text-white">
            Trade History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs font-mono uppercase">
                <th className="text-left py-3 px-4 font-medium">Pair</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-right py-3 px-4 font-medium">Entry</th>
                <th className="text-right py-3 px-4 font-medium">Exit</th>
                <th className="text-right py-3 px-4 font-medium">P&L</th>
                <th className="text-right py-3 px-4 font-medium hidden sm:table-cell">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.map(trade => (
                <tr
                  key={trade.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="py-3 px-4 text-white text-sm font-mono">
                    {trade.pair}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${
                        trade.type === "BUY" ? "text-[#00ff88]" : "text-red-400"
                      }`}
                    >
                      {trade.type === "BUY" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300 text-sm font-mono">
                    ${trade.entry.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300 text-sm font-mono">
                    ${trade.exit.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-right text-sm font-mono font-bold ${trade.pnl >= 0 ? "text-[#00ff88]" : "text-red-400"}`}
                  >
                    {trade.pnl >= 0 ? "+" : ""}
                    {trade.pnl.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 text-xs font-mono hidden sm:table-cell">
                    {trade.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
