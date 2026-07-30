const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Gem, Star, Zap, Shield, Swords, ChevronRight, Lock } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { RarityBadge, RoleBadge } from "@/components/wiki/RarityBadge";

const MAX_LEVEL = 10;

// Upgrade cost in gems by current level
const UPGRADE_COSTS = [0, 50, 80, 120, 180, 250, 350, 500, 700, 1000];
// Stat bonus per level (%)
const STAT_BONUS_PER_LEVEL = 8;

function getUpgradedStats(card, rosterEntry) {
  const lvl = rosterEntry?.level || 1;
  const mult = 1 + ((lvl - 1) * STAT_BONUS_PER_LEVEL) / 100;
  return {
    attack: Math.round((card.attack || 0) * mult),
    defense: Math.round((card.defense || 0) * mult),
    speed: Math.round((card.speed || 0) * mult),
    hp: Math.round((card.hp || 0) * mult),
  };
}

function StatRow({ label, base, upgraded, color }) {
  const increased = upgraded > base;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-heading text-muted-foreground w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-muted/30 relative overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min((base / 10000) * 100, 100)}%` }} />
        {increased && (
          <div className={`absolute top-0 h-full ${color} opacity-50 transition-all duration-500`} style={{ left: `${Math.min((base / 10000) * 100, 100)}%`, width: `${Math.min(((upgraded - base) / 10000) * 100, 100)}%` }} />
        )}
      </div>
      <span className="font-mono text-xs text-foreground w-16 text-right tabular-nums">{base.toLocaleString()}</span>
      {increased && (
        <>
          <ChevronRight className="w-3 h-3 text-green-400" />
          <span className="font-mono text-xs text-green-400 w-16 tabular-nums">{upgraded.toLocaleString()}</span>
        </>
      )}
    </div>
  );
}

export default function CardUpgrade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);

  const { data: allCards = [] } = useQuery({
    queryKey: ["cards-upgrade"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-upgrade"],
    queryFn: () => db.entities.Roster.list("-created_date", 200),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-upgrade"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const gems = player?.gems ?? 500;

  // Build roster with card data
  const rosterWithCards = useMemo(() => {
    return rosterEntries.map(entry => {
      const card = allCards.find(c => c.id === entry.card_id);
      return { ...entry, card };
    }).filter(e => e.card);
  }, [rosterEntries, allCards]);

  const selectedCard = selectedRoster?.card;
  const currentLevel = selectedRoster?.level || 1;
  const upgradeCost = UPGRADE_COSTS[currentLevel] || 1000;
  const canUpgrade = currentLevel < MAX_LEVEL && gems >= upgradeCost;

  const currentStats = selectedCard ? getUpgradedStats(selectedCard, selectedRoster) : null;
  const nextStats = selectedCard ? getUpgradedStats(selectedCard, { ...selectedRoster, level: currentLevel + 1 }) : null;

  const upgradeMutation = useMutation({
    mutationFn: async ({ rosterId, newLevel, playerId, newGems }) => {
      await db.entities.Roster.update(rosterId, { level: newLevel });
      if (playerId) await db.entities.Player.update(playerId, { gems: newGems });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster-upgrade"] });
      qc.invalidateQueries({ queryKey: ["players-upgrade"] });
      setJustUpgraded(true);
      setSelectedRoster(prev => prev ? { ...prev, level: prev.level + 1 } : prev);
      setTimeout(() => setJustUpgraded(false), 1500);
    },
  });

  const handleUpgrade = async () => {
    if (!selectedRoster || !canUpgrade) return;
    setUpgrading(true);
    await new Promise(r => setTimeout(r, 600));
    upgradeMutation.mutate({
      rosterId: selectedRoster.id,
      newLevel: currentLevel + 1,
      playerId: player?.id,
      newGems: gems - upgradeCost,
    });
    setUpgrading(false);
  };

  const LEVEL_COLORS = ["","text-green-400","text-green-400","text-blue-400","text-blue-400","text-purple-400","text-purple-400","text-amber-400","text-amber-400","text-red-400","text-red-400"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-accent/30 bg-accent/10 flex items-center justify-center">
                <ArrowUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">CARD UPGRADE</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">FORTALEÇA AS SUAS CARTAS</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2">
              <Gem className="w-4 h-4 text-primary" />
              <span className="font-heading text-sm font-bold text-primary tabular-nums">{gems.toLocaleString()}</span>
              <span className="font-heading text-[10px] text-muted-foreground">GEMS</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster list */}
          <div className="lg:col-span-1 border border-border/40 bg-card/30">
            <div className="px-4 py-3 border-b border-border/40">
              <span className="font-heading text-[10px] tracking-widest text-muted-foreground">SEU ROSTER ({rosterWithCards.length} CARTAS)</span>
            </div>
            <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto">
              {rosterWithCards.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs font-body text-muted-foreground">Sem cartas no roster.</p>
                  <p className="text-xs font-body text-muted-foreground mt-1">Abra packs na Zona Gacha!</p>
                </div>
              ) : (
                rosterWithCards.map(entry => {
                  const isSelected = selectedRoster?.id === entry.id;
                  const lvl = entry.level || 1;
                  return (
                    <button key={entry.id} onClick={() => setSelectedRoster(entry)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/10 ${isSelected ? "bg-primary/10 border-r-2 border-primary" : ""}`}>
                      {entry.card?.image_url ? (
                        <img src={entry.card.image_url} alt={entry.card_name} className="w-8 h-10 object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-10 bg-muted/30 flex items-center justify-center shrink-0">
                          <Star className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-xs font-bold text-foreground truncate">{entry.card_name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{entry.card?.rarity} · {entry.card?.role}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-heading text-xs font-bold ${LEVEL_COLORS[lvl]}`}>LV{lvl}</span>
                        {lvl >= MAX_LEVEL && <Lock className="w-3 h-3 text-amber-400 mx-auto mt-0.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Upgrade panel */}
          <div className="lg:col-span-2">
            {!selectedRoster ? (
              <div className="border border-border/40 bg-card/30 h-full flex items-center justify-center py-20">
                <div className="text-center space-y-2">
                  <ArrowUp className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="font-heading text-sm text-muted-foreground">Selecione uma carta para melhorar</p>
                </div>
              </div>
            ) : (
              <div className="border border-border/40 bg-card/30 p-6 space-y-6">
                {/* Card header */}
                <div className="flex items-start gap-4">
                  {selectedCard?.image_url ? (
                    <div className="relative">
                      <img src={selectedCard.image_url} alt={selectedCard.name} className="w-20 h-28 object-cover border border-border/40" />
                      <AnimatePresence>
                        {justUpgraded && (
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                            <Zap className="w-8 h-8 text-accent" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="w-20 h-28 bg-muted/30 flex items-center justify-center border border-border/40">
                      <Star className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="font-heading text-xl font-black text-foreground">{selectedCard?.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{selectedCard?.card_id} · {selectedCard?.series}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <RarityBadge rarity={selectedCard?.rarity} />
                      <RoleBadge role={selectedCard?.role} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-heading text-3xl font-black ${LEVEL_COLORS[currentLevel]}`}>LV{currentLevel}</span>
                    <p className="font-heading text-[10px] text-muted-foreground">/ {MAX_LEVEL}</p>
                  </div>
                </div>

                {/* Level progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-heading mb-1.5">
                    <span className="text-muted-foreground">PROGRESSO DE NÍVEL</span>
                    <span className="text-foreground">{currentLevel}/{MAX_LEVEL}</span>
                  </div>
                  <div className="h-2 bg-muted/30 relative overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      animate={{ width: `${(currentLevel / MAX_LEVEL) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    {Array(MAX_LEVEL).fill(0).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel ? "bg-primary" : "bg-muted/30"}`} />
                    ))}
                  </div>
                </div>

                {/* Stats comparison */}
                {currentStats && (
                  <div className="border border-border/30 bg-muted/10 p-4 space-y-3">
                    <span className="font-heading text-[10px] tracking-widest text-muted-foreground">
                      {currentLevel < MAX_LEVEL ? `STATS: LV${currentLevel} → LV${currentLevel + 1}` : "STATS MÁXIMOS"}
                    </span>
                    <StatRow label="ATQ" base={currentStats.attack} upgraded={nextStats?.attack || currentStats.attack} color="bg-red-500" />
                    <StatRow label="DEF" base={currentStats.defense} upgraded={nextStats?.defense || currentStats.defense} color="bg-blue-500" />
                    <StatRow label="VEL" base={currentStats.speed} upgraded={nextStats?.speed || currentStats.speed} color="bg-yellow-500" />
                    <StatRow label="HP" base={currentStats.hp} upgraded={nextStats?.hp || currentStats.hp} color="bg-green-500" />
                    {currentLevel < MAX_LEVEL && (
                      <p className="text-[10px] font-body text-green-400">↑ +{STAT_BONUS_PER_LEVEL}% em todas as stats</p>
                    )}
                  </div>
                )}

                {/* Upgrade button */}
                {currentLevel >= MAX_LEVEL ? (
                  <div className="flex items-center justify-center gap-2 py-4 border border-amber-500/30 bg-amber-500/5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="font-heading text-sm font-bold text-amber-400">NÍVEL MÁXIMO ATINGIDO</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-heading">
                      <span className="text-muted-foreground">CUSTO DO UPGRADE</span>
                      <div className="flex items-center gap-1.5">
                        <Gem className="w-3.5 h-3.5 text-primary" />
                        <span className={gems >= upgradeCost ? "text-primary" : "text-destructive"}>{upgradeCost} GEMS</span>
                        {gems < upgradeCost && <span className="text-destructive/70 text-[10px]">(Insuficiente)</span>}
                      </div>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={!canUpgrade || upgrading || upgradeMutation.isPending}
                      className={`w-full flex items-center justify-center gap-2 py-3 font-heading text-sm font-bold tracking-widest transition-all ${
                        canUpgrade && !upgrading
                          ? "bg-accent text-accent-foreground hover:bg-accent/80"
                          : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {upgrading || upgradeMutation.isPending ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity }}>
                            <Zap className="w-4 h-4" />
                          </motion.div>
                          UPGRADING...
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-4 h-4" />
                          UPGRADE PARA LV{currentLevel + 1}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}