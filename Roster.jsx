import { db } from "@/base44Client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { motion } from "framer-motion";
import { Users, Search, Filter, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { Skeleton } from "@/skeleton";
import { Link } from "react-router-dom";
import Navbar from "@/Navbar";
import { RarityBadge, RoleBadge } from "@/RarityBadge";

export default function Roster() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: () => db.entities.Card.list("-created_date", 200),
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster"],
    queryFn: () => db.entities.Roster.list(),
  });

  // Merge roster entries with card data
  const rosterCards = useMemo(() => {
    return rosterEntries.map((entry) => {
      const card = cards.find((c) => c.id === entry.card_id);
      return { ...entry, card };
    }).filter((e) => e.card && e.card.status !== "quarantine" && e.card.status !== "rejected");
  }, [rosterEntries, cards]);

  const filteredCards = useMemo(() => {
    return rosterCards.filter((entry) => {
      const card = entry.card;
      const matchesSearch = !searchQuery || card.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === "all" || card.rarity === rarityFilter;
      const matchesRole = roleFilter === "all" || card.role === roleFilter;
      return matchesSearch && matchesRarity && matchesRole;
    });
  }, [rosterCards, searchQuery, rarityFilter, roleFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-secondary/20 bg-secondary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">MY ROSTER</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">{rosterCards.length} CARDS IN COLLECTION</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search card..."
              className="pl-9 h-9 w-full bg-muted/20 border border-border/50 font-body text-sm px-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors rounded-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger className="w-36 bg-muted/20 border-border/50 font-body text-sm">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 bg-muted/20 border-border/50 font-body text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {["DPS", "Tank", "Support", "Healer", "Assassin", "Mage"].map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs font-body text-muted-foreground">{filteredCards.length} cards</span>
        </div>

        {/* Grid */}
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
            <p className="font-heading text-lg text-muted-foreground">No cards in roster</p>
            <p className="text-sm font-body text-muted-foreground/60 mt-1">Pull cards from the Gacha to fill your roster</p>
            <Link to="/gacha" className="inline-block mt-4 px-4 py-2 border border-primary/30 bg-primary/5 text-primary font-heading text-xs tracking-wider hover:bg-primary/10 transition-colors">
              GO TO GACHA →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCards.map((entry, i) => {
              const card = entry.card;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/card/${card.id}`} className="group block">
                    <div className="relative border border-border/40 bg-card/60 overflow-hidden hover:border-primary/40 transition-all duration-300">
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {card.image_url ? (
                          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <span className="text-4xl font-heading font-black text-muted-foreground/20">{card.name?.[0]}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        {/* Level badge */}
                        {entry.level > 1 && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-accent/90 text-accent-foreground px-1.5 py-0.5 text-[10px] font-heading font-bold">
                            <Star className="w-2.5 h-2.5" /> LV{entry.level}
                          </div>
                        )}
                        {/* Copies badge */}
                        {entry.copies > 1 && (
                          <div className="absolute top-2 left-2 bg-muted/80 text-foreground px-1.5 py-0.5 text-[10px] font-heading font-bold">
                            x{entry.copies}
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 p-3">
                          <p className="font-heading text-sm font-black text-white truncate">{card.name}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <RarityBadge rarity={card.rarity} />
                            <RoleBadge role={card.role} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}