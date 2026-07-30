const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Trophy, Search, Plus, X, Crown, Star, Swords, TrendingUp, RefreshCw } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

const EMBLEMS = ["⚔️","🔥","💧","🌪️","⚡","🌑","✨","🐉","🦅","🌙","👑","💎","🏹","🛡️","⚗️","🌊"];

export default function Guilds() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", description: "", emblem: "⚔️" });

  const { data: guilds = [] } = useQuery({
    queryKey: ["guilds"],
    queryFn: () => db.entities.Guild.list("-created_date", 50),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["guild-members"],
    queryFn: () => db.entities.GuildMember.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-guilds"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;

  const myMembership = members.find(m =>
    m.player_discord_id === (player?.discord_id || user?.email)
  );

  const myGuild = myMembership ? guilds.find(g => g.id === myMembership.guild_id) : null;

  const guildMembersMap = useMemo(() => {
    const map = {};
    members.forEach(m => {
      if (!map[m.guild_id]) map[m.guild_id] = [];
      map[m.guild_id].push(m);
    });
    return map;
  }, [members]);

  const filteredGuilds = useMemo(() => {
    return guilds.filter(g =>
      !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [guilds, searchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const guild = await db.entities.Guild.create({
        ...data,
        leader_discord_id: player?.discord_id || user?.email || "unknown",
        leader_username: player?.username || user?.email || "Unknown",
        member_count: 1,
        total_wins: 0,
      });
      await db.entities.GuildMember.create({
        guild_id: guild.id,
        guild_name: data.name,
        player_discord_id: player?.discord_id || user?.email || "unknown",
        player_username: player?.username || user?.email || "Unknown",
        role: "leader",
        contribution: 0,
      });
      return guild;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guilds"] });
      qc.invalidateQueries({ queryKey: ["guild-members"] });
      setShowCreate(false);
      setForm({ name: "", tag: "", description: "", emblem: "⚔️" });
      toast({ title: lang === "pt" ? "Guilda criada!" : lang === "es" ? "¡Gremio creado!" : "Guild created!" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (guild) => {
      await db.entities.GuildMember.create({
        guild_id: guild.id,
        guild_name: guild.name,
        player_discord_id: player?.discord_id || user?.email || "unknown",
        player_username: player?.username || user?.email || "Unknown",
        role: "member",
        contribution: 0,
      });
      await db.entities.Guild.update(guild.id, {
        member_count: (guild.member_count || 1) + 1,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guilds"] });
      qc.invalidateQueries({ queryKey: ["guild-members"] });
      toast({ title: lang === "pt" ? "Você entrou na guilda!" : lang === "es" ? "¡Te uniste al gremio!" : "You joined the guild!" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!myMembership) return;
      await db.entities.GuildMember.delete(myMembership.id);
      if (myGuild) {
        await db.entities.Guild.update(myGuild.id, {
          member_count: Math.max(0, (myGuild.member_count || 1) - 1),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guilds"] });
      qc.invalidateQueries({ queryKey: ["guild-members"] });
    },
  });

  // Guild PVE Battle — simulate raid and award wins to guild
  const [raiding, setRaiding] = useState(false);
  const [raidResult, setRaidResult] = useState(null);

  const RAID_BOSSES = [
    { name: "Colosso das Ruínas", hp: 1000, attack: 80, element: "Earth", emoji: "🪨" },
    { name: "Dragão Abissal", hp: 1500, attack: 120, element: "Shadow", emoji: "🌑" },
    { name: "Titã da Tempestade", hp: 2000, attack: 150, element: "Lightning", emoji: "⚡" },
  ];

  const handleGuildRaid = async () => {
    if (!myGuild || !player) return;
    setRaiding(true);
    setRaidResult(null);
    await new Promise(r => setTimeout(r, 1500));
    const boss = RAID_BOSSES[Math.floor(Math.random() * RAID_BOSSES.length)];
    const memberCount = guildMembersMap[myGuild.id]?.length || 1;
    const totalDmg = memberCount * (50 + Math.random() * 100) * (player.wins || 1);
    const won = totalDmg >= boss.hp;
    if (won) {
      await db.entities.Guild.update(myGuild.id, { total_wins: (myGuild.total_wins || 0) + 1 });
      await db.entities.GuildMember.update(myMembership.id, {
        contribution: (myMembership.contribution || 0) + 10,
      });
      qc.invalidateQueries({ queryKey: ["guilds"] });
      qc.invalidateQueries({ queryKey: ["guild-members"] });
    }
    setRaidResult({ won, boss, totalDmg: Math.round(totalDmg), memberCount });
    setRaiding(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-secondary/30 bg-secondary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">{t("guilds_title")}</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">{t("guilds_subtitle")}</p>
              </div>
            </div>
            {!myGuild && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-heading text-xs font-bold tracking-widest hover:bg-secondary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {t("guilds_create")}
              </button>
            )}
          </div>
        </motion.div>

        {/* My Guild */}
        {myGuild && (
          <div className="mb-8 border border-secondary/30 bg-secondary/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-secondary" />
              <span className="font-heading text-xs font-bold tracking-widest text-secondary">{t("guilds_my_guild")}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-4xl">{myGuild.emblem || "⚔️"}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-black text-foreground">{myGuild.name}</h2>
                  <span className="font-mono text-xs text-secondary border border-secondary/30 px-1.5 py-0.5">[{myGuild.tag}]</span>
                </div>
                <p className="text-sm font-body text-muted-foreground mt-0.5">{myGuild.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                    <Users className="w-3 h-3" /> {guildMembersMap[myGuild.id]?.length || 1} {t("guilds_members")}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                    <Trophy className="w-3 h-3" /> {myGuild.total_wins || 0} wins
                  </span>
                  <span className="flex items-center gap-1 text-xs font-heading text-secondary">
                    {myMembership?.role === "leader" ? <Crown className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                    {myMembership?.role}
                  </span>
                </div>
              </div>
              {myMembership?.role !== "leader" && (
                <button
                  onClick={() => leaveMutation.mutate()}
                  className="text-xs font-heading text-destructive border border-destructive/30 px-3 py-1.5 hover:bg-destructive/10 transition-colors"
                >
                  SAIR
                </button>
              )}
            </div>

            {/* Members list */}
            <div className="mt-4 border-t border-border/30 pt-4">
              <p className="text-[10px] font-heading tracking-widest text-muted-foreground mb-2">MEMBROS</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {(guildMembersMap[myGuild.id] || []).map(m => (
                  <div key={m.id} className="flex items-center gap-2 border border-border/30 bg-card/30 px-2.5 py-1.5">
                    {m.role === "leader" && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="text-xs font-body text-foreground truncate">{m.player_username}</span>
                    {m.contribution > 0 && (
                      <span className="ml-auto text-[9px] font-mono text-amber-400/70">{m.contribution}pt</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Guild Raid */}
              <div className="border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-heading text-xs font-bold text-destructive">⚔ RAID DE GUILDA</p>
                    <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                      Todos os membros atacam um Boss coletivamente
                    </p>
                  </div>
                  <button
                    onClick={handleGuildRaid}
                    disabled={raiding}
                    className="flex items-center gap-1.5 px-4 py-2 bg-destructive text-destructive-foreground font-heading text-[10px] font-bold hover:bg-destructive/80 transition-colors disabled:opacity-50"
                  >
                    {raiding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Swords className="w-3.5 h-3.5" />}
                    {raiding ? "RAIDING..." : "INICIAR RAID"}
                  </button>
                </div>

                <AnimatePresence>
                  {raidResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`border p-3 ${raidResult.won ? "border-green-500/40 bg-green-500/5" : "border-destructive/40 bg-destructive/5"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{raidResult.boss.emoji}</span>
                        <span className={`font-heading text-xs font-bold ${raidResult.won ? "text-green-400" : "text-destructive"}`}>
                          {raidResult.won ? "BOSS DERROTADO!" : "RAID FALHOU"} — {raidResult.boss.name}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {raidResult.memberCount} membros · {raidResult.totalDmg} dano total
                        {raidResult.won ? " · +1 vitória de guilda · +10pt contribuição" : ""}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("guilds_search")}
              className="pl-9 h-9 bg-muted/20 border-border/50 font-body text-sm"
            />
          </div>
          <span className="text-xs font-body text-muted-foreground">{filteredGuilds.length} guildas</span>
        </div>

        {/* Guilds Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuilds.map((guild, i) => {
            const memberList = guildMembersMap[guild.id] || [];
            const isMyGuild = myGuild?.id === guild.id;
            return (
              <motion.div
                key={guild.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border p-4 ${isMyGuild ? "border-secondary/40 bg-secondary/5" : "border-border/40 bg-card/40 hover:border-border/70"} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{guild.emblem || "⚔️"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-heading text-sm font-black text-foreground truncate">{guild.name}</h3>
                      <span className="font-mono text-[10px] text-secondary border border-secondary/30 px-1 py-0.5">[{guild.tag}]</span>
                    </div>
                    <p className="text-[11px] font-body text-muted-foreground mt-0.5 line-clamp-2">{guild.description || "—"}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                        <Users className="w-3 h-3" /> {memberList.length || guild.member_count || 1}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                        <Swords className="w-3 h-3" /> {guild.total_wins || 0}
                      </span>
                      <span className="text-[10px] font-body text-muted-foreground">by {guild.leader_username}</span>
                    </div>
                  </div>
                </div>
                {!myGuild && !isMyGuild && (
                  <button
                    onClick={() => joinMutation.mutate(guild)}
                    disabled={joinMutation.isPending}
                    className="w-full mt-3 py-1.5 border border-secondary/30 text-secondary font-heading text-[10px] font-bold hover:bg-secondary/10 transition-colors disabled:opacity-50"
                  >
                    {t("guilds_join")}
                  </button>
                )}
                {isMyGuild && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-heading text-secondary">
                    <Crown className="w-3 h-3" /> {t("guilds_my_guild")}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {guilds.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-heading text-sm text-muted-foreground">Nenhuma guilda ainda. Seja o primeiro!</p>
          </div>
        )}

        {/* Guild Rankings */}
        {guilds.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground">RANKING DE GUILDAS</h2>
            </div>
            <div className="space-y-2">
              {[...guilds].sort((a, b) => (b.total_wins || 0) - (a.total_wins || 0)).slice(0, 10).map((guild, i) => (
                <div key={guild.id} className={`flex items-center gap-3 border px-4 py-2.5 ${myGuild?.id === guild.id ? "border-secondary/40 bg-secondary/5" : "border-border/30 bg-card/30"}`}>
                  <span className={`font-heading text-sm font-black w-6 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className="text-xl">{guild.emblem || "⚔️"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading text-xs font-bold text-foreground">{guild.name}</span>
                    <span className="font-mono text-[10px] text-secondary ml-2">[{guild.tag}]</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                    <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" /> {guild.member_count || 1}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold"><Trophy className="w-3 h-3" /> {guild.total_wins || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Guild Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-black tracking-widest">{t("guilds_create")}</h2>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-1">{t("guilds_name")}</label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-muted/20 border-border/50 font-body" placeholder="Shadow Legion" />
                </div>
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-1">{t("guilds_tag")}</label>
                  <Input value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value.toUpperCase().slice(0, 3) }))} className="bg-muted/20 border-border/50 font-mono w-24" placeholder="SLG" maxLength={3} />
                </div>
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-1">{t("guilds_description")}</label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-muted/20 border-border/50 font-body" placeholder="Uma guilda de guerreiros das sombras..." />
                </div>
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-2">EMBLEMA</label>
                  <div className="grid grid-cols-8 gap-1">
                    {EMBLEMS.map(em => (
                      <button
                        key={em}
                        onClick={() => setForm(p => ({ ...p, emblem: em }))}
                        className={`text-lg w-9 h-9 flex items-center justify-center border transition-all ${form.emblem === em ? "border-primary/60 bg-primary/10" : "border-border/30 hover:border-border/60"}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.tag || createMutation.isPending}
                className="w-full py-2.5 bg-secondary text-secondary-foreground font-heading text-xs font-bold tracking-widest hover:bg-secondary/80 transition-colors disabled:opacity-40"
              >
                {createMutation.isPending ? "..." : t("guilds_create")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}