const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Check, X, Clock, Plus, Search, Gem } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG = {
  pending:   { label: "Pendente",  color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30"  },
  accepted:  { label: "Aceita",    color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30"  },
  rejected:  { label: "Recusada", color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30"    },
  cancelled: { label: "Cancelada", color: "text-zinc-400",  bg: "bg-zinc-400/10",  border: "border-zinc-400/30"   },
};

function CardPicker({ cards, selected, onSelect, label }) {
  const [q, setQ] = useState("");
  const filtered = cards.filter(c => !q || c.name?.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar carta..." className="pl-8 h-8 bg-muted/20 border-border/50 text-xs font-body" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
        {filtered.map(card => (
          <button
            key={card.id || card.card_id}
            onClick={() => onSelect(card)}
            className={`border overflow-hidden transition-all text-left ${selected?.id === card.id ? "border-primary/70 ring-1 ring-primary/30" : "border-border/40 hover:border-border/70"}`}
          >
            <div className="aspect-[3/4] relative">
              {card.image_url
                ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-muted/20 flex items-center justify-center text-[10px] font-heading text-muted-foreground">{card.name?.[0]}</div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <p className="absolute bottom-1 left-1 right-1 text-[8px] font-heading text-white truncate">{card.name}</p>
            </div>
          </button>
        ))}
      </div>
      {selected && <p className="text-[10px] font-heading text-primary">✓ {selected.name}</p>}
    </div>
  );
}

export default function Trade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [offerCard, setOfferCard] = useState(null);
  const [wantCard, setWantCard] = useState(null);
  const [targetUser, setTargetUser] = useState("");
  const [gemBonus, setGemBonus] = useState(0);

  const { data: players = [] } = useQuery({
    queryKey: ["players-trade"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ["cards-trade"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-trade"],
    queryFn: () => db.entities.Roster.list("-created_date", 300),
    enabled: !!user,
  });

  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: () => db.entities.TradeRequest.list("-created_date", 50),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const player = players.find(p => p.created_by === user?.email) || null;

  const myId = player?.discord_id || user?.email || "";

  const myRosterCards = useMemo(() => {
    return rosterEntries
      .filter(r => r.player_discord_id === myId)
      .map(r => allCards.find(c => c.id === r.card_id))
      .filter(Boolean);
  }, [rosterEntries, allCards, myId]);

  const myTrades = useMemo(() => trades.filter(t => t.sender_discord_id === myId || t.receiver_discord_id === myId), [trades, myId]);
  const incomingPending = useMemo(() => myTrades.filter(t => t.receiver_discord_id === myId && t.status === "pending"), [myTrades, myId]);

  const createTrade = useMutation({
    mutationFn: (data) => db.entities.TradeRequest.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      setShowNew(false); setOfferCard(null); setWantCard(null); setTargetUser(""); setGemBonus(0);
      toast({ title: "Proposta de troca enviada!" });
    },
  });

  const updateTrade = useMutation({
    mutationFn: ({ id, status }) => db.entities.TradeRequest.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });

  const handleCreate = () => {
    if (!offerCard || !wantCard || !targetUser) return;
    const target = players.find(p => p.username?.toLowerCase() === targetUser.toLowerCase() || p.discord_id === targetUser);
    if (!target) { toast({ title: "Jogador não encontrado", variant: "destructive" }); return; }
    createTrade.mutate({
      sender_discord_id: myId,
      sender_username: player?.username || user?.email || "?",
      receiver_discord_id: target.discord_id || target.id,
      receiver_username: target.username,
      sender_card_id: offerCard.id,
      sender_card_name: offerCard.name,
      receiver_card_id: wantCard.id,
      receiver_card_name: wantCard.name,
      gem_bonus: gemBonus,
      status: "pending",
    });
  };

  const handleAccept = async (trade) => {
    await updateTrade.mutateAsync({ id: trade.id, status: "accepted" });
    toast({ title: "Troca aceita! Cartas trocadas." });
  };

  const handleReject = (trade) => {
    updateTrade.mutate({ id: trade.id, status: "rejected" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">TROCAS</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">NEGOCIE CARTAS COM OUTROS JOGADORES</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {incomingPending.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-400 font-heading text-xs animate-pulse">
                  {incomingPending.length} proposta{incomingPending.length > 1 ? "s" : ""} pendente{incomingPending.length > 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black font-heading text-xs font-bold tracking-widest hover:bg-cyan-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> NOVA TROCA
              </button>
            </div>
          </div>
        </motion.div>

        {/* Incoming trades */}
        {incomingPending.length > 0 && (
          <div className="mb-6">
            <h2 className="font-heading text-xs font-bold tracking-widest text-amber-400 mb-3">— PROPOSTAS RECEBIDAS</h2>
            <div className="space-y-3">
              {incomingPending.map(trade => (
                <motion.div key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border border-amber-400/30 bg-amber-400/5 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-heading text-xs font-black text-foreground">
                        <span className="text-amber-400">@{trade.sender_username}</span> quer trocar
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-heading text-[10px] text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5">{trade.sender_card_name}</span>
                        <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-heading text-[10px] text-primary border border-primary/20 px-1.5 py-0.5">{trade.receiver_card_name}</span>
                        {trade.gem_bonus > 0 && <span className="font-heading text-[10px] text-amber-400">+{trade.gem_bonus} Gems</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAccept(trade)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 font-heading text-[10px] hover:bg-green-500/20 transition-colors">
                        <Check className="w-3 h-3" /> ACEITAR
                      </button>
                      <button onClick={() => handleReject(trade)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 font-heading text-[10px] hover:bg-red-500/20 transition-colors">
                        <X className="w-3 h-3" /> RECUSAR
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Trade history */}
        <div>
          <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-3">— HISTÓRICO DE TROCAS</h2>
          {myTrades.length === 0 ? (
            <div className="text-center py-12 border border-border/30 bg-card/20">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-body text-muted-foreground">Nenhuma troca ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTrades.map(trade => {
                const isSender = trade.sender_discord_id === myId;
                const sc = STATUS_CONFIG[trade.status] || STATUS_CONFIG.pending;
                return (
                  <div key={trade.id} className={`border ${sc.border} ${sc.bg} p-3 flex items-center justify-between flex-wrap gap-2`}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-heading text-muted-foreground">{isSender ? "→ Para" : "← De"}</span>
                        <span className="font-heading text-xs font-bold text-foreground">@{isSender ? trade.receiver_username : trade.sender_username}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-mono text-[10px] text-cyan-400">{isSender ? trade.sender_card_name : trade.receiver_card_name}</span>
                        <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-[10px] text-primary">{isSender ? trade.receiver_card_name : trade.sender_card_name}</span>
                        {trade.gem_bonus > 0 && <span className="font-mono text-[10px] text-amber-400">+{trade.gem_bonus}💎</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-heading text-[10px] font-bold px-2 py-0.5 border ${sc.border} ${sc.color}`}>{sc.label}</span>
                      {trade.status === "pending" && isSender && (
                        <button onClick={() => updateTrade.mutate({ id: trade.id, status: "cancelled" })} className="text-[10px] font-heading text-muted-foreground hover:text-destructive transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Trade Modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowNew(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-sm font-black tracking-widest">PROPOR TROCA</h2>
                <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <CardPicker cards={myRosterCards} selected={offerCard} onSelect={setOfferCard} label="VOCÊ OFERECE" />
                <CardPicker cards={allCards} selected={wantCard} onSelect={setWantCard} label="VOCÊ QUER" />
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-1">JOGADOR ALVO (username ou discord ID)</label>
                  <Input value={targetUser} onChange={e => setTargetUser(e.target.value)} placeholder="ex: void_hunter" className="bg-muted/20 border-border/50 font-body" />
                </div>
                <div>
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground block mb-1">GEMS BÔNUS (opcional)</label>
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-primary shrink-0" />
                    <Input type="number" value={gemBonus} onChange={e => setGemBonus(Number(e.target.value))} min={0} className="bg-muted/20 border-border/50 font-mono w-32" />
                  </div>
                </div>
              </div>

              {offerCard && wantCard && (
                <div className="flex items-center gap-3 p-3 border border-border/30 bg-muted/10 mb-5">
                  <span className="font-heading text-xs text-cyan-400">{offerCard.name}</span>
                  <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-heading text-xs text-primary">{wantCard.name}</span>
                  {gemBonus > 0 && <span className="font-heading text-xs text-amber-400 ml-auto">+{gemBonus} 💎</span>}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!offerCard || !wantCard || !targetUser || createTrade.isPending}
                className="w-full py-2.5 bg-cyan-400 text-black font-heading text-xs font-bold tracking-widest hover:bg-cyan-300 transition-colors disabled:opacity-40"
              >
                {createTrade.isPending ? "ENVIANDO..." : "ENVIAR PROPOSTA"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}