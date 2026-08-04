import { db } from "@/base44Client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Shield, Zap, Flame, Target, ChevronRight,
  RefreshCw, Trophy, Skull, Star, Heart, Crown, Lock, Gem
} from "lucide-react";
import Navbar from "@/Navbar";
import { RarityBadge } from "@/RarityBadge";
import { useToast } from "@/use-toast";
import { RARITY_POWER, ELEMENT_ADVANTAGE, ELEMENT_EMOJI } from "@/constants";

// PVE Difficulty Tiers
const DIFFICULTIES = [
  {
    id: "easy", label: "NORMAL", emoji: "🟢", color: "border-green-500/40 text-green-400",
    activeBg: "bg-green-500/10 border-green-500/60",
    desc: "Inimigos fracos. Boa para iniciantes.",
    multiplier: 0.7,
    goldMulti: 1,
    gemReward: 0,
    waves: 1,
  },
  {
    id: "medium", label: "DIFÍCIL", emoji: "🟡", color: "border-amber-500/40 text-amber-400",
    activeBg: "bg-amber-500/10 border-amber-500/60",
    desc: "2 ondas. Inimigos mais fortes.",
    multiplier: 1.2,
    goldMulti: 2.5,
    gemReward: 5,
    waves: 2,
  },
  {
    id: "hard", label: "INFERNO", emoji: "🔴", color: "border-red-500/40 text-red-400",
    activeBg: "bg-red-500/10 border-red-500/60",
    desc: "3 ondas + Boss final.",
    multiplier: 2.0,
    goldMulti: 5,
    gemReward: 20,
    waves: 3,
  },
  {
    id: "boss", label: "BOSS ☆", emoji: "💀", color: "border-sky-400/40 text-sky-300",
    activeBg: "bg-sky-400/10 border-sky-400/70",
    desc: "Boss Divine. Requer carta Champion+.",
    multiplier: 3.5,
    goldMulti: 10,
    gemReward: 50,
    waves: 1,
    isBoss: true,
  },
];

const ENEMY_POOL = [
  { name: "Ember Drake",    rarity: "Rare",      role: "DPS",     element: "Fire",      attack: 65,  defense: 30,  speed: 60, hp: 90  },
  { name: "Iron Colossus",  rarity: "Epic",      role: "Tank",    element: "Earth",     attack: 45,  defense: 90,  speed: 20, hp: 200 },
  { name: "Void Specter",   rarity: "Legendary", role: "Assassin",element: "Shadow",    attack: 95,  defense: 25,  speed: 90, hp: 70  },
  { name: "Storm Harpy",    rarity: "Uncommon",  role: "Mage",    element: "Lightning", attack: 55,  defense: 20,  speed: 70, hp: 75  },
  { name: "Crystal Golem",  rarity: "Rare",      role: "Tank",    element: "Water",     attack: 40,  defense: 80,  speed: 15, hp: 180 },
  { name: "Frost Witch",    rarity: "Epic",      role: "Mage",    element: "Water",     attack: 80,  defense: 35,  speed: 65, hp: 100 },
  { name: "Thunder Oni",    rarity: "Legendary", role: "DPS",     element: "Lightning", attack: 110, defense: 40,  speed: 75, hp: 130 },
  { name: "Shadow Blade",   rarity: "Epic",      role: "Assassin",element: "Shadow",    attack: 88,  defense: 20,  speed: 95, hp: 80  },
];

const BOSS_ENEMY = {
  name: "ABYSSAL SOVEREIGN", rarity: "Mythic", role: "DPS", element: "Shadow",
  attack: 180, defense: 120, speed: 100, hp: 500,
  isBoss: true,
};

function buildEnemyWaves(difficulty) {
  if (difficulty.isBoss) return [[BOSS_ENEMY]];
  const waves = [];
  const mult = difficulty.multiplier;
  for (let w = 0; w < difficulty.waves; w++) {
    const enemy = { ...ENEMY_POOL[(w * 3) % ENEMY_POOL.length] };
    enemy.attack = Math.round(enemy.attack * mult * (1 + w * 0.3));
    enemy.defense = Math.round(enemy.defense * mult * (1 + w * 0.2));
    enemy.hp = Math.round(enemy.hp * mult * (1 + w * 0.4));
    waves.push([enemy]);
  }
  return waves;
}

