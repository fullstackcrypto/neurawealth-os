/* Home / Landing Page — Quantum Noir Dashboard design */
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAnimatedCounter, useInView } from "@/hooks/useAnimatedCounter";
import {
  Activity, Bot, MessageSquare, Mountain, ShoppingBag,
  DollarSign, GitBranch, ArrowRight, Check, Zap, Shield, Globe
} from "lucide-react";
import { useState, useEffect } from "react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663508251297/DLgAeusBc3GPPZNVGu2d5R/hero-bg-D7VHxUxdY5WJv7ev7qgTeY.webp";
const AI_BRAIN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663508251297/DLgAeusBc3GPPZNVGu2d5R/ai-brain-S7XDHbidS347x7dkqHZ5wB.webp";

function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(text.slice(0, idx + 1));
        setIdx(idx + 1);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [idx, text]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-blink text-[#00ff88]">|</span>
    </span>
  );
}

function StatCounter({ value, label, prefix = "" }: { value: number; label: string; prefix?: string }) {
  const { ref, inView } = useInView();
  const count = useAnimatedCounter(inView ? value : 0, 2000);
  return (
    <div ref={ref} className="text-center">
      <div className="font-mono text-3xl lg:text-4xl font-bold text-white">
        {prefix}{count.toLocaleString()}
      </div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  );
}

const FEATURES = [
  { icon: Activity, title: "AI Signal Engine", desc: "Real-time BUY/SELL/HOLD signals with RSI, EMA, MACD analysis and AI confidence scoring.", path: "/signals", color: "#00ff88" },
  { icon: MessageSquare, title: "Telegram Intelligence", desc: "Automated signal delivery, sentiment analysis, and subscriber management via Telegram bot.", path: "/telegram", color: "#00d4ff" },
  { icon: Bot, title: "Trading Bot", desc: "Paper trading simulation with momentum, mean reversion, and breakout strategies.", path: "/bot", color: "#00ff88" },
  { icon: Mountain, title: "Mining Claim Intel", desc: "AI-powered scoring system for mining and land claims with geological analysis.", path: "/mining", color: "#ffb800" },
  { icon: ShoppingBag, title: "AI Marketplace", desc: "Suite of AI-powered APIs and services for crypto analysis and automation.", path: "/marketplace", color: "#00d4ff" },
  { icon: DollarSign, title: "Revenue Dashboard", desc: "Track MRR, subscriber growth, and revenue breakdown across all modules.", path: "/revenue", color: "#00ff88" },
  { icon: GitBranch, title: "Automation Pipeline", desc: "Visual data flow from market data ingestion to signal generation and delivery.", path: "/pipeline", color: "#00d4ff" },
];

