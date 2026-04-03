/* Mining Claim Intelligence — AI-powered scoring, sortable table, CSV export */
import { miningClaims } from "@/lib/mockData";
import { motion } from "framer-motion";
import {
  Mountain, Download, Search, ArrowUpDown, Lock, MapPin, Filter
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import Papa from "papaparse";

const MINING_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663508251297/DLgAeusBc3GPPZNVGu2d5R/mining-landscape-Yx9JrmDxEBoBSrmwhbuUub.webp";

type SortKey = "aiScore" | "acreage" | "name" | "mineral";
type SortDir = "asc" | "desc";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#00ff88" : score >= 70 ? "#00d4ff" : score >= 50 ? "#ffb800" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function Mining() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("aiScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mineralFilter, setMineralFilter] = useState("all");

  const minerals = useMemo(() => {
    const set = new Set(miningClaims.map((c) => c.mineral));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    let data = [...miningClaims];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((c) =>
        c.name.toLowerCase().includes(s) ||
        c.location.toLowerCase().includes(s) ||
        c.mineral.toLowerCase().includes(s)
      );
    }
    if (mineralFilter !== "all") {
      data = data.filter((c) => c.mineral === mineralFilter);
    }
    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return data;
  }, [search, sortKey, sortDir, mineralFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    const exportData = miningClaims.filter((c) => !c.premium).map((c) => ({
      Name: c.name,
      Location: c.location,
      Mineral: c.mineral,
      Acreage: c.acreage,
      "AI Score": c.aiScore,
      Status: c.status,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mining_claims.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header with background */}
      <div className="relative rounded-xl overflow-hidden p-6">
        <div className="absolute inset-0">
          <img src={MINING_IMG} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Mountain className="w-5 h-5 text-[#ffb800]" />
            <h1 className="font-display text-2xl font-bold text-white">Mining Claim Intelligence</h1>
          </div>
          <p className="text-gray-400 text-sm">AI-powered scoring system for mining and land claims</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Claims", value: "20", color: "#00d4ff" },
          { label: "Active Claims", value: "13", color: "#00ff88" },
          { label: "Avg AI Score", value: "79.6", color: "#ffb800" },
          { label: "Premium Leads", value: "7", color: "#a855f7" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-xl p-4">
            <div className="font-mono text-xl font-bold text-white">{stat.value}</div>
            <div className="text-gray-400 text-xs">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:border-[#00ff88]/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={mineralFilter}
            onChange={(e) => setMineralFilter(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:border-[#00ff88]/30 focus:outline-none"
          >
            {minerals.map((m) => (
              <option key={m} value={m}>{m === "all" ? "All Minerals" : m}</option>
            ))}
          </select>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00ff88]/20 text-[#00ff88] text-sm hover:bg-[#00ff88]/10 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Map Placeholder */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 relative overflow-hidden" style={{ minHeight: "200px" }}>
        <div className="absolute inset-0 opacity-30">
          <img src={MINING_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative flex flex-col items-center justify-center h-full min-h-[160px]">
          <MapPin className="w-8 h-8 text-[#00d4ff] mb-2" />
          <p className="text-white font-display font-semibold">Interactive Claim Map</p>
          <p className="text-gray-400 text-xs mt-1">{filtered.length} claims displayed • Click markers for details</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {filtered.slice(0, 5).map((c) => (
              <span key={c.id} className="px-2 py-1 bg-[#0a0a0f]/80 border border-white/10 rounded text-xs text-gray-300 font-mono">
                <MapPin className="w-3 h-3 inline mr-1 text-[#00d4ff]" />{c.name}
              </span>
            ))}
            {filtered.length > 5 && (
              <span className="px-2 py-1 bg-[#0a0a0f]/80 border border-white/10 rounded text-xs text-gray-400 font-mono">
                +{filtered.length - 5} more
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Claims Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs font-mono uppercase">
                <th className="text-left py-3 px-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("name")}>
                  <span className="flex items-center gap-1">Claim <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Location</th>
                <th className="text-left py-3 px-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("mineral")}>
                  <span className="flex items-center gap-1">Mineral <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right py-3 px-4 font-medium cursor-pointer hover:text-white hidden md:table-cell" onClick={() => handleSort("acreage")}>
                  <span className="flex items-center gap-1 justify-end">Acreage <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="py-3 px-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("aiScore")}>
                  <span className="flex items-center gap-1">AI Score <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((claim) => (
                <tr key={claim.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${claim.premium ? "relative" : ""}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{claim.name}</span>
                      {claim.premium && <Lock className="w-3 h-3 text-[#ffb800]" />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm hidden sm:table-cell">{claim.location}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 text-xs font-mono">{claim.mineral}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300 text-sm font-mono hidden md:table-cell">{claim.acreage.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={claim.aiScore} />
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-mono ${
                      claim.status === "Active" ? "text-[#00ff88]" :
                      claim.status === "Pending" ? "text-[#ffb800]" : "text-gray-500"
                    }`}>{claim.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Premium CTA */}
      <div className="glass-card rounded-xl p-6 border-[#ffb800]/20 bg-gradient-to-r from-[#ffb800]/5 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-5 h-5 text-[#ffb800]" />
          <h3 className="font-display font-semibold text-white">Premium Leads</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          7 high-value claims with AI scores above 85 are available exclusively to Pro and Enterprise subscribers.
          Includes detailed geological reports, satellite imagery, and risk assessments.
        </p>
        <button
          onClick={() => toast.info("Feature coming soon")}
          className="px-4 py-2 bg-[#ffb800] text-[#0a0a0f] rounded-lg font-semibold text-sm hover:bg-[#ffb800]/90 transition-colors"
        >
          Upgrade to Unlock
        </button>
      </div>
    </div>
  );
}