function simulateBattle(playerCard, enemyCard) {
  const rarityMult = RARITY_POWER[playerCard.rarity] || 1;
  const enemyRarityMult = RARITY_POWER[enemyCard.rarity] || 1;

  let playerBonus = 1, enemyBonus = 1;
  if (ELEMENT_ADVANTAGE[playerCard.element] === enemyCard.element) playerBonus = 1.3;
  if (ELEMENT_ADVANTAGE[enemyCard.element] === playerCard.element) enemyBonus = 1.3;

  const pAtk = Math.round((playerCard.attack || 50) * rarityMult * playerBonus);
  const eAtk = Math.round((enemyCard.attack || 50) * enemyRarityMult * enemyBonus);

  const rounds = [];
  let playerHP = playerCard.hp || 100;
  let enemyHP = enemyCard.hp || 100;
  let round = 1;

  while (playerHP > 0 && enemyHP > 0 && round <= 10) {
    const playerDmg = Math.round(pAtk * (0.8 + Math.random() * 0.4));
    const enemyDmg = Math.round(eAtk * (0.8 + Math.random() * 0.4));
    enemyHP = Math.max(0, enemyHP - playerDmg);
    playerHP = Math.max(0, playerHP - enemyDmg);
    rounds.push({ round, playerDmg, enemyDmg, playerHP, enemyHP });
    round++;
    if (playerHP === 0 || enemyHP === 0) break;
  }

  return {
    playerWins: playerHP > enemyHP || (playerHP === 0 && enemyHP === 0 && pAtk >= eAtk),
    rounds, playerBonus, enemyBonus,
    playerFinal: pAtk, enemyFinal: eAtk,
  };
}

function HPBar({ current, max, color }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="h-2 bg-black/30 overflow-hidden rounded-full">
      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
        className={`h-full ${color} rounded-full`} />
    </div>
  );
}

