/* AI Services Marketplace — service cards, pricing, API key mockup */
import { aiServices } from "@/lib/mockData";
import { motion } from "framer-motion";
import {
  ShoppingBag, Key, Copy, Eye, EyeOff, Check, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ServiceCard({ service, index }: { service: typeof aiServices[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-xl p-6 flex flex-col h-full group hover:border-[#00ff88]/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="px-2 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] text-xs font-mono">{service.category}</span>
        <span className="font-mono text-lg font-bold text-[#00ff88]">{service.price}</span>
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{service.name}</h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">{service.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {service.features.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-gray-300 text-xs">
            <Check className="w-3 h-3 text-[#00ff88]" />{f}
          </span>
        ))}
      </div>
      <button
        onClick={() => toast.info("Feature coming soon")}
        className="w-full py-2.5 rounded-lg border border-[#00ff88]/20 text-[#00ff88] text-sm font-semibold hover:bg-[#00ff88]/10 transition-colors flex items-center justify-center gap-2"
      >
        Subscribe <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

function APIKeyManager() {
  const [showKey, setShowKey] = useState(false);
  const mockKey = "nw_live_sk_a8f3b2c1d4e5f6g7h8i9j0k1l2m3n4o5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-[#ffb800]" />
        <h3 className="font-display font-semibold text-white">API Key Management</h3>
      </div>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs font-mono">LIVE API KEY</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowKey(!showKey)} className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(mockKey); toast.success("API key copied"); }}
                className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <code className="text-sm font-mono text-[#00ff88] break-all">
            {showKey ? mockKey : "nw_live_sk_••••••••••••••••••••••••"}
          </code>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="font-mono text-lg font-bold text-white">847</div>
            <div className="text-gray-400 text-xs">Calls Today</div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="font-mono text-lg font-bold text-white">1,000</div>
            <div className="text-gray-400 text-xs">Daily Limit</div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="font-mono text-lg font-bold text-[#00ff88]">84.7%</div>
            <div className="text-gray-400 text-xs">Usage</div>
          </div>
        </div>
        <button
          onClick={() => toast.info("Feature coming soon")}
          className="w-full py-2 rounded-lg border border-[#ffb800]/20 text-[#ffb800] text-sm hover:bg-[#ffb800]/10 transition-colors"
        >
          Generate New Key
        </button>
      </div>
    </motion.div>
  );
}

export default function Marketplace() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-5 h-5 text-[#00d4ff]" />
          <h1 className="font-display text-2xl font-bold text-white">AI Services Marketplace</h1>
        </div>
        <p className="text-gray-400 text-sm">Subscribe to AI-powered APIs and services for crypto analysis and automation</p>
      </div>

      {/* Service Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiServices.map((service, i) => (
          <ServiceCard key={service.id} service={service} index={i} />
        ))}
      </div>

      {/* API Key Management */}
      <APIKeyManager />
    </div>
  );
}
