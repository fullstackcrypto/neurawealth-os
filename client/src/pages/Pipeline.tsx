/* Automation Pipeline — Visual animated node graph showing data flow */
import { motion } from "framer-motion";
import { GitBranch, Database, Cpu, Zap, MessageSquare, DollarSign, Mountain, ShoppingBag, Clock } from "lucide-react";

interface PipelineNode {
  id: string;
  label: string;
  icon: typeof GitBranch;
  color: string;
  lastProcessed: string;
  status: "active" | "idle";
}

const PIPELINE_1: PipelineNode[] = [
  { id: "coingecko", label: "CoinGecko API", icon: Database, color: "#00d4ff", lastProcessed: "2s ago", status: "active" },
  { id: "ta-engine", label: "Technical Analysis Engine", icon: Cpu, color: "#00ff88", lastProcessed: "5s ago", status: "active" },
  { id: "ai-scoring", label: "AI Scoring", icon: Zap, color: "#00ff88", lastProcessed: "8s ago", status: "active" },
  { id: "signal-gen", label: "Signal Generation", icon: Zap, color: "#ffb800", lastProcessed: "10s ago", status: "active" },
  { id: "telegram-bot", label: "Telegram Bot", icon: MessageSquare, color: "#00d4ff", lastProcessed: "12s ago", status: "active" },
  { id: "revenue-1", label: "Revenue", icon: DollarSign, color: "#00ff88", lastProcessed: "15s ago", status: "active" },
];

const PIPELINE_2: PipelineNode[] = [
  { id: "gov-data", label: "Government Data", icon: Database, color: "#00d4ff", lastProcessed: "1m ago", status: "active" },
  { id: "claim-scorer", label: "AI Claim Scorer", icon: Cpu, color: "#ffb800", lastProcessed: "2m ago", status: "active" },
  { id: "lead-db", label: "Lead Database", icon: Database, color: "#00d4ff", lastProcessed: "3m ago", status: "active" },
  { id: "marketplace", label: "Gated Marketplace", icon: ShoppingBag, color: "#a855f7", lastProcessed: "5m ago", status: "idle" },
  { id: "revenue-2", label: "Revenue", icon: DollarSign, color: "#00ff88", lastProcessed: "5m ago", status: "idle" },
];

function PipelineNodeCard({ node, index, total }: { node: PipelineNode; index: number; total: number }) {
  return (
    <div className="flex items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.15, duration: 0.4 }}
        className="relative"
      >
        <div className={`glass-card rounded-xl p-4 w-36 sm:w-44 ${node.status === "active" ? "animate-pulse-glow" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${node.color}15` }}>
              <node.icon className="w-4 h-4" style={{ color: node.color }} />
            </div>
            <div className={`w-2 h-2 rounded-full ${node.status === "active" ? "animate-pulse" : ""}`} style={{ backgroundColor: node.color }} />
          </div>
          <div className="text-white text-xs font-medium mb-1 leading-tight">{node.label}</div>
          <div className="flex items-center gap-1 text-gray-500 text-[10px] font-mono">
            <Clock className="w-2.5 h-2.5" />
            {node.lastProcessed}
          </div>
        </div>
      </motion.div>
      {index < total - 1 && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: index * 0.15 + 0.1, duration: 0.3 }}
          className="flex items-center mx-1 sm:mx-2"
        >
          <div className="w-6 sm:w-10 h-0.5 bg-gradient-to-r from-[#00ff88]/50 to-[#00d4ff]/50 relative">
            <motion.div
              className="absolute top-0 left-0 h-full w-3 bg-[#00ff88] rounded-full"
              animate={{ x: [0, 24, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index * 0.3 }}
            />
          </div>
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[#00d4ff]/50" />
        </motion.div>
      )}
    </div>
  );
}

function PipelineStats() {
  const stats = [
    { label: "Signals/Day", value: "2.4M", color: "#00ff88" },
    { label: "Avg Latency", value: "180ms", color: "#00d4ff" },
    { label: "Uptime", value: "99.97%", color: "#00ff88" },
    { label: "Data Sources", value: "12", color: "#ffb800" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="glass-card rounded-xl p-4 text-center"
        >
          <div className="font-mono text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Pipeline() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-5 h-5 text-[#00d4ff]" />
          <h1 className="font-display text-2xl font-bold text-white">Automation Pipeline</h1>
        </div>
        <p className="text-gray-400 text-sm">Visual data flow from market data ingestion to revenue generation</p>
      </div>

      <PipelineStats />

      {/* Pipeline 1: Crypto Signals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse" />
          <h3 className="font-display font-semibold text-white">Crypto Signal Pipeline</h3>
          <span className="text-[#00ff88] text-xs font-mono ml-auto">ACTIVE</span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-max">
            {PIPELINE_1.map((node, i) => (
              <PipelineNodeCard key={node.id} node={node} index={i} total={PIPELINE_1.length} />
            ))}
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/10">
          <p className="text-gray-400 text-xs">
            <span className="text-[#00ff88] font-mono">Flow:</span> Market data from CoinGecko API feeds into the Technical Analysis Engine (RSI, EMA, MACD calculations),
            then AI Scoring assigns confidence levels, Signal Generation creates BUY/SELL/HOLD recommendations,
            which are delivered via Telegram Bot to 4,800+ subscribers, generating subscription revenue.
          </p>
        </div>
      </motion.div>

      {/* Pipeline 2: Mining Claims */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#ffb800] animate-pulse" />
          <h3 className="font-display font-semibold text-white">Mining Intelligence Pipeline</h3>
          <span className="text-[#ffb800] text-xs font-mono ml-auto">PROCESSING</span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-max">
            {PIPELINE_2.map((node, i) => (
              <PipelineNodeCard key={node.id} node={node} index={i} total={PIPELINE_2.length} />
            ))}
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[#ffb800]/5 border border-[#ffb800]/10">
          <p className="text-gray-400 text-xs">
            <span className="text-[#ffb800] font-mono">Flow:</span> Government geological data is processed by the AI Claim Scorer,
            which evaluates mineral probability, terrain analysis, and historical yield data.
            Scored leads are stored in the Lead Database and made available through the Gated Marketplace
            for Pro and Enterprise subscribers.
          </p>
        </div>
      </motion.div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-display font-semibold text-white mb-4">System Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "CoinGecko API", status: "Healthy", latency: "120ms" },
            { name: "TA Engine", status: "Healthy", latency: "45ms" },
            { name: "AI Scorer", status: "Healthy", latency: "180ms" },
            { name: "Signal Generator", status: "Healthy", latency: "12ms" },
            { name: "Telegram Delivery", status: "Healthy", latency: "250ms" },
            { name: "Database", status: "Healthy", latency: "8ms" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
                <span className="text-gray-300 text-sm">{service.name}</span>
              </div>
              <span className="text-gray-500 text-xs font-mono">{service.latency}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
