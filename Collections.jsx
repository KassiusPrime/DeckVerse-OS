import { db } from "@/base44Client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Layers, Search, X, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { Skeleton } from "@/skeleton";
import { Link } from "react-router-dom";
import Navbar from "@/Navbar";
import CardListItem from "@/CardListItem";
import { RARITY_ORDER, RARITY_ALIAS, ELEMENTS, ROLES } from "@/constants";

const GENDER_OPTIONS = ["Male","Female","Unknown","Other"];

function CollectionTile({ collection, cardCount, ownedCount, onClick, active }) {
  const pct = cardCount > 0 ? Math.round((ownedCount / cardCount) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative cursor-pointer border overflow-hidden transition-all duration-300 ${
        active ? "border-primary/60" : "border-border/30 hover:border-border/60"
      }`}
    >
      <div className="aspect-[16/7] relative">
        {collection.image_url
          ? <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-muted/20" />
        }
        <div className="absolute inset-0 bg-black/70" />
        {active && <div className="absolute inset-0 bg-primary/10" />}
      </div>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div>
          <span className="font-mono text-[10px] text-primary tracking-widest">{collection.code}</span>
          <h3 className="font-heading text-lg font-black text-white tracking-tight mt-0.5">{collection.name}</h3>
          {collection.description && (
            <p className="text-xs font-body text-white/50 mt-1 line-clamp-1">{collection.description}</p>
          )}
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-body mb-1">
            <span className="text-white/40">COMPLETAÇÃO</span>
            <span className="text-white/80 font-bold">{pct}% ({ownedCount}/{cardCount})</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${pct === 100 ? "bg-amber-400" : "bg-primary/70"}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PlaceholderCard({ card }) {
  return (
    <div className="border border-border/20 bg-card/30 overflow-hidden opacity-50">
      <div className="aspect-[3/4] bg-muted/10 flex items-center justify-center">
        <div className="text-center p-2">
          <Lock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
          <p className="font-heading text-[9px] text-muted-foreground/50 truncate">{card.name?.[0] || "?"}</p>
        </div>
      </div>
      <div className="p-2">
        <div className="h-3 bg-muted/20 rounded mb-1" />
        <div className="h-2 bg-muted/10 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function Collections() {
  const { user } = useAuth();
  const [rarityFilter, setRarityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => db.entities.Collection.list(),
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players-col"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-col"],
    queryFn: () => db.entities.Roster.list("-created_date", 300),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const myId = player?.discord_id || user?.email || "";

  const ownedCardIds = useMemo(() => {
    return new Set(rosterEntries.filter(r => r.player_discord_id === myId).map(r => r.card_id));
  }, [rosterEntries, myId]);

  const cardCountByCollection = useMemo(() => {
    const total = {}, owned = {};
    cards.forEach(c => {
      const key = c.series || "Other";
      total[key] = (total[key] || 0) + 1;
      if (ownedCardIds.has(c.id)) owned[key] = (owned[key] || 0) + 1;
    });
    return { total, owned };
  }, [cards, ownedCardIds]);

  const filteredCards = useMemo(() => {
    const normalizeRarity = (r) => RARITY_ALIAS[r] || r;
    return cards.filter((card) => {
      const matchesRarity   = rarityFilter === "all"   || normalizeRarity(card.rarity) === rarityFilter || card.rarity === rarityFilter;
      const matchesRole     = roleFilter === "all"     || card.role === roleFilter;
      const matchesElement  = elementFilter === "all"  || card.element === elementFilter;
      const matchesGender   = genderFilter === "all"   || card.gender === genderFilter;
      const matchesLevel    = levelFilter === "all"    ||
        (levelFilter === "owned" && ownedCardIds.has(card.id)) ||
        (levelFilter === "missing" && !ownedCardIds.has(card.id));
      const matchesSearch   = !searchQuery || card.name?.toLowerCase().includes(searchQuery.toLowerCase()) || card.series?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollection = !activeCollection || card.series === activeCollection.name;
      return matchesRarity && matchesRole && matchesElement && matchesGender && matchesLevel && matchesSearch && matchesCollection;
    });
  }, [cards, rarityFilter, roleFilter, elementFilter, genderFilter, levelFilter, searchQuery, activeCollection, ownedCardIds]);

  const hasActiveFilters = rarityFilter !== "all" || roleFilter !== "all" || elementFilter !== "all" || genderFilter !== "all" || levelFilter !== "all" || searchQuery || activeCollection;

  const clearAll = () => { setRarityFilter("all"); setRoleFilter("all"); setElementFilter("all"); setGenderFilter("all"); setLevelFilter("all"); setSearchQuery(""); setActiveCollection(null); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSearch={setSearchQuery} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-primary/20 bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">COLEÇÕES</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">{cards.length} CARTAS • {ownedCardIds.size} COLETADAS</p>
            </div>
          </div>
        </motion.div>

        {/* Collection Tiles */}
        {collections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {collections.map((col) => (
              <CollectionTile
                key={col.id}
                collection={col}
                cardCount={cardCountByCollection.total[col.name] || 0}
                ownedCount={cardCountByCollection.owned[col.name] || 0}
                onClick={() => setActiveCollection(prev => prev?.id === col.id ? null : col)}
                active={activeCollection?.id === col.id}
              />
            ))}
          </div>
        )}

        {/* Active collection filter */}
        {activeCollection && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-body text-muted-foreground">Filtrando por:</span>
            <span className="font-heading text-xs font-bold text-primary border border-primary/30 bg-primary/5 px-3 py-1">{activeCollection.name}</span>
            <button onClick={() => setActiveCollection(null)} className="text-xs font-body text-muted-foreground hover:text-foreground underline">Limpar</button>
          </div>
        )}

        {/* Search + Filters */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou coleção..."
                className="pl-9 h-9 w-full bg-muted/20 border border-border/50 font-body text-sm px-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors rounded-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 h-9 px-3 border font-heading text-xs font-bold transition-all ${showFilters ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
            >
              <Filter className="w-3.5 h-3.5" />
              FILTROS {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </button>
            {hasActiveFilters && (
              <button onClick={clearAll} className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground border border-border/40 px-2.5 h-9 transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            <span className="ml-auto text-xs font-body text-muted-foreground">{filteredCards.length} cartas</span>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {/* Rarity */}
                  <Select value={rarityFilter} onValueChange={setRarityFilter}>
                    <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Raridade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Raridades</SelectItem>
                      {RARITY_ORDER.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Role/Class */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Classe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Classes</SelectItem>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Element */}
                  <Select value={elementFilter} onValueChange={setElementFilter}>
                    <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Elemento" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Elementos</SelectItem>
                      {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Gender */}
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-32 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Gênero" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Gêneros</SelectItem>
                      {GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Owned */}
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Cartas</SelectItem>
                      <SelectItem value="owned">Coletadas</SelectItem>
                      <SelectItem value="missing">Não Coletadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="border border-border/40 bg-card/50 overflow-hidden">
                <Skeleton className="aspect-[3/4]" />
                <div className="p-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
              </div>
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-heading text-lg text-muted-foreground">Nenhuma carta encontrada</p>
            <p className="text-sm font-body text-muted-foreground/60 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCards.map((card, i) => {
              const isOwned = ownedCardIds.has(card.id);
              return isOwned || !user
                ? <CardListItem key={card.id} card={card} index={i} />
                : (
                  <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <PlaceholderCard card={card} />
                  </motion.div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
}