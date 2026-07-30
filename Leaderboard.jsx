import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { motion } from "framer-motion";
import { Trophy, Crown, Gem, Coins } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";

const MOCK_PLAYERS = [
  { rank: 1, username: "void_hunter", gems: 12480, gold: 34200, wins: 87, losses: 12, legendaries: 9 },
  { rank: 2, username: "stormcaller99", gems: 9750, gold: 28100, wins: 74, losses: 19, legendaries: 7 },
  { rank: 3, username: "frost_witch", gems: 8320, gold: 22500, wins: 68, losses: 23, legendaries: 6 },
  { rank: 4, username: "ironwall_fan", gems: 6100, gold: 18900, wins: 55, losses: 30, legendaries: 5 },
  { rank: 5, username: "dawn_keeper", gems: 5400, gold: 15300, wins: 49, losses: 28, legendaries: 4 },
  { rank: 6, username: "shadow_rogue", gems: 4200, gold: 12800, wins: 41, losses: 35, legendaries: 3 },
  { rank: 7, username: "arcane_mage7", gems: 3800, gold: 11200, wins: 38, losses: 37, legendaries: 3 },
  { rank: 8, username: "warden_zero", gems: 3100, gold: 9800, wins: 32, losses: 40, legendaries: 2 },
];

const RANK_COLORS = {
  1: "text-amber-400",
  2: "text-zinc-300",
  3: "text-amber-700",
};

const TABS = [
  { key: "gems", label: "BY GEMS", icon: Gem },
  { key: "wins", label: "BY WINS", icon: Trophy },
  { key: "legendaries", label: "BY LEGENDARIES", icon: Crown },
];

export default function Leaderboard() {
  const [tab, setTab] = useState("gems");

  const sorted = [...MOCK_PLAYERS].sort((a, b) => b[tab] - a[tab]).map((p, i) => ({ ...p, rank: i + 1 }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-primary/20 bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">LEADERBOARD</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">GLOBAL RANKING SYSTEM</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex border-b border-border/40 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 font-heading text-xs font-bold tracking-widest border-b-2 -mb-px transition-all ${
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="border border-border/40 divide-y divide-border/30">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 bg-muted/20">
            <span className="col-span-1 text-[10px] font-heading tracking-widest text-muted-foreground">#</span>
            <span className="col-span-5 text-[10px] font-heading tracking-widest text-muted-foreground">PLAYER</span>
            <span className="col-span-2 text-[10px] font-heading tracking-widest text-muted-foreground text-right">GEMS</span>
            <span className="col-span-2 text-[10px] font-heading tracking-widest text-muted-foreground text-right">W/L</span>
            <span className="col-span-2 text-[10px] font-heading tracking-widest text-muted-foreground text-right">LEGEND.</span>
          </div>
          {sorted.map((player, i) => (
            <motion.div
              key={player.username}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-12 items-center px-4 py-3 hover:bg-muted/10 transition-colors ${player.rank <= 3 ? "bg-primary/3" : ""}`}
            >
              <span className={`col-span-1 font-heading text-base font-black tabular-nums ${RANK_COLORS[player.rank] || "text-muted-foreground"}`}>
                {player.rank <= 3 ? ["🥇","🥈","🥉"][player.rank - 1] : player.rank}
              </span>
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-7 h-7 border border-border/40 bg-muted/30 flex items-center justify-center text-xs font-heading font-black text-muted-foreground">
                  {player.username[0].toUpperCase()}
                </div>
                <span className="font-body text-sm font-bold text-foreground">{player.username}</span>
              </div>
              <span className="col-span-2 font-heading text-sm font-bold text-primary text-right tabular-nums">{player.gems.toLocaleString()}</span>
              <span className="col-span-2 font-heading text-xs text-right tabular-nums">
                <span className="text-green-400">{player.wins}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-400">{player.losses}</span>
              </span>
              <span className="col-span-2 font-heading text-sm font-bold text-amber-400 text-right tabular-nums">{player.legendaries}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}