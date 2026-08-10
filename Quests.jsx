import { db } from "@/deckverseClient";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Gift, Clock, Zap, Swords, Package, Star, Trophy } from "lucide-react";
import Navbar from "@/Navbar";
import { useI18n } from "@/i18n";
import { useToast } from "@/use-toast";

const QUESTS = [
  {
    id: "q1",
    icon: Swords,
    title: { pt: "Guerreiro do Dia", es: "Guerrero del Día", en: "Daily Warrior" },
    desc: { pt: "Vença 3 batalhas na Arena", es: "Gana 3 batallas en la Arena", en: "Win 3 battles in the Arena" },
    reward_gems: 80,
    reward_gold: 0,
    target: 3,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    id: "q2",
    icon: Package,
    title: { pt: "Caçador de Packs", es: "Cazador de Packs", en: "Pack Hunter" },
    desc: { pt: "Abra 1 pack no Gacha", es: "Abre 1 pack en Gacha", en: "Open 1 pack in Gacha" },
    reward_gems: 50,
    reward_gold: 100,
    target: 1,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    id: "q3",
    icon: Star,
    title: { pt: "Colecionador", es: "Coleccionista", en: "Collector" },
    desc: { pt: "Tenha 5 cartas no seu Roster", es: "Ten 5 cartas en tu equipo", en: "Have 5 cards in your Roster" },
    reward_gems: 120,
    reward_gold: 0,
    target: 5,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "q4",
    icon: Trophy,
    title: { pt: "Veterano", es: "Veterano", en: "Veteran" },
    desc: { pt: "Acumule 10 vitórias no total", es: "Acumula 10 victorias en total", en: "Accumulate 10 total wins" },
    reward_gems: 200,
    reward_gold: 500,
    target: 10,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    id: "q5",
    icon: Zap,
    title: { pt: "Força Bruta", es: "Fuerza Bruta", en: "Brute Force" },
    desc: { pt: "Complete uma batalha com vantagem elemental", es: "Completa una batalla con ventaja elemental", en: "Complete a battle with elemental advantage" },
    reward_gems: 100,
    reward_gold: 200,
    target: 1,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
];

function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function Quests() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(getTimeUntilReset());
  const [claimed, setClaimed] = useState(() => {
    const saved = localStorage.getItem("deckverse_quests_claimed");
    if (!saved) return {};
    const { date, data } = JSON.parse(saved);
    if (date !== new Date().toDateString()) return {};
    return data;
  });

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeUntilReset()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: players = [] } = useQuery({
    queryKey: ["players-quests"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-quests"],
    queryFn: () => db.entities.Roster.list("-created_date", 200),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Player.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players-quests"] }),
  });

  // Calculate progress for each quest based on real data
  const getProgress = (quest) => {
    if (!player) return 0;
    switch (quest.id) {
      case "q1": return Math.min(player.wins || 0, 3); // wins today (simplified: total wins up to 3)
      case "q2": return rosterEntries.length > 0 ? 1 : 0;
      case "q3": return Math.min(rosterEntries.length, 5);
      case "q4": return Math.min(player.wins || 0, 10);
      case "q5": return player.wins > 0 ? 1 : 0;
      default: return 0;
    }
  };

  const handleClaim = (quest) => {
    if (!player) return;
    const newClaimed = { ...claimed, [quest.id]: true };
    setClaimed(newClaimed);
    localStorage.setItem("deckverse_quests_claimed", JSON.stringify({
      date: new Date().toDateString(),
      data: newClaimed,
    }));
    updatePlayerMutation.mutate({
      id: player.id,
      data: {
        gems: (player.gems || 0) + quest.reward_gems,
        gold: (player.gold || 0) + quest.reward_gold,
      },
    });
    toast({
      title: lang === "pt" ? "Recompensa resgatada!" : lang === "es" ? "¡Recompensa reclamada!" : "Reward claimed!",
      description: `+${quest.reward_gems} Gems${quest.reward_gold > 0 ? ` +${quest.reward_gold} Gold` : ""}`,
    });
  };

  const completedCount = QUESTS.filter(q => getProgress(q) >= q.target).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-accent/30 bg-accent/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">{t("quests_title")}</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">{t("quests_subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-border/40 bg-card/40 px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{t("quests_reset")}: <span className="text-foreground font-bold">{timeLeft}</span></span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 border border-border/40 bg-card/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-heading font-bold text-muted-foreground">MISSÕES CONCLUÍDAS</span>
              <span className="font-heading text-sm font-black text-foreground">{completedCount} / {QUESTS.length}</span>
            </div>
            <div className="h-2 bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / QUESTS.length) * 100}%` }}
                className="h-full bg-accent"
              />
            </div>
          </div>
        </motion.div>

        {/* Quest List */}
        <div className="space-y-3">
          {QUESTS.map((quest, i) => {
            const Icon = quest.icon;
            const progress = getProgress(quest);
            const isComplete = progress >= quest.target;
            const isClaimed = claimed[quest.id];
            const pct = Math.min((progress / quest.target) * 100, 100);

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`border ${isClaimed ? "border-border/20 opacity-50" : quest.border} ${quest.bg} p-4`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 shrink-0 flex items-center justify-center border ${quest.border} bg-background/50`}>
                    <Icon className={`w-5 h-5 ${quest.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-heading text-xs font-black text-foreground">
                        {quest.title[lang] || quest.title.en}
                      </p>
                      <div className="flex items-center gap-2">
                        {quest.reward_gems > 0 && (
                          <span className="font-heading text-[10px] font-bold text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5">
                            +{quest.reward_gems} GEM
                          </span>
                        )}
                        {quest.reward_gold > 0 && (
                          <span className="font-heading text-[10px] font-bold text-amber-400 border border-amber-400/20 bg-amber-400/5 px-1.5 py-0.5">
                            +{quest.reward_gold} GOLD
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] font-body text-muted-foreground mt-0.5">
                      {quest.desc[lang] || quest.desc.en}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{progress} / {quest.target}</span>
                        {isComplete && !isClaimed && (
                          <span className="text-[10px] font-heading text-green-400 animate-pulse">PRONTO!</span>
                        )}
                        {isClaimed && (
                          <span className="text-[10px] font-heading text-muted-foreground">{t("quests_completed")}</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-black/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.07 }}
                          className={`h-full ${quest.color.replace("text-", "bg-")}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Claim / Status */}
                  <div className="shrink-0">
                    {isClaimed ? (
                      <CheckCircle2 className="w-6 h-6 text-muted-foreground/40" />
                    ) : isComplete ? (
                      <button
                        onClick={() => handleClaim(quest)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground font-heading text-[10px] font-bold tracking-wider hover:bg-accent/80 transition-colors animate-pulse"
                      >
                        <Gift className="w-3 h-3" /> {t("quests_claim")}
                      </button>
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground/20" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}