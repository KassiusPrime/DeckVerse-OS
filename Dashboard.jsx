import { db } from "@/deckverseClient";

import React from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion } from "framer-motion";
import { BarChart2, Users, Layers, Swords, Gem, TrendingUp, Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/Navbar";
import { RARITY_ORDER, RARITY_ALIAS } from "@/constants";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

function StatTile({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <div className="border border-border/40 bg-card/40 p-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`font-heading text-2xl font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] font-body text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: cards = [] } = useQuery({
    queryKey: ["dash-cards"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["dash-players"],
    queryFn: () => db.entities.Player.list(),
  });

  const { data: battles = [] } = useQuery({
    queryKey: ["dash-battles"],
    queryFn: () => db.entities.BattleLog.list("-created_date", 100),
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["dash-roster"],
    queryFn: () => db.entities.Roster.list("-created_date", 500),
  });

  // Rarity distribution
  const rarityDist = RARITY_ORDER.map(r => {
    const count = cards.filter(c => (RARITY_ALIAS[c.rarity] || c.rarity) === r || c.rarity === r).length;
    return { rarity: r, count };
  }).filter(d => d.count > 0);

  // Role distribution
  const roles = ["DPS","Tank","Support","Healer","Assassin","Mage"];
  const roleDist = roles.map(r => ({
    role: r,
    count: cards.filter(c => c.role === r).length,
  })).filter(d => d.count > 0);

  // Economy radar
  const topPlayer = players.reduce((best, p) => p.gems > (best?.gems || 0) ? p : best, null);
  const avgGems = players.length ? Math.round(players.reduce((s, p) => s + (p.gems || 0), 0) / players.length) : 0;

  const radarData = [
    { stat: "Cards", value: Math.min(cards.length, 200) },
    { stat: "Players", value: Math.min(players.length * 10, 200) },
    { stat: "Battles", value: Math.min(battles.length * 5, 200) },
    { stat: "Roster", value: Math.min(roster.length, 200) },
    { stat: "Gem Avg", value: Math.min(avgGems / 50, 200) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-primary/30 bg-primary/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">DASHBOARD</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">TELEMETRIA DO SISTEMA — DADOS EM TEMPO REAL</p>
            </div>
          </div>
        </motion.div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatTile icon={Layers} label="TOTAL CARTAS"   value={cards.length}   sub="no banco de dados"    color="text-primary" />
          <StatTile icon={Users}  label="JOGADORES"      value={players.length} sub="registrados"          color="text-secondary" />
          <StatTile icon={Swords} label="BATALHAS"       value={battles.length} sub="registradas"          color="text-destructive" />
          <StatTile icon={Gem}    label="MÉDIA GEM"      value={avgGems.toLocaleString()} sub="por jogador" color="text-accent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Rarity bar chart */}
          <div className="lg:col-span-2 border border-border/40 bg-card/30 p-5">
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-4">— DISTRIBUIÇÃO DE RARIDADE</h3>
            {rarityDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rarityDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="rarity" tick={{ fontSize: 9, fontFamily: "var(--font-heading)", fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "var(--font-body)" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs font-body text-muted-foreground">
                Nenhuma carta cadastrada ainda.
              </div>
            )}
          </div>

          {/* Radar */}
          <div className="border border-border/40 bg-card/30 p-5">
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-4">— SAÚDE DO SISTEMA</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fontFamily: "var(--font-heading)", fill: "hsl(var(--muted-foreground))" }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role distribution + top player */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border/40 bg-card/30 p-5">
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-4">— CARTAS POR ROLE</h3>
            <div className="space-y-2">
              {roleDist.map(({ role, count }) => {
                const pct = cards.length > 0 ? Math.round((count / cards.length) * 100) : 0;
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="font-heading text-[10px] text-muted-foreground w-20 shrink-0">{role}</span>
                    <div className="flex-1 h-1.5 bg-muted/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-primary/60"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
              {roleDist.length === 0 && <p className="text-xs font-body text-muted-foreground text-center py-4">Sem dados</p>}
            </div>
          </div>

          <div className="border border-border/40 bg-card/30 p-5 space-y-4">
            <h3 className="font-heading text-xs font-bold tracking-widest text-muted-foreground">— TOP PLAYERS</h3>
            {players
              .sort((a, b) => (b.gems || 0) - (a.gems || 0))
              .slice(0, 6)
              .map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="font-heading text-[10px] text-muted-foreground w-4 tabular-nums">{i + 1}.</span>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.username} className="w-6 h-6 object-cover border border-border/30 rounded-full shrink-0" />
                    : <div className="w-6 h-6 bg-muted/30 border border-border/30 rounded-full shrink-0 flex items-center justify-center"><span className="text-[9px] text-muted-foreground">{p.username?.[0]}</span></div>
                  }
                  <span className="font-body text-xs text-foreground flex-1 truncate">{p.username}</span>
                  <span className="font-mono text-[10px] text-primary tabular-nums">{(p.gems || 0).toLocaleString()} 💎</span>
                </div>
              ))}
            {players.length === 0 && <p className="text-xs font-body text-muted-foreground text-center py-4">Sem jogadores</p>}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/admin" className="flex items-center gap-1.5 px-4 py-2 border border-primary/30 bg-primary/5 text-xs font-heading text-primary hover:bg-primary/10 transition-colors">
            <Star className="w-3 h-3" /> ADMIN PANEL
          </Link>
          <Link to="/collections" className="flex items-center gap-1.5 px-4 py-2 border border-border/40 text-xs font-heading text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
            <Layers className="w-3 h-3" /> COLEÇÕES
          </Link>
          <Link to="/leaderboard" className="flex items-center gap-1.5 px-4 py-2 border border-border/40 text-xs font-heading text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
            <Crown className="w-3 h-3" /> LEADERBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}