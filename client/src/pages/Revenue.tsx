/* Revenue Dashboard — MRR tracker, pie chart, subscriber tiers, ARR projection */
import { mrrData, revenueByModule, subscribersByTier } from "@/lib/mockData";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const currentMRR = mrrData[mrrData.length - 1].mrr;
const previousMRR = mrrData[mrrData.length - 2].mrr;
const mrrGrowth = (((currentMRR - previousMRR) / previousMRR) * 100).toFixed(1);
const totalSubscribers = subscribersByTier.reduce((sum, t) => sum + t.count, 0);
const projectedARR = currentMRR * 12;

export default function Revenue() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-[#00ff88]" />
          <h1 className="font-display text-2xl font-bold text-white">
            Revenue Dashboard
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          Track MRR, subscriber growth, and revenue breakdown
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign,
            label: "Current MRR",
            value: `$${currentMRR.toLocaleString()}`,
            sub: `+${mrrGrowth}% MoM`,
            color: "#00ff88",
          },
          {
            icon: Target,
            label: "Projected ARR",
            value: `$${projectedARR.toLocaleString()}`,
            sub: "Based on current MRR",
            color: "#00d4ff",
          },
          {
            icon: Users,
            label: "Total Subscribers",
            value: totalSubscribers.toLocaleString(),
            sub: `${subscribersByTier.length} tiers`,
            color: "#00d4ff",
          },
          {
            icon: TrendingUp,
            label: "Avg Revenue/User",
            value: `$${(currentMRR / totalSubscribers).toFixed(0)}`,
            sub: "ARPU",
            color: "#ffb800",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
            <div className="font-mono text-xl font-bold text-white">
              {stat.value}
            </div>
            <div className="text-gray-400 text-xs">{stat.label}</div>
            <div
              className="text-xs mt-1 font-mono"
              style={{ color: stat.color }}
            >
              {stat.sub}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* MRR Growth Chart — 3/5 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 glass-card rounded-xl p-5"
        >
          <h3 className="font-display font-semibold text-white mb-4">
            MRR Growth
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "MRR",
                ]}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#00ff88"
                fill="url(#mrrGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue by Module Pie — 2/5 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-xl p-5"
        >
          <h3 className="font-display font-semibold text-white mb-4">
            Revenue by Module
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={revenueByModule}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {revenueByModule.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Revenue",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {revenueByModule.map(mod => (
              <div
                key={mod.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: mod.color }}
                  />
                  <span className="text-gray-300">{mod.name}</span>
                </div>
                <span className="font-mono text-white">
                  ${mod.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Subscriber Tiers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="font-display font-semibold text-white mb-4">
            Subscribers by Tier
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={subscribersByTier}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis
                dataKey="tier"
                tick={{ fill: "#666", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                fill="#00d4ff"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="font-display font-semibold text-white mb-4">
            Revenue by Tier
          </h3>
          <div className="space-y-4">
            {subscribersByTier.map(tier => {
              const pct = (tier.revenue / currentMRR) * 100;
              return (
                <div key={tier.tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm">{tier.tier}</span>
                    <span className="font-mono text-white text-sm">
                      ${tier.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00ff88] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs font-mono w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {tier.count} subscribers
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
