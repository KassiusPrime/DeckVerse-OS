const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Star, Tag } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { RarityBadge, RoleBadge } from "@/components/wiki/RarityBadge";
import { calcTagSynergies } from "@/lib/tagSynergies";

const MAX_TEAM = 5;
const MAX_COST = 25; // Team Cost cap at player level 1

// Team cost per rarity
const RARITY_COST = {
  C:1, UC:2, R:3, SR:4, SSR:5, UR:8, LR:12, MR:16, BOSS:20, ANOMALIA:15,
  // legacy
  Recruit:1, Adept:2, Elite:3, Champion:5, Sovereign:8, Ascendant:12, Divine:18,
  Common:1, Uncommon:2, Rare:3, Epic:5, Legendary:8, Mythic:12,
};

const RARITY_PWR = {
  C:1, UC:1.3, R:1.7, SR:2.0, SSR:2.5, UR:3.2, LR:4.2, MR:5.5, BOSS:8.0, ANOMALIA:6.5,
  // legacy
  Recruit:1, Adept:1.3, Elite:1.7, Champion:2.2, Sovereign:3.0, Ascendant:4.0, Divine:6.0,
  Common:1, Uncommon:1.3, Rare:1.7, Epic:2.2, Legendary:3.0, Mythic:4.0,
};

