import { db } from "@/base44Client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion } from "framer-motion";
import { Package, Filter, Search, X, Sword, Shield, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/Navbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/use-toast";

const ITEM_RARITY_COLOR = {
  Recruit:   "text-zinc-400   border-zinc-500/30   bg-zinc-500/5",
  Adept:     "text-green-400  border-green-500/30  bg-green-500/5",
  Elite:     "text-blue-400   border-blue-500/30   bg-blue-500/5",
  Champion:  "text-purple-400 border-purple-500/30 bg-purple-500/5",
  Sovereign: "text-amber-400  border-amber-500/40  bg-amber-500/5",
  Ascendant: "text-red-400    border-red-500/40    bg-red-500/5",
};

const ITEM_TYPES = ["Weapon","Armor","Relic","Accessory","Consumable"];

function StatBadge({ icon: Icon, value, color }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-bold ${color}`}>
      <Icon className="w-2.5 h-2.5" />+{value}
    </span>
  );
}

function ItemCard({ playerItem, item, onEquip, onUnequip }) {
  const rarityClass = ITEM_RARITY_COLOR[item?.rarity] || "text-zinc-400 border-zinc-500/30 bg-zinc-500/5";
  const isEquipped = !!playerItem.equipped_to_roster_id;

  return (
    <div className={`border ${rarityClass} p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            {item?.icon && <span>{item.icon}</span>}
            <span className="font-heading text-xs font-bold text-foreground">{playerItem.item_name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] font-heading font-bold px-1 border ${rarityClass}`}>{item?.rarity || "?"}</span>
            <span className="text-[9px] font-body text-muted-foreground">{item?.type}</span>
          </div>
        </div>
        {playerItem.quantity > 1 && (
          <span className="text-[9px] font-mono text-muted-foreground border border-border/30 px-1">x{playerItem.quantity}</span>
        )}
      </div>

      {item && (
        <div className="flex flex-wrap gap-2">
          <StatBadge icon={Sword}  value={item.atk_bonus} color="text-red-400" />
          <StatBadge icon={Shield} value={item.def_bonus} color="text-blue-400" />
          <StatBadge icon={Heart}  value={item.hp_bonus}  color="text-green-400" />
          <StatBadge icon={Zap}    value={item.spd_bonus} color="text-yellow-400" />
        </div>
      )}

      {item?.description && (
        <p className="text-[9px] font-body text-muted-foreground/70 line-clamp-2">{item.description}</p>
      )}

      <div className="flex items-center justify-between">
        {isEquipped ? (
          <>
            <span className="text-[9px] font-heading text-primary">EQUIPADO: {playerItem.equipped_card_name}</span>
            <button
              onClick={() => onUnequip(playerItem)}
              className="text-[9px] font-heading text-muted-foreground hover:text-destructive border border-border/30 px-2 py-0.5 transition-colors"
            >
              DESEQUIPAR
            </button>
          </>
        ) : (
          <span className="text-[9px] font-body text-muted-foreground/50">Não equipado</span>
        )}
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: players = [] } = useQuery({
    queryKey: ["players-inv"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const myId = player?.discord_id || user?.email || "";

  const { data: playerItems = [] } = useQuery({
    queryKey: ["player-items-inv"],
    queryFn: () => db.entities.PlayerItem.list(),
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items-all"],
    queryFn: () => db.entities.Item.list(),
  });

  const myItems = playerItems.filter(pi => pi.player_discord_id === myId);

  const unequipMutation = useMutation({
    mutationFn: (pi) => db.entities.PlayerItem.update(pi.id, {
      equipped_to_roster_id: null,
      equipped_card_name: null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-items-inv"] });
      toast({ title: "Item desequipado." });
    },
  });

  const enriched = useMemo(() => {
    return myItems.map(pi => ({
      pi,
      item: items.find(it => it.id === pi.item_id) || null,
    }));
  }, [myItems, items]);

  const filtered = useMemo(() => {
    return enriched.filter(({ pi, item }) => {
      const matchType = typeFilter === "all" || item?.type === typeFilter;
      const matchSearch = !search || pi.item_name?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [enriched, typeFilter, search]);

  const equippedCount = myItems.filter(pi => pi.equipped_to_roster_id).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-accent/30 bg-accent/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">INVENTÁRIO</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">
                {myItems.length} ITENS • {equippedCount} EQUIPADOS
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar item..."
              className="pl-9 h-9 w-52 bg-muted/20 border border-border/50 font-body text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors rounded-none px-3"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-9 bg-muted/20 border-border/50 font-body text-xs rounded-none">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              {ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {(typeFilter !== "all" || search) && (
            <button
              onClick={() => { setTypeFilter("all"); setSearch(""); }}
              className="flex items-center gap-1 text-xs font-body text-muted-foreground border border-border/40 px-2.5 h-9"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
          <span className="ml-auto text-xs font-body text-muted-foreground">{filtered.length} itens</span>
        </div>

        {/* Grid */}
        {!user ? (
          <div className="text-center py-20">
            <p className="font-heading text-muted-foreground">Faça login para ver seu inventário.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="font-heading text-sm text-muted-foreground">
              {myItems.length === 0 ? "Inventário vazio." : "> ERRO_404: Nenhum item encontrado."}
            </p>
            {myItems.length === 0 && (
              <Link to="/quests" className="text-xs font-heading text-primary hover:underline">
                Complete missões para ganhar itens →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(({ pi, item }, i) => (
              <motion.div
                key={pi.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ItemCard
                  playerItem={pi}
                  item={item}
                  onUnequip={unequipMutation.mutate}
                  onEquip={() => {}}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}