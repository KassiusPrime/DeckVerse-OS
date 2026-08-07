import { db } from "@/base44Client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, Star, Gem, ChevronRight, RefreshCw, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/Navbar";
import { RARITY_ALIAS } from "@/constants";
import { useToast } from "@/use-toast";
import { pushCRTLog } from "./CRTTerminalOverlay";
import { getAllExpandedCards } from "@/src/data/megaCollectionsData";

// ─── Rarity display (new names) ───────────────────────────────────────────────
const TIER_COLORS = {
  Recruit:   "from-zinc-700 to-zinc-600",
  Adept:     "from-green-800 to-green-700",
  Elite:     "from-blue-800 to-blue-700",
  Champion:  "from-purple-800 to-purple-700",
  Sovereign: "from-amber-800 to-amber-700",
  Ascendant: "from-red-900 to-red-800",
  Divine:    "from-sky-900 to-sky-700",
};
const TIER_GLOW = {
  Recruit:   "",
  Adept:     "shadow-green-500/30",
  Elite:     "shadow-blue-500/40",
  Champion:  "shadow-purple-500/50",
  Sovereign: "shadow-amber-500/60 shadow-lg",
  Ascendant: "shadow-red-500/70 shadow-xl",
  Divine:    "shadow-sky-400/90 shadow-2xl",
};
const TIER_BORDER = {
  Recruit:   "border-zinc-500/30",
  Adept:     "border-green-500/30",
  Elite:     "border-blue-500/30",
  Champion:  "border-purple-500/30",
  Sovereign: "border-amber-500/50",
  Ascendant: "border-red-500/60",
  Divine:    "border-sky-400/80",
};

// ─── Packs ────────────────────────────────────────────────────────────────────
const PACKS = [
  {
    id: "basic", name: "PACK BÁSICO", description: "1 carta — mín. Adept",
    cost: 80, pulls: 1, emoji: "📦",
    color: "from-zinc-800/60 to-zinc-900/60", border: "border-zinc-500/30", accent: "text-zinc-300",
    rates: { Recruit:0, Adept:0.40, Elite:0.35, Champion:0.15, Sovereign:0.08, Ascendant:0.02, Divine:0 },
  },
  {
    id: "elite", name: "PACK ELITE", description: "3 cartas — mín. Elite",
    cost: 200, pulls: 3, emoji: "🔷",
    color: "from-blue-900/60 to-blue-950/60", border: "border-blue-500/30", accent: "text-blue-400",
    rates: { Recruit:0, Adept:0.10, Elite:0.40, Champion:0.30, Sovereign:0.15, Ascendant:0.05, Divine:0 },
  },
  {
    id: "champion", name: "PACK CHAMPION", description: "5 cartas — mín. Champion",
    cost: 450, pulls: 5, emoji: "💎",
    color: "from-purple-900/60 to-purple-950/60", border: "border-purple-500/30", accent: "text-purple-400",
    rates: { Recruit:0, Adept:0, Elite:0.10, Champion:0.40, Sovereign:0.35, Ascendant:0.14, Divine:0.01 },
  },
  {
    id: "sovereign", name: "PACK SOVEREIGN", description: "5 cartas — Sovereign garantido",
    cost: 800, pulls: 5, emoji: "👑",
    color: "from-amber-900/60 to-amber-950/60", border: "border-amber-500/40", accent: "text-amber-400",
    rates: { Recruit:0, Adept:0, Elite:0, Champion:0.20, Sovereign:0.50, Ascendant:0.28, Divine:0.02 },
  },
  {
    id: "ascendant", name: "PACK ASCENDANT", description: "10 cartas — Ascendant garantido",
    cost: 1500, pulls: 10, emoji: "🔥",
    color: "from-red-900/60 to-red-950/60", border: "border-red-500/40", accent: "text-red-400",
    rates: { Recruit:0, Adept:0, Elite:0, Champion:0, Sovereign:0.30, Ascendant:0.60, Divine:0.10 },
  },
  {
    id: "divine", name: "PACK DIVINE ☆", description: "Única chance de invocar um Boss",
    cost: 3000, pulls: 1, emoji: "✨",
    color: "from-sky-900/60 to-sky-950/60", border: "border-sky-400/50", accent: "text-sky-300",
    rates: { Recruit:0, Adept:0, Elite:0, Champion:0, Sovereign:0.30, Ascendant:0.50, Divine:0.20 },
  },
];

