/* Dashboard — Quantum Noir: real-time overview with animated counters */
import { useAnimatedCounter, useInView } from "@/hooks/useAnimatedCounter";
import { useCoinGecko } from "@/hooks/useCoinGecko";
import { Activity, Bot, MessageSquare, DollarSign, TrendingUp, Users, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663508251297/DLgAeusBc3GPPZNVGu2d5R/dashboard-bg-nj6u97zo72UK4oyzhJEJ59.webp";

const recentActivity = [
  { time: "2m ago", event: "BUY signal generated for SOL", type: "signal" },
  { time: "5m ago", event: "New Pro subscriber joined", type: "subscriber" },
  { time: "8m ago", event: "Trading bot executed BTC/USDT", type: "trade" },
  { time: "12m ago", event: "Telegram alert sent to 4.8K users", type: "telegram" },
  { time: "15m ago", event: "Mining claim #19 scored 94/100", type: "mining" },
  { time: "22m ago", event: "SELL signal generated for DOT", type: "signal" },
  { time: "30m ago", event: "Revenue milestone: $34.2K MRR", type: "revenue" },
];

const miniChartData = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  signals: Math.floor(80 + Math.random() * 40),
  revenue: Math.floor(800 + Math.random() * 400),
}));

function StatCard({ icon: Icon, label, value, prefix, suffix, color, delay }: {
  icon: typeof Activity; label: string; value: number; prefix?: string; suffix?: string; color: string; delay: number;
}) {
  const { ref, inView } = useInView();
  const count = useAnimatedCounter(inView ? value : 0, 2000);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card rounded-xl p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
      </div>
      <div className="font-mono text-2xl lg:text-3xl font-bold text-white">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { coins } = useCoinGecko(4);

  return (
    <div className="space-y-6">
      {/* Header with background */}
      <div className="relative rounded-xl overflow-hidden p-6 lg:p-8 mb-2">
        <div className="absolute inset-0">
          <img src={DASHBOARD_BG} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
        </div>
        <div className="relative">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Command Center</h1>
          <p className="text-gray-400 text-sm">Real-time overview of all NeuraWealth OS modules</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[#00ff88] text-xs font-mono">ALL SYSTEMS OPERATIONAL</span>
            <span className="text-gray-500 text-xs font-mono ml-2">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Signals Today" value={847} color="#00ff88" delay={0} />
        <StatCard icon={Bot} label="Active Bots" value={12} color="#00d4ff" delay={0.1} />
        <StatCard icon={DollarSign} label="Est. Revenue" value={34200} prefix="$" color="#00ff88" delay={0.2} />
        <StatCard icon={Users} label="Telegram Subs" value={4800} color="#00d4ff" delay={0.3} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Signal Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">Signal Volume</h3>
              <p className="text-gray-400 text-xs">Last 24 hours</p>
            </div>
            <div className="flex items-center gap-1 text-[#00ff88] text-xs font-mono">
              <TrendingUp className="w-3 h-3" /> +12.4%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={miniChartData}>
              <defs>
                <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#666" }}
                itemStyle={{ color: "#00ff88" }}
              />
              <Area type="monotone" dataKey="signals" stroke="#00ff88" fill="url(#signalGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Coins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">Top Markets</h3>
              <p className="text-gray-400 text-xs">Live prices from CoinGecko</p>
            </div>
            <Zap className="w-4 h-4 text-[#ffb800]" />
          </div>
          <div className="space-y-3">
            {coins.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  {coin.image ? (
                    <img src={coin.image} alt={coin.name} className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs font-mono text-gray-400">
                      {coin.symbol.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-white text-sm font-medium">{coin.name}</div>
                    <div className="text-gray-500 text-xs font-mono uppercase">{coin.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono text-sm">
                    ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`font-mono text-xs ${coin.price_change_percentage_24h >= 0 ? "text-[#00ff88]" : "text-red-400"}`}>
                    {coin.price_change_percentage_24h >= 0 ? "+" : ""}
                    {coin.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-5"
      >
        <h3 className="font-display font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className={`w-2 h-2 rounded-full ${
                item.type === "signal" ? "bg-[#00ff88]" :
                item.type === "subscriber" ? "bg-[#00d4ff]" :
                item.type === "trade" ? "bg-[#ffb800]" :
                item.type === "telegram" ? "bg-[#00d4ff]" :
                item.type === "mining" ? "bg-[#ffb800]" :
                "bg-[#00ff88]"
              }`} />
              <span className="text-gray-300 text-sm flex-1">{item.event}</span>
              <span className="text-gray-500 text-xs font-mono">{item.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