function StatChip({ label, value, icon: IconComp, color }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 border ${color} text-[10px] font-mono`}>
      <IconComp className="w-3 h-3" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function Arena() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedCard, setSelectedCard] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [phase, setPhase] = useState("select"); // select | battle | result
  const [currentWave, setCurrentWave] = useState(0);
  const [waves, setWaves] = useState([]);
  const [waveResults, setWaveResults] = useState([]);
  const [battleStep, setBattleStep] = useState(0);

  const { data: players = [] } = useQuery({
    queryKey: ["players-arena"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-arena"],
    queryFn: () => db.entities.Roster.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ["cards-arena"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const player = players.find(p => p.created_by === user?.email) || null;

  const ownedCards = useMemo(() => {
    const ownerKey = player?.discord_id || player?.created_by || user?.email;
    return rosterEntries
      .filter(r => (r.player_discord_id && r.player_discord_id === ownerKey) || r.created_by === user?.email)
      .map(r => allCards.find(c => c.id === r.card_id))
      .filter(Boolean);
  }, [rosterEntries, allCards, player, user]);

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Player.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players-arena"] }),
  });

  const logBattleMutation = useMutation({
    mutationFn: (data) => db.entities.BattleLog.create(data),
  });

  const handleStartBattle = async () => {
    if (!selectedCard || !difficulty) return;
    const builtWaves = buildEnemyWaves(difficulty);
    setWaves(builtWaves);
    setWaveResults([]);
    setCurrentWave(0);
    setPhase("battle");
    await runWave(builtWaves, 0, []);
  };

  const runWave = async (allWaves, waveIdx, prevResults) => {
    if (waveIdx >= allWaves.length) {
      // All waves done
      finalizeBattle(prevResults, allWaves.length);
      return;
    }
    setBattleStep(0);
    setCurrentWave(waveIdx);

    for (let i = 0; i <= 3; i++) {
      await new Promise(r => setTimeout(r, 500));
      setBattleStep(i);
    }

    const enemy = allWaves[waveIdx][0];
    const result = simulateBattle(selectedCard, enemy);
    const newResults = [...prevResults, { enemy, result }];
    setWaveResults(newResults);

    if (!result.playerWins) {
      // Lost this wave — game over
      finalizeBattle(newResults, allWaves.length, true);
      return;
    }

    if (waveIdx + 1 < allWaves.length) {
      await new Promise(r => setTimeout(r, 1000));
      await runWave(allWaves, waveIdx + 1, newResults);
    } else {
      finalizeBattle(newResults, allWaves.length);
    }
  };

  const finalizeBattle = (results, totalWaves, forceDefeat = false) => {
    const allWon = !forceDefeat && results.every(r => r.result.playerWins);
    const wavesCleared = results.filter(r => r.result.playerWins).length;
    const playerName = player?.username || user?.email || "Player";

    const goldReward = allWon
      ? Math.round(50 * difficulty.goldMulti + Math.random() * 30)
      : Math.round(10 * wavesCleared);
    const gemReward = allWon ? difficulty.gemReward : 0;

    if (player) {
      const updates = allWon
        ? { wins: (player.wins || 0) + 1, gold: (player.gold || 0) + goldReward, gems: (player.gems || 0) + gemReward }
        : { losses: (player.losses || 0) + 1, gold: (player.gold || 0) + goldReward };
      updatePlayerMutation.mutate({ id: player.id, data: updates });
    }

    const lastEnemy = results.at(-1)?.enemy;
    logBattleMutation.mutate({
      winner_username: allWon ? playerName : lastEnemy?.name,
      loser_username: allWon ? lastEnemy?.name : playerName,
      winner_card: allWon ? selectedCard.name : lastEnemy?.name,
      loser_card: allWon ? lastEnemy?.name : selectedCard.name,
      details: `PVE [${difficulty.label}] — ${selectedCard.name} vs ${lastEnemy?.name}. ${wavesCleared}/${totalWaves} ondas vencidas.`,
    });

    setWaveResults(r => r.length > 0 ? r : results);
    setPhase("result");

    toast({
      title: allWon ? "⚔️ VITÓRIA!" : "💀 DERROTA",
      description: allWon
        ? `+${goldReward} Gold${gemReward > 0 ? ` +${gemReward} Gems` : ""}!`
        : `${wavesCleared}/${totalWaves} ondas vencidas. +${goldReward} Gold`,
    });
  };

  const reset = () => {
    setPhase("select");
    setSelectedCard(null);
    setDifficulty(null);
    setWaves([]);
    setWaveResults([]);
    setCurrentWave(0);
    setBattleStep(0);
  };

  const allWon = waveResults.length > 0 && waveResults.every(r => r.result.playerWins);
  const wavesCleared = waveResults.filter(r => r.result.playerWins).length;
  const currentEnemy = phase === "battle" && waves[currentWave]?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-destructive/30 bg-destructive/10 flex items-center justify-center">
                <Swords className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">ARENA PVE</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">MODO DESAFIO — ONDAS E BOSS</p>
              </div>
            </div>
            {player && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-green-400 font-bold">{player.wins || 0}W</span>
                <span className="text-red-400 font-bold">{player.losses || 0}L</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* SELECT PHASE */}
        {phase === "select" && (
          <div className="space-y-8">
            {/* Difficulty Selection */}
            <div>
              <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-4">ESCOLHA A DIFICULDADE</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d)}
                    className={`border p-4 text-left transition-all ${difficulty?.id === d.id ? d.activeBg : "border-border/40 bg-card/40 hover:border-border/70"}`}
                  >
                    <div className="text-2xl mb-2">{d.emoji}</div>
                    <p className={`font-heading text-xs font-black ${difficulty?.id === d.id ? "" : "text-foreground"}`}>{d.label}</p>
                    <p className="text-[10px] font-body text-muted-foreground mt-1">{d.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[9px] font-mono border border-amber-500/20 text-amber-400 px-1.5 py-0.5">
                        {d.goldMulti}× Gold
                      </span>
                      {d.gemReward > 0 && (
                        <span className="text-[9px] font-mono border border-primary/20 text-primary px-1.5 py-0.5">
                          +{d.gemReward} 💎
                        </span>
                      )}
                      {d.waves > 1 && (
                        <span className="text-[9px] font-mono border border-border/40 text-muted-foreground px-1.5 py-0.5">
                          {d.waves} ondas
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Selection */}
            <div>
              <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-4">ESCOLHA SUA CARTA</h2>
              {ownedCards.length === 0 ? (
                <div className="border border-border/40 bg-card/40 p-10 text-center">
                  <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-heading text-sm text-muted-foreground">Nenhuma carta no roster</p>
                  <p className="text-xs font-body text-muted-foreground/60 mt-1">Abra packs no Gacha primeiro</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {ownedCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className={`border overflow-hidden transition-all group ${selectedCard?.id === card.id ? "border-primary/70 ring-2 ring-primary/20" : "border-border/40 hover:border-border/70"}`}
                    >
                      <div className="aspect-[3/4] relative">
                        {card.image_url
                          ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full bg-muted/20 flex items-center justify-center"><Star className="w-5 h-5 text-muted-foreground/20" /></div>
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        {selectedCard?.id === card.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Swords className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 p-1.5">
                          <p className="text-[9px] font-heading font-black text-white truncate">{card.name}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {selectedCard && (
                  <motion.div key={selectedCard.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="mt-3 border border-primary/40 bg-primary/5 p-3"
                  >
                    <div className="flex items-start gap-3">
                      {selectedCard.image_url && <img src={selectedCard.image_url} alt={selectedCard.name} className="w-12 h-16 object-cover border border-border/40" />}
                      <div className="flex-1">
                        <p className="font-heading text-sm font-black text-primary mb-1">{selectedCard.name}</p>
                        <RarityBadge rarity={selectedCard.rarity} />
                        <div className="flex flex-wrap gap-1 mt-2">
                          <StatChip label="ATK" value={selectedCard.attack || "?"} icon={Swords} color="border-red-500/20 text-red-400" />
                          <StatChip label="DEF" value={selectedCard.defense || "?"} icon={Shield} color="border-blue-500/20 text-blue-400" />
                          <StatChip label="HP" value={selectedCard.hp || "?"} icon={Heart} color="border-green-500/20 text-green-400" />
                          <StatChip label="SPD" value={selectedCard.speed || "?"} icon={Zap} color="border-yellow-500/20 text-yellow-400" />
                        </div>
                        {selectedCard.element && (
                          <p className="text-[10px] font-body text-muted-foreground mt-1">
                            {ELEMENT_EMOJI[selectedCard.element]} {selectedCard.element}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Start */}
            <div className="flex justify-center">
              <button
                onClick={handleStartBattle}
                disabled={!selectedCard || !difficulty}
                className="flex items-center gap-3 px-10 py-3.5 bg-destructive text-destructive-foreground font-heading text-sm font-bold tracking-widest hover:bg-destructive/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Swords className="w-4 h-4" /> INICIAR BATALHA <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BATTLE PHASE */}
        {phase === "battle" && currentEnemy && (
          <div className="flex flex-col items-center justify-center py-12 gap-8">
            {/* Wave indicator */}
            {waves.length > 1 && (
              <div className="flex items-center gap-2">
                {waves.map((_, i) => (
                  <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${i < currentWave ? "bg-green-500" : i === currentWave ? "bg-accent animate-pulse" : "bg-muted/30"}`} />
                ))}
                <span className="text-[10px] font-heading text-muted-foreground ml-2">ONDA {currentWave + 1}/{waves.length}</span>
              </div>
            )}

            {/* VS Display */}
            <div className="flex items-center gap-8 sm:gap-16 w-full max-w-xl justify-center">
              <motion.div animate={{ x: [0, 8, 0] }} transition={{ duration: 0.4, repeat: Infinity }} className="text-center">
                {selectedCard?.image_url
                  ? <img src={selectedCard.image_url} alt={selectedCard.name} className="w-24 h-32 object-cover border-2 border-primary/50 shadow-lg shadow-primary/20 mx-auto" />
                  : <div className="w-24 h-32 bg-primary/10 border-2 border-primary/50 flex items-center justify-center mx-auto"><Shield className="w-10 h-10 text-primary" /></div>
                }
                <p className="font-heading text-xs font-black text-primary mt-2 truncate max-w-[96px]">{selectedCard?.name}</p>
              </motion.div>

              <div className="flex flex-col items-center gap-2">
                <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-3xl">⚔️</motion.div>
                <span className="font-heading text-2xl font-black text-foreground">VS</span>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div key={i} animate={{ opacity: [0, 1, 0], y: [0, -8, 0] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
                  ))}
                </div>
              </div>

              <motion.div animate={{ x: [0, -8, 0] }} transition={{ duration: 0.4, repeat: Infinity }} className="text-center">
                <div className={`w-24 h-32 border-2 ${currentEnemy.isBoss ? "border-sky-400/70 bg-sky-400/10 shadow-sky-400/30 shadow-xl" : "border-destructive/50 bg-destructive/10"} flex items-center justify-center mx-auto`}>
                  {currentEnemy.isBoss
                    ? <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}><Crown className="w-12 h-12 text-sky-300" /></motion.div>
                    : <span className="text-5xl">{ELEMENT_EMOJI[currentEnemy?.element] || "👹"}</span>
                  }
                </div>
                <p className={`font-heading text-xs font-black mt-2 truncate max-w-[96px] ${currentEnemy.isBoss ? "text-sky-300" : "text-destructive"}`}>{currentEnemy?.name}</p>
              </motion.div>
            </div>

            <div className="flex items-center gap-3">
              {["Iniciando...", "Calculando poder...", "Vantagens elementais...", "Determinando vencedor..."].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${battleStep > i ? "bg-green-400" : battleStep === i ? "bg-accent animate-pulse" : "bg-muted"}`} />
                  <span className="hidden sm:inline">{step}</span>
                </div>
              ))}
            </div>
            <p className="font-heading text-lg font-black tracking-widest text-foreground animate-pulse">CALCULANDO...</p>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && waveResults.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6">
            {/* Final outcome */}
            <div className={`relative border p-6 text-center overflow-hidden ${allWon ? "border-green-500/40 bg-green-500/5" : "border-destructive/40 bg-destructive/5"}`}>
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.2 }}>
                {allWon ? <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-3 drop-shadow-lg" /> : <Skull className="w-20 h-20 text-destructive mx-auto mb-3 opacity-80" />}
              </motion.div>
              <h2 className={`font-heading text-4xl font-black tracking-tight ${allWon ? "text-green-400" : "text-destructive"}`}>
                {allWon ? "VITÓRIA!" : "DERROTA"}
              </h2>
              <p className="text-xs font-body text-muted-foreground mt-2">
                {wavesCleared}/{waves.length} ondas concluídas
                {difficulty?.label && ` · ${difficulty.label}`}
              </p>
              {allWon && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="flex items-center gap-1.5 text-xs font-heading text-amber-400 border border-amber-400/30 bg-amber-400/5 px-3 py-1.5">
                    +{Math.round(50 * difficulty.goldMulti)} Gold
                  </span>
                  {difficulty.gemReward > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-heading text-primary border border-primary/30 bg-primary/5 px-3 py-1.5">
                      <Gem className="w-3 h-3" /> +{difficulty.gemReward} Gems
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Wave-by-wave breakdown */}
            <div className="space-y-4">
              {waveResults.map(({ enemy, result }, wIdx) => (
                <div key={wIdx} className={`border ${result.playerWins ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
                    <span className={`text-[10px] font-heading font-bold ${result.playerWins ? "text-green-400" : "text-destructive"}`}>
                      {result.playerWins ? "✓" : "✗"} ONDA {wIdx + 1} — {enemy.isBoss ? "👑 BOSS: " : ""}{enemy.name}
                    </span>
                    {result.playerBonus > 1 && (
                      <span className="text-[9px] font-heading text-amber-400 border border-amber-400/30 px-1.5 py-0.5 ml-auto">
                        <Flame className="w-2.5 h-2.5 inline mr-0.5" />×1.3 elem.
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border/20 max-h-40 overflow-y-auto">
                    {result.rounds.map((r) => (
                      <div key={r.round} className="px-4 py-2 hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-[10px] font-heading text-muted-foreground/50 w-12 shrink-0">RND {r.round}</span>
                          <span className="text-[10px] font-mono text-primary">⚔ -{r.playerDmg}</span>
                          <span className="text-[10px] font-mono text-destructive">💀 -{r.enemyDmg}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                              <span className="text-primary/70">{selectedCard?.name?.split(" ")[0]}</span>
                              <span>{r.playerHP}hp</span>
                            </div>
                            <HPBar current={r.playerHP} max={selectedCard?.hp || 100} color="bg-primary" />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                              <span className="text-destructive/70">{enemy.name.split(" ")[0]}</span>
                              <span>{r.enemyHP}hp</span>
                            </div>
                            <HPBar current={r.enemyHP} max={enemy.hp || 100} color="bg-destructive" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button onClick={reset} className="flex items-center gap-2 px-6 py-2.5 border border-border/50 font-heading text-xs hover:bg-muted/20 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> NOVA BATALHA
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}