// ─── Luck system ──────────────────────────────────────────────────────────────
function getLuckLevel(pity) {
  if (pity >= 80) return { label: "ULTRASORTE !", color: "text-sky-300", bar: 100, emoji: "🌟" };
  if (pity >= 50) return { label: "Sorte Alta",   color: "text-amber-400", bar: 75, emoji: "✨" };
  if (pity >= 30) return { label: "Sorte Média",  color: "text-purple-400", bar: 50, emoji: "💫" };
  if (pity >= 10) return { label: "Sorte Baixa",  color: "text-blue-400", bar: 30, emoji: "⭐" };
  return             { label: "Iniciante",         color: "text-zinc-400", bar: 10, emoji: "🎲" };
}

function rollRarity(rates, pity) {
  // Pity: every pull increases chance for higher tier
  const boost = Math.min(pity * 0.005, 0.3);
  const boostedRates = { ...rates };
  if (boostedRates.Ascendant > 0) boostedRates.Ascendant = Math.min(1, (boostedRates.Ascendant || 0) + boost * 0.5);
  if (boostedRates.Sovereign > 0) boostedRates.Sovereign = Math.min(1, (boostedRates.Sovereign || 0) + boost * 0.5);

  const r = Math.random();
  let cum = 0;
  for (const [rarity, prob] of Object.entries(boostedRates)) {
    cum += prob;
    if (r <= cum) return rarity;
  }
  return "Elite";
}

function pickCard(pool, rarity) {
  const matches = pool.filter(c => (RARITY_ALIAS[c.rarity] || c.rarity) === rarity || c.rarity === rarity);
  if (matches.length === 0) {
    const order = ["Divine","Ascendant","Sovereign","Champion","Elite","Adept","Recruit"];
    for (const r of order) {
      const m = pool.filter(c => (RARITY_ALIAS[c.rarity] || c.rarity) === r || c.rarity === r);
      if (m.length > 0) return m[Math.floor(Math.random() * m.length)];
    }
  }
  return matches[Math.floor(Math.random() * matches.length)];
}