const PRICING = [
  {
    tier: "Starter",
    price: 49,
    desc: "Essential signals and basic bot access",
    features: ["Top 20 coin signals", "Basic Telegram alerts", "Paper trading", "Community access", "Email support"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    tier: "Pro",
    price: 149,
    desc: "Full platform access for serious traders",
    features: ["200+ coin signals", "Priority Telegram bot", "Advanced strategies", "Mining claim access", "API access (1K calls/day)", "Priority support"],
    cta: "Go Pro",
    highlight: true,
  },
  {
    tier: "Enterprise",
    price: 499,
    desc: "White-label solutions and unlimited access",
    features: ["Unlimited signals", "Custom Telegram bot", "Custom strategies", "Premium mining leads", "Unlimited API access", "Dedicated account manager", "White-label option"],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
              <span className="text-[#0a0a0f] font-display font-bold text-sm">NW</span>
            </div>
            <span className="font-display font-bold text-white text-lg">NeuraWealth<span className="text-[#00ff88]"> OS</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</a>
            <Link href="/dashboard" className="px-4 py-2 bg-[#00ff88] text-[#0a0a0f] rounded-lg font-semibold text-sm hover:bg-[#00ff88]/90 transition-colors">
              Launch App
            </Link>
          </div>
          <Link href="/dashboard" className="md:hidden px-3 py-1.5 bg-[#00ff88] text-[#0a0a0f] rounded-lg font-semibold text-xs">
            Launch
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[#00ff88] text-xs font-mono">LIVE • Processing 2.4M signals/day</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                <TypewriterText text="The World's First Autonomous AI Wealth Engine" />
              </h1>
              <p className="text-gray-400 text-lg lg:text-xl mb-8 max-w-xl leading-relaxed">
                AI-powered crypto signals, automated trading bots, mining claim intelligence, and revenue automation — all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00ff88] text-[#0a0a0f] rounded-lg font-semibold hover:bg-[#00ff88]/90 transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]">
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg font-semibold hover:bg-[#00d4ff]/10 transition-all">
                  <MessageSquare className="w-4 h-4" /> Get Signals on Telegram
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 rounded-3xl blur-3xl" />
                <img src={AI_BRAIN} alt="AI Neural Network" className="relative w-full max-w-lg mx-auto animate-float rounded-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-[#1a1a2e] bg-[#0d0d14]/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCounter value={2400000} label="Signals Processed Daily" />
          <StatCounter value={684} label="Active Subscribers" />
          <StatCounter value={34200} label="Monthly Revenue" prefix="$" />
          <StatCounter value={97} label="Uptime %" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Seven Modules. <span className="text-gradient">One Platform.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every tool you need to analyze, trade, and profit from crypto markets — powered by artificial intelligence.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={f.path} className="block glass-card rounded-xl p-6 h-full hover:border-[#00ff88]/30 transition-all group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}15` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-display font-semibold text-white text-lg mb-2 group-hover:text-[#00ff88] transition-colors">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-[#00ff88] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why NeuraWealth */}
      <section className="py-20 border-y border-[#1a1a2e] bg-[#0d0d14]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Signals generated in under 200ms. Real-time market data with 60-second refresh cycles." },
              { icon: Shield, title: "Bank-Grade Security", desc: "End-to-end encryption, SOC2 compliant infrastructure, and zero-knowledge architecture." },
              { icon: Globe, title: "Global Coverage", desc: "200+ crypto pairs across all major exchanges. 24/7 monitoring with 99.97% uptime." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center lg:text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00ff88]/10 flex items-center justify-center mb-4 mx-auto lg:mx-0">
                  <item.icon className="w-6 h-6 text-[#00ff88]" />
                </div>
                <h3 className="font-display font-semibold text-white text-xl mb-2">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Simple, Transparent <span className="text-gradient">Pricing</span>
            </h2>
            <p className="text-gray-400 text-lg">Start free. Scale as you grow.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-xl p-6 lg:p-8 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-[#00ff88]/10 to-[#0d0d14] border-2 border-[#00ff88]/30 relative"
                    : "glass-card"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#00ff88] text-[#0a0a0f] text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-display font-semibold text-white text-xl mb-1">{plan.tier}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="font-mono text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#00ff88] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                  plan.highlight
                    ? "bg-[#00ff88] text-[#0a0a0f] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                    : "border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
                }`}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Telegram CTA */}
      <section className="py-20 border-t border-[#1a1a2e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#00d4ff]/10 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-[#00d4ff]" />
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Get Signals Directly on <span className="text-[#00d4ff]">Telegram</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join 4,800+ traders receiving real-time AI signals, market alerts, and portfolio updates straight to their Telegram.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#00d4ff] text-[#0a0a0f] rounded-lg font-semibold hover:bg-[#00d4ff]/90 transition-all">
                <MessageSquare className="w-4 h-4" /> Join Telegram Bot
              </a>
              <Link href="/telegram" className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg font-semibold hover:bg-[#00d4ff]/10 transition-all">
                Learn More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a2e] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
                <span className="text-[#0a0a0f] font-display font-bold text-[10px]">NW</span>
              </div>
              <span className="font-display font-semibold text-white text-sm">NeuraWealth OS</span>
            </div>
            <div className="text-gray-500 text-xs font-mono">
              Created by Charley for Angie
            </div>
            <div className="text-gray-500 text-xs">
              &copy; {new Date().getFullYear()} NeuraWealth OS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
