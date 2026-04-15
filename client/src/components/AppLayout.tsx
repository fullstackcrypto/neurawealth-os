/* AppLayout — Quantum Noir Dashboard: persistent sidebar nav + top ticker bar */
import { Link, useLocation } from "wouter";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Activity,
  MessageSquare,
  Bot,
  Mountain,
  ShoppingBag,
  DollarSign,
  GitBranch,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useCoinGecko } from "@/hooks/useCoinGecko";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/signals", label: "AI Signals", icon: Activity },
  { path: "/telegram", label: "Telegram", icon: MessageSquare },
  { path: "/bot", label: "Trading Bot", icon: Bot },
  { path: "/mining", label: "Mining", icon: Mountain },
  { path: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { path: "/revenue", label: "Revenue", icon: DollarSign },
  { path: "/pipeline", label: "Pipeline", icon: GitBranch },
];

function MarketTicker() {
  const { coins } = useCoinGecko(8);

  if (coins.length === 0) return null;

  const tickerContent = coins.map(c => (
    <span
      key={c.id}
      className="inline-flex items-center gap-2 px-4 whitespace-nowrap"
    >
      <span className="text-gray-400 uppercase font-mono text-xs">
        {c.symbol}
      </span>
      <span className="font-mono text-sm text-white">
        $
        {c.current_price.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}
      </span>
      <span
        className={`font-mono text-xs ${c.price_change_percentage_24h >= 0 ? "text-[#00ff88]" : "text-red-400"}`}
      >
        {c.price_change_percentage_24h >= 0 ? "+" : ""}
        {c.price_change_percentage_24h.toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="h-8 bg-[#0a0a0f] border-b border-[#1a1a2e] overflow-hidden flex items-center">
      <div className="animate-ticker flex">
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <MarketTicker />
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <Link href="/" className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
          <span className="text-[#00ff88] font-display font-bold text-lg">
            NW
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-400 hover:text-white"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-64 lg:w-56 bg-[#0d0d14] border-r border-[#1a1a2e]
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <div className="p-4 border-b border-[#1a1a2e] hidden lg:block">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
                <span className="text-[#0a0a0f] font-display font-bold text-sm">
                  NW
                </span>
              </div>
              <span className="font-display font-bold text-white">
                NeuraWealth
              </span>
            </Link>
          </div>
          <nav className="p-3 space-y-1 mt-2 lg:mt-0">
            {NAV_ITEMS.map(item => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="text-[10px] text-gray-600 font-mono text-center">
              NeuraWealth OS
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
