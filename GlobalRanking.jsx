import { db } from "@/deckverseClient";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { usePullToRefresh } from "@/usePullToRefresh";
import { motion } from "framer-motion";
import { Trophy, Swords, Gem, TrendingUp, Crown, Star } from "lucide-react";
import Navbar from "@/Navbar";
import { getPlayerRank } from "@/constants";

const TABS = [
  { id: "wins",  label: "Vitórias",  icon: Swords },
  { id: "gems",  label: "Gems",      icon: Gem },
  { id: "level", label: "Nível",     icon: TrendingUp },
];

function RankRow({ player, rank, sortKey }) {
  const rankInfo = getPlayerRank(player.wins || 0);
  const isTop3 = rank <= 3;
  const medals = ["🥇","🥈","🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={`flex items-center gap-4 px-4 py-3 border-b border-border/20 hover:bg-muted/10 transition-colors ${isTop3 ? "bg-muted/5" : ""}`}
    >
      {/* Rank number */}
      <div className="w-10 text-center shrink-0">
        {isTop3
          ? <span className="text-xl">{medals[rank - 1]}</span>
          : <span className="font-mono text-sm text-muted-foreground">#{rank}</span>
        }
      </div>

      {/* Avatar placeholder */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${rankInfo.color.replace("text-","border-")}/30`}
        style={{ background: "hsl(var(--muted))" }}>
        <span className="text-base">{rankInfo.icon}</span>
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-heading text-sm font-black text-foreground truncate">{player.username}</p>
          <span className={`font-heading text-[10px] font-bold px-1.5 py-0.5 border ${rankInfo.color} ${rankInfo.color.replace("text-","border-")}/20`}>
            {rankInfo.rank}
          </span>
        </div>
        <p className="text-[10px] font-body text-muted-foreground">
          {player.wins || 0}W · {player.losses || 0}L · Nv.{player.level || 1}
        </p>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p className="font-mono text-sm font-bold text-foreground tabular-nums">
          {sortKey === "wins"  ? (player.wins || 0)
           : sortKey === "gems" ? (player.gems || 0).toLocaleString()
           : (player.level || 1)}
        </p>
        <p className="text-[10px] font-body text-muted-foreground">
          {sortKey === "wins" ? "vitórias" : sortKey === "gems" ? "gems" : "nível"}
        </p>
      </div>
    </motion.div>
  );
}

export default function GlobalRanking() {
  const [activeTab, setActiveTab] = useState("wins");
  const qc = useQueryClient();

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players-ranking"],
    queryFn: () => db.entities.Player.list(),
    refetchInterval: 30000,
  });

  const { pullY, refreshing } = usePullToRefresh(async () => {
    await qc.refetchQueries({ queryKey: ["players-ranking"] });
  });

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (activeTab === "wins")  return (b.wins  || 0) - (a.wins  || 0);
      if (activeTab === "gems")  return (b.gems  || 0) - (a.gems  || 0);
      if (activeTab === "level") return (b.level || 1) - (a.level || 1);
      return 0;
    });
  }, [players, activeTab]);

  const top = sorted[0];

  return (
    <div className="min-h-screen bg-background">
      {(pullY > 0 || refreshing) && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ transform: `translateY(${refreshing ? 56 : pullY}px)`, transition: refreshing ? "transform 0.2s" : "none" }}>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-xs font-heading font-bold">
            <TrendingUp className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "ATUALIZANDO..." : "SOLTE PARA ATUALIZAR"}
          </div>
        </div>
      )}
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">RANKING GLOBAL</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">{players.length} JOGADORES REGISTRADOS</p>
            </div>
          </div>
        </motion.div>

        {/* Top player showcase */}
        {top && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-6 border border-amber-400/30 bg-amber-400/5 p-5 flex items-center gap-4"
          >
            <div className="text-5xl">👑</div>
            <div className="flex-1">
              <p className="text-[10px] font-heading tracking-widest text-amber-400 mb-1">LÍDER DO RANKING</p>
              <p className="font-heading text-xl font-black text-foreground">{top.username}</p>
              <div className="flex gap-3 mt-1 text-xs font-mono text-muted-foreground">
                <span className="text-amber-400 font-bold">{top.wins || 0} vitórias</span>
                <span>{top.gems || 0} gems</span>
                <span>Nv.{top.level || 1}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-3xl font-black text-amber-400">#{1}</p>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border border-border/40 bg-card/30 p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-heading text-xs font-bold tracking-wider transition-all ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="border border-border/40 bg-card/30 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border/40 bg-muted/20">
            <span className="w-10 text-center text-[10px] font-heading text-muted-foreground">#</span>
            <span className="w-9 shrink-0" />
            <span className="flex-1 text-[10px] font-heading text-muted-foreground">JOGADOR</span>
            <span className="text-[10px] font-heading text-muted-foreground">SCORE</span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Crown className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-body text-muted-foreground">Nenhum jogador ainda</p>
            </div>
          ) : (
            sorted.map((player, i) => (
              <RankRow key={player.id} player={player} rank={i + 1} sortKey={activeTab} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}