const ROLE_SYNERGIES = {
  "DPS+DPS": { name: "Double Strike", bonus: "+15% ATQ para ambos os DPS", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  "Tank+Healer": { name: "Iron Fortress", bonus: "+20% DEF do Tank, +10% cura", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  "Tank+Support": { name: "Vanguarda Protegida", bonus: "Tank absorve 20% do dano da equipa", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  "Assassin+Support": { name: "Sombra Guiada", bonus: "Assassin ganha +25% velocidade de ataque", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
  "Mage+Support": { name: "Amplificação Mágica", bonus: "+20% dano mágico do Mage", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  "DPS+Assassin": { name: "Combo Letal", bonus: "Primeiro ataque causa +30% dano crítico", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
};

const ELEMENT_SYNERGIES = {
  "Fire+Wind": { name: "Tempestade de Fogo", bonus: "+25% dano em área", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  "Water+Lightning": { name: "Condutividade", bonus: "Ataques elétricos ignoram 15% DEF molhada", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  "Shadow+Shadow": { name: "Véu das Trevas", bonus: "Toda a equipa ganha Furtividade no T1", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  "Light+Light": { name: "Radiância Sagrada", bonus: "Imunidade a medo e controlo mental", color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-500/30" },
  "Earth+Earth": { name: "Raízes Antigas", bonus: "+30% HP base de toda a equipa", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  "Fire+Fire": { name: "Inferno Total", bonus: "Dano de fogo aplica DoT automático", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

function calcSynergies(team) {
  const found = [];
  const roles = team.map(c => c.role);
  const elements = team.map(c => c.element).filter(Boolean);

  // Role synergies (pairs)
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const key1 = `${roles[i]}+${roles[j]}`;
      const key2 = `${roles[j]}+${roles[i]}`;
      if (ROLE_SYNERGIES[key1]) found.push({ ...ROLE_SYNERGIES[key1], type: "role" });
      else if (ROLE_SYNERGIES[key2]) found.push({ ...ROLE_SYNERGIES[key2], type: "role" });
    }
  }

  // Element synergies (pairs)
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const key1 = `${elements[i]}+${elements[j]}`;
      const key2 = `${elements[j]}+${elements[i]}`;
      if (ELEMENT_SYNERGIES[key1] && !found.find(f => f.name === ELEMENT_SYNERGIES[key1].name)) {
        found.push({ ...ELEMENT_SYNERGIES[key1], type: "element" });
      } else if (ELEMENT_SYNERGIES[key2] && !found.find(f => f.name === ELEMENT_SYNERGIES[key2].name)) {
        found.push({ ...ELEMENT_SYNERGIES[key2], type: "element" });
      }
      // Same element doubles
      if (elements[i] === elements[j]) {
        const key = `${elements[i]}+${elements[i]}`;
        if (ELEMENT_SYNERGIES[key] && !found.find(f => f.name === ELEMENT_SYNERGIES[key].name)) {
          found.push({ ...ELEMENT_SYNERGIES[key], type: "element" });
        }
      }
    }
  }

  return found;
}

function calcTeamStats(team) {
  return {
    atq: team.reduce((s, c) => s + (c.attack || 0), 0),
    def: team.reduce((s, c) => s + (c.defense || 0), 0),
    spd: team.reduce((s, c) => s + (c.speed || 0), 0),
    hp: team.reduce((s, c) => s + (c.hp || 0), 0),
    mag: team.reduce((s, c) => s + (c.hp ? Math.round(c.hp * 0.4) : 0), 0),
  };
}

function calcTeamCost(team) {
  return team.reduce((s, c) => {
    const tier = c.rarity;
    return s + (RARITY_COST[tier] || 3);
  }, 0);
}

function calcPWR(team, synCount) {
  const baseStats = team.reduce((s, c) => {
    const mul = RARITY_PWR[c.rarity] || 1;
    return s + ((c.attack || 0) + (c.defense || 0) + (c.speed || 0) + (c.hp || 0)) * mul;
  }, 0);
  // Synergy bonus
  const synBonus = synCount >= 5 ? 1.5 : synCount >= 3 ? 1.3 : synCount >= 2 ? 1.15 : 1.0;
  return Math.round(baseStats * synBonus);
}

// Synergy tier label
function getSynergyTier(synCount) {
  if (synCount >= 5) return { label: "RESSONÂNCIA MESTRA", color: "text-sky-300", emoji: "⚡" };
  if (synCount >= 3) return { label: "TRIO LINK", color: "text-purple-400", emoji: "💫" };
  if (synCount >= 2) return { label: "DUO LINK", color: "text-blue-400", emoji: "🔗" };
  return null;
}

export default function SynergyBuilder() {
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards-synergy"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const filtered = useMemo(() => cards.filter(c => {
    const matchName = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || c.role === roleFilter;
    return matchName && matchRole;
  }), [cards, search, roleFilter]);

  const roleSynergies = useMemo(() => calcSynergies(team), [team]);
  const tagSynergies = useMemo(() => calcTagSynergies(team), [team]);
  const synergies = useMemo(() => [...roleSynergies, ...tagSynergies], [roleSynergies, tagSynergies]);
  const stats = useMemo(() => calcTeamStats(team), [team]);
  const teamCost = useMemo(() => calcTeamCost(team), [team]);
  const pwr = useMemo(() => calcPWR(team, synergies.length), [team, synergies]);
  const synTier = useMemo(() => getSynergyTier(synergies.length), [synergies]);
  const isCostOverflow = teamCost > MAX_COST;

  const addCard = (card) => {
    if (team.length >= MAX_TEAM || team.find(c => c.id === card.id)) return;
    setTeam(p => [...p, card]);
  };

  const removeCard = (id) => setTeam(p => p.filter(c => c.id !== id));

  const RARITY_ORDER = { Mythic: 6, Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-secondary/30 bg-secondary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">SYNERGY BUILDER</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">MONTE SUA EQUIPA E DESCUBRA SINERGIAS</p>
              </div>
            </div>
            {/* PWR Display */}
            {team.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="border border-primary/30 bg-primary/5 px-4 py-2 text-center">
                  <p className="text-[10px] font-heading text-muted-foreground tracking-widest">PWR TOTAL</p>
                  <p className="font-heading text-xl font-black text-primary tabular-nums">{pwr.toLocaleString()}</p>
                </div>
                <div className={`border px-4 py-2 text-center ${isCostOverflow ? "border-destructive/60 bg-destructive/10 animate-pulse" : "border-border/40 bg-card/30"}`}>
                  <p className="text-[10px] font-heading text-muted-foreground tracking-widest">TEAM COST</p>
                  <p className={`font-heading text-xl font-black tabular-nums ${isCostOverflow ? "text-destructive" : "text-foreground"}`}>{teamCost}/{MAX_COST}</p>
                </div>
              </div>
            )}
          </div>
          {/* Cost overflow warning */}
          {isCostOverflow && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-4 py-2">
              <span className="text-destructive text-xs font-mono font-bold">&gt; ERRO: Sobrecarga de Sistema. Reduza o Custo da Equipe.</span>
            </motion.div>
          )}
          {/* Synergy tier banner */}
          {synTier && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-2">
              <span className="text-lg">{synTier.emoji}</span>
              <span className={`font-heading text-xs font-black tracking-widest ${synTier.color}`}>{synTier.label} ATIVO</span>
              <span className="font-mono text-[10px] text-muted-foreground ml-auto">
                {synergies.length >= 5 ? "+50% PWR" : synergies.length >= 3 ? "+30% PWR" : "+15% PWR"}
              </span>
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Team Slots + Synergies */}
          <div className="lg:col-span-1 space-y-4">
            {/* Team slots */}
            <div className="border border-border/40 bg-card/30 p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading text-[10px] tracking-widest text-muted-foreground">EQUIPA ({team.length}/{MAX_TEAM})</span>
                {team.length > 0 && (
                  <button onClick={() => setTeam([])} className="text-[10px] font-heading text-destructive/60 hover:text-destructive">LIMPAR</button>
                )}
              </div>
              {Array(MAX_TEAM).fill(0).map((_, i) => {
                const card = team[i];
                return (
                  <div key={i} className={`h-14 border flex items-center px-3 transition-all ${card ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/10 border-dashed"}`}>
                    {card ? (
                      <div className="flex items-center gap-3 w-full">
                        {(card.img_custom || card.img_oficial || card.image_url) ? (
                          <img src={card.img_custom || card.img_oficial || card.image_url} alt={card.name} className="w-8 h-10 object-cover" />
                        ) : (
                          <div className="w-8 h-10 bg-muted/30 flex items-center justify-center">
                            <Star className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-xs font-bold text-foreground truncate">{card.name}</p>
                          <p className="text-[10px] font-body text-muted-foreground">{card.role} · {card.rarity}</p>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground border border-border/30 px-1 shrink-0">{RARITY_COST[card.rarity] || 3}PT</span>
                        <button onClick={() => removeCard(card.id)} className="text-destructive/50 hover:text-destructive p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-heading text-muted-foreground/40 tracking-widest">SLOT {i + 1} — VAZIO</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Team Stats */}
            {team.length > 0 && (
              <div className="border border-border/40 bg-card/30 p-4">
                <span className="font-heading text-[10px] tracking-widest text-muted-foreground block mb-3">ESTATÍSTICAS DA EQUIPA</span>
                {[
                  { label: "ATQ TOTAL", val: stats.atq, color: "bg-red-500" },
                  { label: "DEF TOTAL", val: stats.def, color: "bg-blue-500" },
                  { label: "VEL TOTAL", val: stats.spd, color: "bg-yellow-500" },
                  { label: "HP TOTAL",  val: stats.hp,  color: "bg-green-500" },
                  { label: "MAG TOTAL", val: stats.mag, color: "bg-purple-500" },
                ].map(s => (
                  <div key={s.label} className="mb-2">
                    <div className="flex justify-between text-[10px] font-heading mb-1">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="text-foreground tabular-nums">{s.val.toLocaleString()}</span>
                    </div>
                    <div className="h-1 bg-muted/30">
                      <div className={`h-full ${s.color}`} style={{ width: `${Math.min((s.val / (MAX_TEAM * 10000)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tag cloud */}
            {team.length > 0 && (() => {
              const allTags = [...new Set(team.flatMap(c => c.tags || []))];
              return allTags.length > 0 ? (
                <div className="border border-border/40 bg-card/30 p-3">
                  <span className="font-heading text-[10px] tracking-widest text-muted-foreground block mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> TAGS DA EQUIPE
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {allTags.map(tag => {
                      const count = team.filter(c => (c.tags || []).includes(tag)).length;
                      return (
                        <span key={tag} className={`text-[9px] font-heading font-bold px-2 py-0.5 border rounded-full ${count >= 3 ? "border-primary/60 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"}`}>
                          #{tag} ×{count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Synergies */}
            <div className="border border-border/40 bg-card/30 p-4">
              <span className="font-heading text-[10px] tracking-widest text-muted-foreground block mb-3">SINERGIAS ATIVAS ({synergies.length})</span>
              {synergies.length === 0 ? (
                <p className="text-xs font-body text-muted-foreground/50 italic">Adicione cartas para descobrir sinergias...</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {synergies.map((syn, i) => (
                      <motion.div key={`${syn.name}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}
                        className={`border p-2.5 ${syn.bg}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          {syn.type === "tag" ? <Tag className={`w-3 h-3 ${syn.color}`} /> : <Zap className={`w-3 h-3 ${syn.color}`} />}
                          <span className={`font-heading text-xs font-bold ${syn.color}`}>{syn.name}</span>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {syn.type === "tag" ? `TAG:${syn.tag} ×${syn.count}` : syn.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] font-body text-muted-foreground">{syn.bonus}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Card Pool */}
          <div className="lg:col-span-2">
            <div className="border border-border/40 bg-card/30 p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar carta..."
                  className="flex-1 min-w-40 px-3 py-1.5 bg-muted/30 border border-border/50 text-sm font-body focus:outline-none focus:border-primary/50"
                />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-muted/30 border border-border/50 text-sm font-body text-foreground focus:outline-none">
                  <option value="all">Todos os Roles</option>
                  {["DPS","Tank","Support","Healer","Assassin","Mage"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {isLoading ? (
                <div className="text-center py-10 text-muted-foreground font-body text-sm">A carregar cartas...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto pr-1">
                  {[...filtered].sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0)).map(card => {
                    const inTeam = !!team.find(c => c.id === card.id);
                    const full = team.length >= MAX_TEAM;
                    return (
                      <motion.button key={card.id} onClick={() => addCard(card)} disabled={inTeam || full}
                        className={`relative border text-left p-2 transition-all hover:border-primary/40 ${inTeam ? "border-primary/60 bg-primary/10 opacity-70" : full ? "opacity-40 cursor-not-allowed border-border/20" : "border-border/30 bg-muted/10 hover:bg-muted/20"}`}
                        whileHover={!inTeam && !full ? { scale: 1.02 } : {}}>
                        <div className="aspect-[3/4] mb-2 overflow-hidden bg-muted/20">
                          {(card.img_custom || card.img_oficial || card.image_url) ? (
                            <img src={card.img_custom || card.img_oficial || card.image_url} alt={card.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Star className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <p className="font-heading text-[10px] font-bold text-foreground truncate">{card.name}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">{card.role} · {card.element || "—"}</p>
                        {inTeam && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}