function CardReveal({ card, delay = 0 }) {
  const tier = RARITY_ALIAS[card.rarity] || card.rarity || "Elite";
  const isHighTier = ["Sovereign","Ascendant","Divine"].includes(tier);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, rotateY: -120 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay, duration: 0.5, type: "spring", bounce: 0.3 }}
    >
      <div className={`relative border overflow-hidden ${TIER_GLOW[tier] || ""} ${TIER_BORDER[tier] || "border-border/40"}`}>
        <div className={`aspect-[3/4] bg-gradient-to-b ${TIER_COLORS[tier] || "from-zinc-800 to-zinc-700"} relative`}>
          {card.image_url
            ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <Star className="w-8 h-8 text-white/30" />
              </div>
          }
          {/* Shimmer for high tiers */}
          {isHighTier && (
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
            />
          )}
          {/* Divine aura */}
          {tier === "Divine" && (
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-sky-400/20 pointer-events-none"
            />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
            <p className="font-heading text-[10px] font-black text-white truncate">{card.name}</p>
            <p className="font-mono text-[9px] text-white/60">{card.card_id}</p>
          </div>
        </div>
        <div className="p-1.5 bg-card/90">
          <span className={`text-[9px] font-heading font-bold px-1.5 py-0.5 ${TIER_BORDER[tier]} border`} style={{ color: "inherit" }}>
            {tier}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function GachaDrop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [results, setResults] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [pity, setPity] = useState(() => Number(localStorage.getItem("deckverse_pity") || 0));

  const { data: dbCards = [] } = useQuery({
    queryKey: ["cards-gacha"],
    queryFn: () => db.entities.Card.list("-created_date", 500),
  });

  const cards = useMemo(() => {
    if (dbCards && dbCards.length > 0) return dbCards;
    return getAllExpandedCards();
  }, [dbCards]);

  const { data: players = [] } = useQuery({
    queryKey: ["players-gacha"],
    queryFn: () => db.entities.Player.list(),
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster"],
    queryFn: () => db.entities.Roster.list(),
  });

  const player = players.find(p => p.created_by === user?.email || p.discord_id === "player_001") || players[0] || null;
  const gems = player?.gems ?? 500;
  const playerDiscordId = player?.discord_id || user?.email || "player_001";

  const luck = getLuckLevel(pity);

  const handlePull = async (pack) => {
    const cardPool = cards.length > 0 ? cards : getAllExpandedCards();
    if (cardPool.length === 0 || gems < pack.cost) return;
    pushCRTLog(`Opening ${pack.name} (-${pack.cost} Gems)...`, "GACHA");
    setPulling(true);
    setResults(null);

    try {
      await new Promise(r => setTimeout(r, 900));

      const pulled = [];
      let newPity = pity + pack.pulls;
      for (let i = 0; i < pack.pulls; i++) {
        const rarity = rollRarity(pack.rates, pity + i);
        const card = pickCard(cardPool, rarity);
        if (card) pulled.push({ ...card, _tier: RARITY_ALIAS[card.rarity] || card.rarity });
      }

      if (pulled.length === 0) {
        throw new Error("Nenhuma carta disponível para invocar no momento.");
      }

      pushCRTLog(`Summoned ${pulled.length} card(s): ${pulled.map(c => c.name).join(", ")}`, "GACHA");

      // Save pulled cards directly to Player Roster & Collection
      const currentRoster = await db.entities.Roster.list().catch(() => rosterEntries);
      for (const card of pulled) {
        const cardId = card.id || card.card_id;
        const existing = currentRoster.find(r => 
          (r.player_discord_id === playerDiscordId || r.player_discord_id === "player_001" || r.player_discord_id === user?.email) &&
          (r.card_id === cardId || r.card_id === card.card_id || r.card_id === card.id || (r.card_name && r.card_name.toLowerCase() === card.name?.toLowerCase()))
        );

        if (existing) {
          existing.copies = (existing.copies || 1) + 1;
          await db.entities.Roster.update(existing.id, { copies: existing.copies });
        } else {
          const newRosterItem = await db.entities.Roster.create({
            player_discord_id: playerDiscordId,
            card_id: cardId,
            card_name: card.name,
            level: 1,
            attack_bonus: 0,
            defense_bonus: 0,
            copies: 1,
            is_favorite: false
          });
          if (newRosterItem) currentRoster.push(newRosterItem);
        }
      }

      // Update gems only AFTER successful roster addition
      if (player) {
        await db.entities.Player.update(player.id, { gems: Math.max(0, gems - pack.cost) }).catch(() => {});
      }

      // Check if any high tier — reset pity
      const gotHighTier = pulled.some(c => ["Sovereign","Ascendant","Divine"].includes(c._tier));
      if (gotHighTier) newPity = 0;
      setPity(newPity);
      localStorage.setItem("deckverse_pity", String(newPity));

      // Invalidate React Query caches so Roster, Collections, and Inventory update instantly
      await qc.invalidateQueries({ queryKey: ["roster"] });
      await qc.invalidateQueries({ queryKey: ["roster-col"] });
      await qc.invalidateQueries({ queryKey: ["cards"] });
      await qc.invalidateQueries({ queryKey: ["cards-gacha"] });
      await qc.invalidateQueries({ queryKey: ["players-gacha"] });
      await qc.invalidateQueries({ queryKey: ["players-col"] });
      await qc.invalidateQueries({ queryKey: ["players-inv"] });

      setResults(pulled);

      toast({
        title: `🎉 ${pulled.length} Carta(s) Invocada(s)!`,
        description: `Cartas salvas com sucesso em sua Coleção e Roster.`,
      });

      const divine = pulled.find(c => c._tier === "Divine");
      if (divine) toast({ title: `☀️ DIVINE PULL! ${divine.name}`, description: "Um Boss foi invocado!" });
    } catch (err) {
      console.error("Gacha pull failed:", err);
      toast({
        title: "❌ Falha na invocação",
        description: err?.message || "Ocorreu um erro na invocação. Suas gemas NÃO foram consumidas.",
        variant: "destructive"
      });
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-accent/30 bg-accent/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">GACHA DROP</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">ZONE DE INVOCAÇÃO</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Gems */}
              <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2">
                <Gem className="w-4 h-4 text-primary" />
                <span className="font-heading text-sm font-bold text-primary tabular-nums">{gems.toLocaleString()}</span>
              </div>
              {/* Luck meter */}
              <div className="border border-border/40 bg-card/40 px-3 py-2 min-w-[130px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-heading text-muted-foreground">SORTE</span>
                  <span className={`text-[10px] font-heading font-bold ${luck.color}`}>{luck.emoji} {luck.label}</span>
                </div>
                <div className="h-1.5 bg-muted/30 overflow-hidden rounded-full">
                  <motion.div
                    animate={{ width: `${luck.bar}%` }}
                    className={`h-full rounded-full ${luck.color.replace("text-","bg-")}/70`}
                  />
                </div>
                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">Pity: {pity} pulls</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pack grid */}
        {!results && !pulling && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {PACKS.map((pack, i) => (
              <motion.div key={pack.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <div className={`border ${pack.border} bg-gradient-to-b ${pack.color} p-4 space-y-3 h-full flex flex-col`}>
                  {/* Pack visual */}
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{pack.emoji}</div>
                    <div>
                      <p className={`font-heading text-xs font-black tracking-widest ${pack.accent}`}>{pack.name}</p>
                      <p className="text-[11px] font-body text-muted-foreground">{pack.description}</p>
                    </div>
                  </div>

                  {/* Drop rates */}
                  <div className="space-y-1 flex-1">
                    {Object.entries(pack.rates).filter(([, v]) => v > 0).map(([r, v]) => (
                      <div key={r} className="flex items-center justify-between">
                        <span className="text-[10px] font-heading text-muted-foreground">{r}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-muted/30 overflow-hidden rounded-full">
                            <div className="h-full bg-primary/50 rounded-full" style={{ width: `${Math.min(v * 200, 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-foreground w-8 text-right">{(v * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePull(pack)}
                    disabled={gems < pack.cost || cards.length === 0 || pulling}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 font-heading text-xs font-bold tracking-widest transition-all ${
                      gems < pack.cost ? "bg-muted/20 text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/80"
                    }`}
                  >
                    <Gem className="w-3.5 h-3.5" />
                    {pack.cost.toLocaleString()} GEMS · {pack.pulls} CARTA{pack.pulls > 1 ? "S" : ""}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pulling animation */}
        {pulling && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <motion.div animate={{ rotate: 360, scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              <Sparkles className="w-20 h-20 text-accent" />
            </motion.div>
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ y: [0, -12, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="w-3 h-3 rounded-full bg-accent" />
              ))}
            </div>
            <p className="font-heading text-lg font-black tracking-widest text-accent">A INVOCAR...</p>
          </div>
        )}

        {/* Results */}
        {results && !pulling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center mb-6">
              <motion.h2 initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                className="font-heading text-2xl font-black text-foreground"
              >
                {results.some(c => c._tier === "Divine") ? "☀️ DIVINE PULL!" : "✨ CARTAS OBTIDAS!"}
              </motion.h2>
              <p className="text-xs font-body text-muted-foreground mt-1">Nível de sorte: <span className={luck.color}>{luck.emoji} {luck.label}</span></p>
            </div>
            <div className={`grid gap-3 mb-8 ${results.length === 1 ? "grid-cols-1 max-w-[160px] mx-auto" : results.length <= 3 ? "grid-cols-3" : results.length <= 5 ? "grid-cols-5" : "grid-cols-5"}`}>
              {results.map((card, i) => <CardReveal key={i} card={card} delay={i * 0.12} />)}
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setResults(null)}
                className="flex items-center gap-2 px-6 py-2.5 border border-border/50 text-sm font-heading hover:bg-muted/20 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> MAIS PACKS
              </button>
              <Link to="/roster" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-heading hover:bg-primary/80 transition-colors">
                VER ROSTER <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}