import { db } from "@/base44Client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Swords, Trophy, Gem, TrendingUp, Star, Shield,
  Clock, BarChart2, Zap, Package, Target, Activity, ChevronRight
} from "lucide-react";
import Navbar from "@/Navbar";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { getPlayerRank, getXpForLevel, RARITY_TIERS, RARITY_ALIAS, RARITY_ORDER } from "@/constants";

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "text-primary", sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/40 bg-card/40 p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
    >
      <div className={`w-10 h-10 flex items-center justify-center border border-border/40 bg-muted/20 shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</p>
        <p className={`font-heading text-xl font-black ${color} tabular-nums leading-none mt-0.5`}>{value}</p>
        {sub && <p className="text-[9px] font-body text-muted-foreground/50 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Hexagonal avatar ───────────────────────────────────────────────────────────
function HexAvatar({ src, icon, color, size = 80 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <polygon
          points="50,2 93,26 93,74 50,98 7,74 7,26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={color}
          style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)" }}>
        {src
          ? <img src={src} alt="" className="w-full h-full object-cover" />
          : <span className="text-3xl">{icon}</span>
        }
      </div>
    </div>
  );
}

// ── Radar custom tick ─────────────────────────────────────────────────────────
function CustomRadarTick({ x, y, payload }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      className="font-heading" fill="hsl(var(--muted-foreground))" fontSize={9} fontWeight={700}>
      {payload.value}
    </text>
  );
}

const TABS = ["OVERVIEW", "ANALYTICS", "BATALHAS"];

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState("OVERVIEW");

  const { data: players = [] } = useQuery({ queryKey: ["players-profile"], queryFn: () => db.entities.Player.list(), enabled: !!user });
  const { data: rosterEntries = [] } = useQuery({ queryKey: ["roster-profile"], queryFn: () => db.entities.Roster.list("-created_date", 300), enabled: !!user });
  const { data: allCards = [] } = useQuery({ queryKey: ["cards-profile"], queryFn: () => db.entities.Card.list("-created_date", 300) });
  const { data: battleLogs = [] } = useQuery({ queryKey: ["battle-logs-profile"], queryFn: () => db.entities.BattleLog.list("-created_date", 100), enabled: !!user });
  const { data: guilds = [] } = useQuery({ queryKey: ["guilds-profile"], queryFn: () => db.entities.Guild.list(), enabled: !!user });
  const { data: guildMembers = [] } = useQuery({ queryKey: ["guild-members-profile"], queryFn: () => db.entities.GuildMember.list(), enabled: !!user });

  const player = players.find(p => p.created_by === user?.email) || null;
  const myId = player?.discord_id || user?.email || "";
  const myRoster = rosterEntries.filter(r => r.player_discord_id === myId);
  const rankInfo = getPlayerRank(player?.wins || 0);
  const xpForNext = getXpForLevel(player?.level || 1);
  const xpProgress = Math.min(((player?.wins || 0) * 10) % xpForNext, xpForNext);
  const xpPct = Math.round((xpProgress / xpForNext) * 100);
  const totalBattles = (player?.wins || 0) + (player?.losses || 0);
  const winRate = totalBattles > 0 ? Math.round(((player?.wins || 0) / totalBattles) * 100) : 0;
  const ownedUniqueIds = new Set(myRoster.map(r => r.card_id));
  const totalCards = allCards.length;
  const collectionPct = totalCards > 0 ? Math.round((ownedUniqueIds.size / totalCards) * 100) : 0;
  const myMembership = guildMembers.find(m => m.player_discord_id === myId);
  const myGuild = myMembership ? guilds.find(g => g.id === myMembership.guild_id) : null;
  const myBattles = useMemo(() => {
    const name = player?.username || user?.email || "";
    return battleLogs.filter(b => b.winner_username === name || b.loser_username === name).slice(0, 20);
  }, [battleLogs, player, user]);

  // Rarity distribution
  const rarityDist = useMemo(() => {
    const map = {};
    myRoster.forEach(r => {
      const card = allCards.find(c => c.id === r.card_id);
      if (!card) return;
      const tier = RARITY_ALIAS[card.rarity] || card.rarity;
      map[tier] = (map[tier] || 0) + 1;
    });
    return map;
  }, [myRoster, allCards]);

  // Role distribution for radar
  const roleDist = useMemo(() => {
    const map = {};
    myRoster.forEach(r => {
      const card = allCards.find(c => c.id === r.card_id);
      if (card?.role) map[card.role] = (map[card.role] || 0) + 1;
    });
    return map;
  }, [myRoster, allCards]);

  const radarData = Object.entries(roleDist).slice(0, 7).map(([role, count]) => ({ role, count }));

  // Win trend (last 10 battles as area chart)
  const winTrend = useMemo(() => {
    const name = player?.username || "";
    return myBattles.slice(0, 10).reverse().map((b, i) => ({
      x: i + 1,
      result: b.winner_username === name ? 1 : 0,
    }));
  }, [myBattles, player]);

  if (!player) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-heading text-lg text-muted-foreground">Perfil não encontrado</p>
          <p className="text-sm font-body text-muted-foreground/60 mt-2">Peça a um admin para criar seu perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero Card ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="relative border border-border/40 bg-card/50 overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse 60% 80% at 10% 50%, ${rankInfo.color.includes("amber") ? "rgba(251,191,36,0.06)" : rankInfo.color.includes("sky") ? "rgba(56,189,248,0.06)" : "rgba(0,240,255,0.04)"}, transparent)`
          }} />

          <div className="relative p-6">
            <div className="flex items-start gap-6 flex-wrap">
              <HexAvatar
                src={player.avatar_url}
                icon={rankInfo.icon}
                color={rankInfo.color.replace("text-", "text-").replace("text-", "")}
                size={90}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground">{player.username}</h1>
                  <span className={`font-heading text-[10px] font-black px-3 py-1 border ${rankInfo.color} border-current/30 tracking-widest`}>
                    {rankInfo.icon} {rankInfo.rank}
                  </span>
                  {myGuild && (
                    <span className="font-heading text-[10px] text-secondary border border-secondary/30 px-2 py-1 tracking-widest">
                      {myGuild.emblem} {myGuild.tag}
                    </span>
                  )}
                </div>

                <div className="flex gap-4 text-xs font-mono mb-4">
                  <span className="text-primary font-bold">{(player.gems || 0).toLocaleString()} 💎</span>
                  <span className="text-amber-400 font-bold">{(player.gold || 0).toLocaleString()} 🪙</span>
                  <span className="text-muted-foreground">Nível {player.level || 1}</span>
                </div>

                {/* XP bar */}
                <div className="max-w-sm">
                  <div className="flex justify-between text-[10px] font-body mb-1.5">
                    <span className="text-muted-foreground">Progresso de Nível</span>
                    <span className={rankInfo.color}>{xpPct}%</span>
                  </div>
                  <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full relative"
                      style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-sm" />
                    </motion.div>
                  </div>
                  <p className="text-[9px] font-body text-muted-foreground/50 mt-1">{xpProgress} / {xpForNext} XP → Nível {(player.level || 1) + 1}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="flex border-b border-border/40">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 font-heading text-[10px] font-black tracking-widest transition-colors ${t === tab ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════ OVERVIEW ═══════ */}
          {tab === "OVERVIEW" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Swords}   label="VITÓRIAS"   value={player.wins || 0}   color="text-green-400"  sub={`${winRate}% win rate`} />
                <StatCard icon={Shield}   label="DERROTAS"   value={player.losses || 0} color="text-red-400"    sub={`${totalBattles} total`} />
                <StatCard icon={Package}  label="ROSTER"     value={myRoster.length}    color="text-secondary"  sub={`${ownedUniqueIds.size} únicos`} />
                <StatCard icon={Trophy}   label="COLEÇÃO"    value={`${collectionPct}%`} color="text-amber-400" sub={`${ownedUniqueIds.size}/${totalCards}`} />
              </div>

              {/* Rarity distribution — animated bars */}
              <div className="border border-border/40 bg-card/30 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span className="font-heading text-xs font-black tracking-widest">DISTRIBUIÇÃO POR RARIDADE</span>
                </div>
                <div className="space-y-2">
                  {RARITY_ORDER.filter(r => rarityDist[r]).map((tier, i) => {
                    const t = RARITY_TIERS[tier];
                    const cnt = rarityDist[tier] || 0;
                    const maxCnt = Math.max(...Object.values(rarityDist), 1);
                    const pct = (cnt / maxCnt) * 100;
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className={`font-heading text-[9px] font-black w-16 shrink-0 ${t?.color || "text-muted-foreground"}`}>[{tier}]</span>
                        <div className="flex-1 h-4 bg-muted/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.06, duration: 0.7, ease: "easeOut" }}
                            className="h-full rounded-full relative"
                            style={{ background: t?.glow ? `linear-gradient(90deg, ${t.border.replace("border-","").replace("/30","").replace("/40","")}, transparent)` : "hsl(var(--primary))", opacity: 0.8 }}
                          />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground w-6 text-right shrink-0">{cnt}</span>
                      </div>
                    );
                  })}
                  {Object.keys(rarityDist).length === 0 && (
                    <p className="text-xs font-body text-muted-foreground/50 text-center py-4">Nenhuma carta no roster ainda</p>
                  )}
                </div>
              </div>

              {/* Guild info */}
              {myGuild && (
                <div className="border border-secondary/20 bg-secondary/5 p-4 flex items-center gap-4">
                  <span className="text-3xl">{myGuild.emblem}</span>
                  <div className="flex-1">
                    <p className="font-heading text-sm font-black text-foreground">{myGuild.name} <span className="text-secondary text-xs">[{myGuild.tag}]</span></p>
                    <p className="text-[10px] font-body text-muted-foreground mt-0.5">{myGuild.description || "Sem descrição"}</p>
                    <div className="flex gap-3 mt-1 text-[10px] font-mono">
                      <span className="text-muted-foreground">{myGuild.member_count} membros</span>
                      <span className="text-amber-400">{myGuild.total_wins} vitórias</span>
                      <span className={`${rankInfo.color} capitalize`}>{myMembership?.role}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════ ANALYTICS ═══════ */}
          {tab === "ANALYTICS" && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Radar: Role distribution */}
                <div className="border border-border/40 bg-card/30 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-secondary" />
                    <span className="font-heading text-xs font-black tracking-widest">DISTRIBUIÇÃO DE ROLES</span>
                  </div>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="role" tick={<CustomRadarTick />} />
                        <Radar
                          name="Cartas"
                          dataKey="count"
                          stroke="hsl(var(--secondary))"
                          fill="hsl(var(--secondary))"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-xs font-body text-muted-foreground/50">Sem dados de role</p>
                    </div>
                  )}
                </div>

                {/* Area: Win/Loss trend */}
                <div className="border border-border/40 bg-card/30 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="font-heading text-xs font-black tracking-widest">TENDÊNCIA DE BATALHAS</span>
                  </div>
                  {winTrend.length > 1 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={winTrend}>
                        <XAxis dataKey="x" hide />
                        <Tooltip
                          formatter={(v) => [v === 1 ? "Vitória" : "Derrota"]}
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 10, fontFamily: "var(--font-body)" }}
                        />
                        <defs>
                          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="result" stroke="hsl(var(--primary))" fill="url(#wGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-xs font-body text-muted-foreground/50">Jogue mais batalhas para ver a tendência</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "WIN RATE", value: `${winRate}%`, color: winRate >= 50 ? "text-green-400" : "text-red-400" },
                  { label: "TOTAL BATALHAS", value: totalBattles, color: "text-primary" },
                  { label: "CARTAS ÚNICAS", value: ownedUniqueIds.size, color: "text-secondary" },
                  { label: "CONTRIBUIÇÃO", value: myMembership?.contribution || 0, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="border border-border/40 bg-card/30 p-4 text-center">
                    <p className="text-[9px] font-heading tracking-widest text-muted-foreground mb-1">{label}</p>
                    <p className={`font-heading text-2xl font-black ${color} tabular-nums`}>{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════ BATALHAS ═══════ */}
          {tab === "BATALHAS" && (
            <motion.div key="batalhas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {myBattles.length === 0 ? (
                <div className="text-center py-16 border border-border/30 bg-card/20">
                  <Swords className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-body text-muted-foreground">Nenhuma batalha encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myBattles.map((log, i) => {
                    const isWin = log.winner_username === (player.username || user?.email);
                    return (
                      <motion.div
                        key={log.id || i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`border p-4 flex items-center gap-4 ${isWin ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}
                      >
                        <span className={`shrink-0 font-heading text-[10px] font-black px-3 py-1.5 ${isWin ? "text-green-400 bg-green-500/15 border border-green-500/30" : "text-red-400 bg-red-500/15 border border-red-500/30"}`}>
                          {isWin ? "WIN" : "LOSS"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-xs font-bold text-foreground">
                            vs <span className={isWin ? "text-red-400" : "text-green-400"}>{isWin ? log.loser_username : log.winner_username}</span>
                          </p>
                          {log.details && <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-1">{log.details}</p>}
                          {(log.winner_card || log.loser_card) && (
                            <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">
                              {isWin ? log.winner_card : log.loser_card} → {isWin ? log.loser_card : log.winner_card}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}