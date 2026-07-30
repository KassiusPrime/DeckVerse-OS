import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingBag, X, ChevronRight } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";

const PACKS = [
  {
    id: "storm",
    name: "Storm Dominion",
    code: "STR-PACK",
    price: 500,
    color: "from-cyan-900/40 to-cyan-950/60",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    description: "Contains warriors of lightning and wind from the Storm Dominion universe.",
    dropRates: [
      { tier: "Common", rate: 50, color: "bg-zinc-500" },
      { tier: "Uncommon", rate: 25, color: "bg-green-500" },
      { tier: "Rare", rate: 14, color: "bg-blue-500" },
      { tier: "Epic", rate: 7, color: "bg-purple-500" },
      { tier: "Legendary", rate: 3.5, color: "bg-amber-400" },
      { tier: "Mythic", rate: 0.5, color: "bg-red-400" },
    ],
  },
  {
    id: "void",
    name: "Void Chronicles",
    code: "VCH-PACK",
    price: 750,
    color: "from-violet-900/40 to-violet-950/60",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    description: "Shadow operatives and void-touched assassins from the Void Chronicles series.",
    dropRates: [
      { tier: "Common", rate: 40, color: "bg-zinc-500" },
      { tier: "Uncommon", rate: 25, color: "bg-green-500" },
      { tier: "Rare", rate: 18, color: "bg-blue-500" },
      { tier: "Epic", rate: 10, color: "bg-purple-500" },
      { tier: "Legendary", rate: 5.5, color: "bg-amber-400" },
      { tier: "Mythic", rate: 1.5, color: "bg-red-400" },
    ],
  },
  {
    id: "celestial",
    name: "Celestial Order",
    code: "CLT-PACK",
    price: 600,
    color: "from-sky-900/40 to-sky-950/60",
    accent: "text-sky-300",
    border: "border-sky-400/30",
    description: "Holy warriors, healers and light-wielders from the Celestial Order.",
    dropRates: [
      { tier: "Common", rate: 45, color: "bg-zinc-500" },
      { tier: "Uncommon", rate: 28, color: "bg-green-500" },
      { tier: "Rare", rate: 15, color: "bg-blue-500" },
      { tier: "Epic", rate: 8, color: "bg-purple-500" },
      { tier: "Legendary", rate: 3.5, color: "bg-amber-400" },
      { tier: "Mythic", rate: 0.5, color: "bg-red-400" },
    ],
  },
];

function PackCard({ pack, onBuy, onRates }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded border ${pack.border} bg-gradient-to-b ${pack.color} backdrop-blur-sm flex flex-col`}
    >
      {/* Pack visual */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 min-h-[260px]">
        <div className={`w-24 h-32 rounded border-2 ${pack.border} bg-black/40 flex items-center justify-center relative overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${pack.color} opacity-60`} />
          <div className="relative text-center">
            <div className={`font-heading text-[10px] font-black tracking-widest uppercase ${pack.accent}`}>{pack.code}</div>
          </div>
          {/* shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
        </div>
        <div className="text-center">
          <h3 className={`font-heading text-sm font-black tracking-wide ${pack.accent}`}>{pack.name}</h3>
          <p className="text-xs font-body text-muted-foreground mt-1 max-w-[180px]">{pack.description}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="font-heading text-xs text-muted-foreground tracking-wider">PRICE</span>
          <span className={`font-heading text-lg font-black ${pack.accent}`}>{pack.price} <span className="text-xs text-muted-foreground font-body">GEMS</span></span>
        </div>
        <button
          onClick={() => onBuy(pack)}
          className={`w-full py-2.5 rounded border ${pack.border} bg-white/5 hover:bg-white/10 ${pack.accent} font-heading text-xs font-bold tracking-widest transition-all`}
        >
          PURCHASE PACK
        </button>
        <button
          onClick={() => onRates(pack)}
          className="w-full py-2 font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View Drop Rates →
        </button>
      </div>
    </motion.div>
  );
}

function RatesModal({ pack, onClose }) {
  if (!pack) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-sm rounded border ${pack.border} bg-background/95 p-6 shadow-2xl`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <h3 className={`font-heading text-sm font-black tracking-widest uppercase ${pack.accent} mb-1`}>Drop Rates</h3>
        <p className="text-xs font-body text-muted-foreground mb-5">{pack.name}</p>
        <div className="space-y-3">
          {pack.dropRates.map((r) => (
            <div key={r.tier}>
              <div className="flex justify-between text-xs font-body mb-1">
                <span className="text-foreground">{r.tier}</span>
                <span className="font-heading font-bold text-muted-foreground tabular-nums">{r.rate}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.rate * 2}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${r.color}/70`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function PurchaseModal({ pack, onClose }) {
  const [opened, setOpened] = useState(false);

  const handleOpen = () => setOpened(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!opened ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-sm rounded border ${pack.border} bg-background/95 p-6 shadow-2xl text-center`}
      >
        {!opened ? (
          <>
            <h3 className={`font-heading text-sm font-black tracking-widest ${pack.accent} mb-1`}>{pack.name}</h3>
            <p className="text-xs font-body text-muted-foreground mb-6">Spend {pack.price} Gems to open this pack?</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded border border-border/50 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
                CANCEL
              </button>
              <button onClick={handleOpen} className={`flex-1 py-2.5 rounded border ${pack.border} ${pack.accent} bg-white/5 hover:bg-white/10 text-xs font-heading font-bold tracking-wider transition-all`}>
                CONFIRM
              </button>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`w-16 h-20 mx-auto rounded border-2 ${pack.border} bg-gradient-to-br ${pack.color} flex items-center justify-center`}>
              <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }} className="text-2xl">✨</motion.span>
            </div>
            <p className={`font-heading text-xs tracking-widest font-bold ${pack.accent}`}>PACK OPENED!</p>
            <p className="text-xs font-body text-muted-foreground">Check your Roster to see what you got.</p>
            <Link
              to="/roster"
              onClick={onClose}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded border ${pack.border} ${pack.accent} bg-white/5 hover:bg-white/10 text-xs font-heading font-bold tracking-wider transition-all`}
            >
              GO TO ROSTER <ChevronRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function Store() {
  const [ratesFor, setRatesFor] = useState(null);
  const [buyFor, setBuyFor] = useState(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded border border-primary/20 bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">Store & Packs</h1>
              <p className="text-sm font-body text-muted-foreground">Spend Gems to pull new Wardens</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PACKS.map((pack) => (
            <PackCard key={pack.id} pack={pack} onBuy={setBuyFor} onRates={setRatesFor} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {ratesFor && <RatesModal pack={ratesFor} onClose={() => setRatesFor(null)} />}
        {buyFor && <PurchaseModal pack={buyFor} onClose={() => setBuyFor(null)} />}
      </AnimatePresence>
    </div>
  );
}