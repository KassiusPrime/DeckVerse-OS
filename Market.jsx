const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight, Search, Filter, Tag, ShoppingCart, Plus,
  X, Gem, Star, Check, AlertCircle
} from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { RarityBadge, RoleBadge } from "@/components/wiki/RarityBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const RARITY_ORDER = ["Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

const RARITY_PRICE = {
  Common: 20,
  Uncommon: 60,
  Rare: 150,
  Epic: 400,
  Legendary: 1200,
  Mythic: 3500,
};

// Marketplace entity — we'll simulate listings using the card pool for now
// and a mock listing store using local state

function ListingCard({ listing, onBuy, canAfford, isOwnListing, onCancel }) {
  const rarity = listing.card?.rarity;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="border border-border/40 bg-card/60 overflow-hidden hover:border-border/70 transition-all group"
    >
      {/* Card image */}
      <div className="aspect-[3/4] relative overflow-hidden">
        {listing.card?.image_url ? (
          <img src={listing.card.image_url} alt={listing.card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-muted/20 flex items-center justify-center">
            <Star className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-2">
          <p className="font-heading text-xs font-black text-white truncate">{listing.card?.name}</p>
          <p className="font-mono text-[9px] text-white/50">{listing.card?.card_id}</p>
        </div>
        {isOwnListing && (
          <div className="absolute top-1.5 left-1.5 bg-secondary/80 text-white font-heading text-[9px] px-1.5 py-0.5">
            SEU ANÚNCIO
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-2">
        <div className="flex flex-wrap gap-1">
          <RarityBadge rarity={listing.card?.rarity} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Gem className="w-3 h-3 text-primary" />
            <span className="font-heading text-sm font-black text-primary tabular-nums">{listing.price}</span>
          </div>
          <span className="text-[10px] font-body text-muted-foreground">@{listing.seller}</span>
        </div>
        {isOwnListing ? (
          <button
            onClick={() => onCancel(listing.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-destructive/30 text-destructive font-heading text-[10px] font-bold hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3 h-3" /> CANCELAR
          </button>
        ) : (
          <button
            onClick={() => onBuy(listing)}
            disabled={!canAfford}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 font-heading text-[10px] font-bold transition-colors ${
              canAfford
                ? "bg-primary text-primary-foreground hover:bg-primary/80"
                : "bg-muted/30 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            {canAfford ? "COMPRAR" : "SEM GEMS"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Market() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [showListForm, setShowListForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [listPrice, setListPrice] = useState("");

  // Listings are simulated in-memory for now (using a state + cards data)
  const [listings, setListings] = useState([]);

  const { data: players = [] } = useQuery({
    queryKey: ["players-market"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ["cards-market"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-market"],
    queryFn: () => db.entities.Roster.list("-created_date", 200),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const gems = player?.gems ?? 0;

  // Cards owned by current player
  const ownedCards = useMemo(() => {
    return rosterEntries
      .filter(r => r.player_discord_id === (player?.discord_id || user?.email))
      .map(r => allCards.find(c => c.id === r.card_id))
      .filter(Boolean);
  }, [rosterEntries, allCards, player, user]);

  // Build listings from cards with simulated sellers (seed from cards for demo)
  const marketListings = useMemo(() => {
    const seed = allCards.slice(0, 12).map((card, i) => ({
      id: `ml-${card.id}`,
      card,
      price: RARITY_PRICE[card.rarity] || 100,
      seller: ["void_hunter", "stormcaller99", "frost_witch", "ironwall_fan"][i % 4],
    }));
    return [...listings, ...seed];
  }, [allCards, listings]);

  const filteredListings = useMemo(() => {
    return marketListings.filter(l => {
      const matchesSearch = !searchQuery || l.card?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === "all" || l.card?.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [marketListings, searchQuery, rarityFilter]);

  const updateGemsMutation = useMutation({
    mutationFn: ({ id, gems }) => db.entities.Player.update(id, { gems }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players-market"] }),
  });

  const addRosterMutation = useMutation({
    mutationFn: (data) => db.entities.Roster.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roster-market"] }),
  });

  const handleBuy = (listing) => {
    if (!player) {
      toast({ title: "Perfil não encontrado", description: "Registre um jogador primeiro.", variant: "destructive" });
      return;
    }
    if (gems < listing.price) {
      toast({ title: "Gems insuficientes", variant: "destructive" });
      return;
    }
    updateGemsMutation.mutate({ id: player.id, gems: gems - listing.price });
    addRosterMutation.mutate({
      player_discord_id: player.discord_id || user?.email,
      card_id: listing.card.id,
      card_name: listing.card.name,
      level: 1,
      attack_bonus: 0,
      defense_bonus: 0,
      copies: 1,
    });
    toast({ title: `${listing.card.name} adquirida!`, description: `-${listing.price} Gems` });
  };

  const handleList = () => {
    if (!selectedCard || !listPrice) return;
    const price = parseInt(listPrice);
    if (isNaN(price) || price < 1) return;
    const newListing = {
      id: `user-${Date.now()}`,
      card: selectedCard,
      price,
      seller: player?.username || user?.email || "você",
      isOwn: true,
    };
    setListings(prev => [newListing, ...prev]);
    setShowListForm(false);
    setSelectedCard(null);
    setListPrice("");
    toast({ title: "Carta anunciada no mercado!", description: `${selectedCard.name} por ${price} Gems` });
  };

  const handleCancel = (id) => {
    setListings(prev => prev.filter(l => l.id !== id));
    toast({ title: "Anúncio cancelado" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">MERCADO</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">TROCA & COMPRA DE CARTAS</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Gems balance */}
              <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2">
                <Gem className="w-4 h-4 text-primary" />
                <span className="font-heading text-sm font-bold text-primary tabular-nums">{gems.toLocaleString()}</span>
                <span className="text-[10px] font-heading text-muted-foreground">GEMS</span>
              </div>
              <button
                onClick={() => setShowListForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-heading text-xs font-bold tracking-widest hover:bg-amber-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> ANUNCIAR CARTA
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar carta..."
              className="pl-9 h-9 bg-muted/20 border-border/50 font-body text-sm"
            />
          </div>
          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger className="w-36 h-9 bg-muted/20 border-border/50 font-body text-sm">
              <SelectValue placeholder="Raridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Raridades</SelectItem>
              {RARITY_ORDER.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="self-center text-xs font-body text-muted-foreground ml-auto">
            {filteredListings.length} anúncios
          </span>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onBuy={handleBuy}
                canAfford={gems >= listing.price}
                isOwnListing={listing.isOwn}
                onCancel={handleCancel}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-20">
            <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-heading text-sm text-muted-foreground">Nenhum anúncio encontrado</p>
          </div>
        )}
      </div>

      {/* List Card Modal */}
      <AnimatePresence>
        {showListForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowListForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-sm font-black tracking-widest">ANUNCIAR CARTA</h2>
                <button onClick={() => setShowListForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {ownedCards.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-body text-muted-foreground">Você não possui cartas para anunciar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-2">SELECIONAR CARTA</label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {ownedCards.map(card => (
                        <button
                          key={card.id}
                          onClick={() => {
                            setSelectedCard(card);
                            setListPrice(String(RARITY_PRICE[card.rarity] || 100));
                          }}
                          className={`border text-left overflow-hidden transition-all ${selectedCard?.id === card.id ? "border-primary/60 bg-primary/10" : "border-border/40 hover:border-border/70"}`}
                        >
                          <div className="aspect-[3/4] relative">
                            {card.image_url ? (
                              <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                                <span className="text-xs font-heading text-muted-foreground/40">{card.name?.[0]}</span>
                              </div>
                            )}
                            {selectedCard?.id === card.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="p-1">
                            <p className="text-[9px] font-heading font-bold text-foreground truncate">{card.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCard && (
                    <div>
                      <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-2">PREÇO (GEMS)</label>
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-primary shrink-0" />
                        <Input
                          type="number"
                          value={listPrice}
                          onChange={e => setListPrice(e.target.value)}
                          min={1}
                          className="bg-muted/20 border-border/50 font-mono"
                        />
                      </div>
                      <p className="text-[10px] font-body text-muted-foreground mt-1">
                        Preço sugerido: {RARITY_PRICE[selectedCard.rarity]} Gems ({selectedCard.rarity})
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleList}
                    disabled={!selectedCard || !listPrice}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 text-black font-heading text-xs font-bold tracking-widest hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Tag className="w-3.5 h-3.5" /> ANUNCIAR NO MERCADO
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}