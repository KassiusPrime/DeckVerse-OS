import { db } from "@/base44Client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Zap, Crown, Star, Check, X } from "lucide-react";
import Navbar from "@/Navbar";
import { useToast } from "@/use-toast";

const PACKAGES = [
  { id: "starter",   gems: 500,   price: "R$ 4,99",  label: "STARTER",   emoji: "💎", color: "border-blue-500/30   bg-blue-900/20",   accent: "text-blue-400",   badge: null },
  { id: "boost",     gems: 1200,  price: "R$ 9,99",  label: "BOOST",     emoji: "💎💎", color: "border-purple-500/30 bg-purple-900/20", accent: "text-purple-400", badge: "+POPULAR" },
  { id: "elite",     gems: 3000,  price: "R$ 19,99", label: "ELITE",     emoji: "💎💎💎", color: "border-amber-500/30 bg-amber-900/20",  accent: "text-amber-400",  badge: null },
  { id: "sovereign", gems: 7500,  price: "R$ 44,99", label: "SOVEREIGN", emoji: "👑",  color: "border-amber-400/50 bg-amber-900/30",  accent: "text-amber-300",  badge: "+VALOR" },
  { id: "ascendant", gems: 16000, price: "R$ 89,99", label: "ASCENDANT", emoji: "🔥",  color: "border-red-500/40   bg-red-900/20",    accent: "text-red-400",    badge: "+MEGA" },
  { id: "divine",    gems: 40000, price: "R$ 199,99",label: "DIVINE ☆",  emoji: "✨",  color: "border-sky-400/60   bg-sky-900/30",    accent: "text-sky-300",    badge: "+LENDÁRIO" },
];

const FREE_GIFTS = [
  { id: "daily",   label: "Login Diário",      gems: 50,   icon: Star,  cooldown: "24h",  color: "text-green-400" },
  { id: "weekly",  label: "Bônus Semanal",     gems: 300,  icon: Crown, cooldown: "7d",   color: "text-amber-400" },
  { id: "new_user",label: "Bônus de Novato",   gems: 500,  icon: Gem,   cooldown: "once", color: "text-primary" },
];

export default function GemShop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmPkg, setConfirmPkg] = useState(null);

  const { data: players = [] } = useQuery({
    queryKey: ["players-gemshop"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const gems = player?.gems ?? 0;

  const updateGemsMutation = useMutation({
    mutationFn: ({ id, gems }) => db.entities.Player.update(id, { gems }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players-gemshop"] }),
  });

  const handleClaim = (gift) => {
    if (!player) return;
    const key = `dv_gift_${gift.id}_${user?.email}`;
    const last = localStorage.getItem(key);
    if (last) {
      const elapsed = Date.now() - Number(last);
      const cd = gift.cooldown === "once" ? Infinity : gift.cooldown === "24h" ? 86400000 : 604800000;
      if (elapsed < cd) {
        toast({ title: "Já resgatado!", description: "Volte mais tarde.", variant: "destructive" });
        return;
      }
    }
    localStorage.setItem(key, String(Date.now()));
    updateGemsMutation.mutate({ id: player.id, gems: gems + gift.gems });
    toast({ title: `+${gift.gems} 💎 resgatado!`, description: gift.label });
  };

  const handleBuy = (pkg) => {
    if (!player) return;
    // Simulate purchase — in production this would connect to Stripe
    updateGemsMutation.mutate({ id: player.id, gems: gems + pkg.gems });
    toast({ title: `+${pkg.gems.toLocaleString()} 💎 adicionados!`, description: `Pacote ${pkg.label} ativado.` });
    setConfirmPkg(null);
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
                <Gem className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">LOJA PREMIUM</h1>
                <p className="text-xs font-body text-muted-foreground tracking-widest">ADQUIRA GEMAS — ALIMENTE SEU PODER</p>
              </div>
            </div>
            {player && (
              <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-2">
                <Gem className="w-4 h-4 text-primary" />
                <span className="font-heading text-sm font-black text-primary tabular-nums">{gems.toLocaleString()} GEMAS</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Free gifts */}
        <div className="mb-8">
          <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-3">— RESGATES GRATUITOS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FREE_GIFTS.map((gift, i) => {
              const Icon = gift.icon;
              const key = `dv_gift_${gift.id}_${user?.email}`;
              const last = Number(localStorage.getItem(key) || 0);
              const cd = gift.cooldown === "once" ? Infinity : gift.cooldown === "24h" ? 86400000 : 604800000;
              const claimed = last && (Date.now() - last < cd);
              return (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="border border-border/40 bg-card/40 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${gift.color}`} />
                    <div>
                      <p className="font-heading text-xs font-bold text-foreground">{gift.label}</p>
                      <p className={`text-[10px] font-mono font-bold ${gift.color}`}>+{gift.gems} 💎</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim(gift)}
                    disabled={!player || claimed}
                    className={`px-3 py-1.5 text-[10px] font-heading font-bold border transition-all ${
                      claimed
                        ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                        : "border-primary/40 text-primary hover:bg-primary/10"
                    }`}
                  >
                    {claimed ? "RESGATADO" : "RESGATAR"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Gem packages */}
        <h2 className="font-heading text-xs font-bold tracking-widest text-muted-foreground mb-3">— PACOTES DE GEMAS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PACKAGES.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`relative border ${pkg.color} p-5 space-y-4 flex flex-col`}
            >
              {pkg.badge && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-secondary text-primary-foreground text-[9px] font-heading font-black tracking-widest">
                  {pkg.badge}
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pkg.emoji}</span>
                <div>
                  <p className={`font-heading text-sm font-black tracking-widest ${pkg.accent}`}>{pkg.label}</p>
                  <p className="font-mono text-xl font-black text-foreground tabular-nums">{pkg.gems.toLocaleString()}</p>
                  <p className="text-[10px] font-body text-muted-foreground">gemas</p>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setConfirmPkg(pkg)}
                disabled={!player}
                className={`w-full py-2.5 font-heading text-xs font-bold tracking-widest border transition-all ${pkg.accent} ${pkg.color} hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {pkg.price}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] font-body text-muted-foreground/40 mt-8">
          * Demonstração — integração com pagamento real disponível via upgrade de plano.
        </p>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmPkg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmPkg(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-sm border ${confirmPkg.color} bg-background/98 p-6 text-center space-y-4`}
            >
              <span className="text-4xl">{confirmPkg.emoji}</span>
              <div>
                <p className={`font-heading text-sm font-black ${confirmPkg.accent}`}>{confirmPkg.label}</p>
                <p className="font-mono text-2xl font-black text-foreground">{confirmPkg.gems.toLocaleString()} 💎</p>
                <p className="text-xs font-body text-muted-foreground mt-1">por {confirmPkg.price}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPkg(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" /> CANCELAR
                </button>
                <button
                  onClick={() => handleBuy(confirmPkg)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border ${confirmPkg.color} ${confirmPkg.accent} text-xs font-heading font-bold hover:opacity-80`}
                >
                  <Check className="w-3 h-3" /> CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}