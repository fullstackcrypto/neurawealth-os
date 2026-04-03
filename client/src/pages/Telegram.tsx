/* Telegram Intelligence Hub — sentiment, growth, bot commands, setup */
import { telegramGrowthData, trendingTopics } from "@/lib/mockData";
import { motion } from "framer-motion";
import {
  MessageSquare, TrendingUp, Users, DollarSign, Terminal,
  Copy, ExternalLink, BookOpen, Zap
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { toast } from "sonner";

const TELEGRAM_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663508251297/DLgAeusBc3GPPZNVGu2d5R/telegram-bot-o7kKjwjASCQKXZ7QPui2oE.webp";

const botCommands = [
  { cmd: "/start", desc: "Initialize the bot and get welcome message" },
  { cmd: "/signals", desc: "Get latest AI signals for top coins" },
  { cmd: "/price [coin]", desc: "Get current price for a specific coin (e.g., /price btc)" },
  { cmd: "/alert [coin] [price]", desc: "Set price alert (e.g., /alert btc 90000)" },
  { cmd: "/portfolio", desc: "View your tracked portfolio performance" },
  { cmd: "/report", desc: "Get daily market summary report" },
];

const sentimentData = [
  { label: "Bullish", value: 62, color: "#00ff88" },
  { label: "Neutral", value: 24, color: "#ffb800" },
  { label: "Bearish", value: 14, color: "#ef4444" },
];

const demoMessages = [
  {
    type: "bot" as const,
    text: `🟢 *Bitcoin (BTC)* 🟢\n\n💰 Price: $84,521\n📊 Signal: *BUY*\n🤖 AI Confidence: 78%\n\n📈 RSI(14): 42.3\n📉 EMA 9/21: BULLISH\n📊 MACD: Bullish\n\n_Powered by NeuraWealth OS_`,
  },
  {
    type: "bot" as const,
    text: `📊 *Daily Market Report*\n\n🟢 BUY Signals: 8\n🟡 HOLD Signals: 7\n🔴 SELL Signals: 5\n\nTop Mover: SOL (+5.1%)\nBiggest Drop: DOT (-2.1%)\n\nTotal signals processed: 847`,
  },
];

export default function Telegram() {
  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success(`Copied: ${cmd}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-[#00d4ff]" />
        <h1 className="font-display text-2xl font-bold text-white">Telegram Intelligence Hub</h1>
      </div>
      <p className="text-gray-400 text-sm -mt-4">Automated signal delivery, sentiment analysis, and subscriber management</p>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Subscribers", value: "4,800", color: "#00d4ff" },
          { icon: MessageSquare, label: "Messages/Day", value: "12.4K", color: "#00ff88" },
          { icon: DollarSign, label: "Revenue/Mo", value: "$5,800", color: "#00ff88" },
          { icon: TrendingUp, label: "Growth Rate", value: "+41%", color: "#00d4ff" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
            <div className="font-mono text-xl font-bold text-white">{stat.value}</div>
            <div className="text-gray-400 text-xs">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column — 3/5 */}
        <div className="lg:col-span-3 space-y-6">
          {/* Subscriber Growth Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold text-white mb-4">Subscriber Growth</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={telegramGrowthData}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="subscribers" stroke="#00d4ff" fill="url(#subGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Trending Topics */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold text-white mb-4">Trending Topics</h3>
            <div className="space-y-3">
              {trendingTopics.map((topic, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      topic.sentiment === "bullish" ? "bg-[#00ff88]" :
                      topic.sentiment === "bearish" ? "bg-red-400" : "bg-[#ffb800]"
                    }`} />
                    <span className="text-white text-sm">{topic.topic}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono capitalize ${
                      topic.sentiment === "bullish" ? "text-[#00ff88]" :
                      topic.sentiment === "bearish" ? "text-red-400" : "text-[#ffb800]"
                    }`}>{topic.sentiment}</span>
                    <span className="text-gray-500 text-xs font-mono">{(topic.mentions / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sentiment Analysis */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold text-white mb-4">Market Sentiment</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={sentimentData} layout="vertical">
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#999", fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {sentimentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center">
                <div className="font-mono text-4xl font-bold text-[#00ff88]">62%</div>
                <div className="text-gray-400 text-xs">Overall Bullish</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column — 2/5 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demo Messages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#00d4ff]" />
              <h3 className="font-display font-semibold text-white">Signal Preview</h3>
            </div>
            <div className="space-y-3">
              {demoMessages.map((msg, i) => (
                <div key={i} className="bg-[#0a0a0f] rounded-lg p-3 border border-white/5">
                  <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">{msg.text}</pre>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bot Commands */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-[#00ff88]" />
              <h3 className="font-display font-semibold text-white">Bot Commands</h3>
            </div>
            <div className="space-y-2">
              {botCommands.map((cmd) => (
                <div key={cmd.cmd} className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
                  <button onClick={() => copyCommand(cmd.cmd)} className="flex items-center gap-1 shrink-0">
                    <code className="text-[#00ff88] text-xs font-mono bg-[#00ff88]/10 px-1.5 py-0.5 rounded">{cmd.cmd}</code>
                    <Copy className="w-3 h-3 text-gray-500 hover:text-white" />
                  </button>
                  <span className="text-gray-400 text-xs">{cmd.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Setup Guide */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#ffb800]" />
              <h3 className="font-display font-semibold text-white">Setup Guide</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="text-[#00ff88] font-mono text-xs shrink-0">01</span>
                <p>Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">@BotFather</a> on Telegram</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#00ff88] font-mono text-xs shrink-0">02</span>
                <p>Copy your bot token from BotFather's response</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#00ff88] font-mono text-xs shrink-0">03</span>
                <p>Set webhook URL to: <code className="text-[#00d4ff] text-xs bg-[#00d4ff]/10 px-1 rounded">your-domain.com/api/telegram/webhook</code></p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#00ff88] font-mono text-xs shrink-0">04</span>
                <p>Configure signal preferences in your dashboard settings</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#00ff88] font-mono text-xs shrink-0">05</span>
                <p>Start receiving AI-powered signals directly in Telegram</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-[#ffb800]/5 border border-[#ffb800]/20">
              <p className="text-[#ffb800] text-xs">
                <strong>Pro Tip:</strong> Use /alert to set price notifications. The bot will message you when your target price is hit.
              </p>
            </div>
          </motion.div>

          {/* Hero Image */}
          <div className="rounded-xl overflow-hidden border border-white/5">
            <img src={TELEGRAM_IMG} alt="Telegram Bot" className="w-full h-48 object-cover opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}
