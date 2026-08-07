import { db } from "@/base44Client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Search, Layers, Zap, Swords, Package, ArrowRight, Skull, Trophy, Sparkles, BookOpen } from "lucide-react";

const STATIC_COMMANDS = [
  { label: "Home / Dashboard", to: "/dashboard", icon: "🏠", category: "Navegação" },
  { label: "Visão Geral de Coleções", to: "/collections", icon: "📚", category: "Navegação" },
  { label: "Sistema de Equipes & Sinergia", to: "/synergy", icon: "⚔️", category: "Navegação" },
  { label: "Lore Archive & Histórias", to: "/lore", icon: "📜", category: "Navegação" },
  { label: "Gacha Drop & Invocação", to: "/gacha", icon: "✨", category: "Navegação" },
  { label: "Inventário de Objetos", to: "/inventory", icon: "🎒", category: "Navegação" },
  { label: "Arena de Batalhas & Chefes", to: "/arena", icon: "🏟️", category: "Navegação" },
  { label: "Guilda & Clãs", to: "/guilds", icon: "🛡️", category: "Navegação" },
  { label: "Ranking Global", to: "/ranking", icon: "🏆", category: "Navegação" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Queries for Global Search
  const { data: characters = [] } = useQuery({
    queryKey: ["characters-cmd"],
    queryFn: () => db.entities.Character.list("-created_date", 200),
    enabled: open,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["cards-cmd"],
    queryFn: () => db.entities.Card.list("-created_date", 300),
    enabled: open,
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ["franchises-cmd"],
    queryFn: () => db.entities.Franchise.list(),
    enabled: open,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections-cmd"],
    queryFn: () => db.entities.Collection.list(),
    enabled: open,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items-cmd"],
    queryFn: () => db.entities.Item.list(),
    enabled: open,
  });

  const { data: bosses = [] } = useQuery({
    queryKey: ["bosses-cmd"],
    queryFn: () => db.entities.Boss.list(),
    enabled: open,
  });

  // Hotkeys & Custom open event listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
      // Single letter shortcuts (no modifiers, not in input)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !open) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "h") navigate("/dashboard");
        if (e.key === "e") navigate("/synergy");
        if (e.key === "l") navigate("/gacha");
      }
    };

    const customOpenHandler = (e) => {
      setOpen(true);
      if (e.detail?.query) setQuery(e.detail.query);
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("open-global-search", customOpenHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-global-search", customOpenHandler);
    };
  }, [open, navigate]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const cleanQuery = query.toLowerCase().trim();

  const characterMatches = cleanQuery.length >= 2
    ? characters.filter(ch =>
        ch.canonical_name?.toLowerCase().includes(cleanQuery) ||
        ch.bio?.toLowerCase().includes(cleanQuery) ||
        ch.species?.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : [];

  const franchiseMatches = cleanQuery.length >= 2
    ? franchises.filter(fr =>
        fr.name?.toLowerCase().includes(cleanQuery) ||
        fr.slug?.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const cardMatches = cleanQuery.length >= 2
    ? cards.filter(c =>
        c.name?.toLowerCase().includes(cleanQuery) ||
        c.series?.toLowerCase().includes(cleanQuery) ||
        c.role?.toLowerCase().includes(cleanQuery) ||
        c.tags?.some(t => t.toLowerCase().includes(cleanQuery))
      ).slice(0, 5)
    : [];

  const collectionMatches = cleanQuery.length >= 2
    ? collections.filter(col =>
        col.name?.toLowerCase().includes(cleanQuery) ||
        col.code?.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : [];

  const itemMatches = cleanQuery.length >= 2
    ? items.filter(it =>
        it.name?.toLowerCase().includes(cleanQuery) ||
        it.description?.toLowerCase().includes(cleanQuery) ||
        it.series?.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : [];

  const bossMatches = cleanQuery.length >= 2
    ? bosses.filter(b =>
        b.name?.toLowerCase().includes(cleanQuery) ||
        b.series?.toLowerCase().includes(cleanQuery) ||
        b.element?.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const staticMatches = STATIC_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(cleanQuery)
  );

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-start justify-center pt-16 sm:pt-24 px-4"
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-xl border border-primary/40 bg-background/95 shadow-2xl shadow-primary/20 rounded-2xl overflow-hidden z-10"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-card/50">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Busca global: Cartas, Coleções, Objetos, Chefes... (ex: "Naruto")'
              className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground text-xs font-heading font-bold px-1.5 py-0.5 rounded">
                Limpar
              </button>
            )}
            <kbd className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-2 py-0.5 rounded bg-muted/20">ESC</kbd>
          </div>

          {/* Results Container */}
          <div className="max-h-[70vh] overflow-y-auto py-3 space-y-4">

            {/* COLLECTIONS RESULTS */}
            {collectionMatches.length > 0 && (
              <div>
                <p className="px-5 py-1 text-[10px] font-heading font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Coleções ({collectionMatches.length})
                </p>
                {collectionMatches.map(col => (
                  <button
                    key={col.id}
                    onClick={() => go("/collections")}
                    className="w-full flex items-center gap-3.5 px-5 py-2 hover:bg-amber-500/10 text-left transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-bold text-foreground group-hover:text-amber-300 transition-colors truncate">{col.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">Coleção #{col.code || "COL"}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* PERSONAGENS RESULTS */}
            {(cardMatches.length > 0 || characterMatches.length > 0) && (
              <div>
                <p className="px-5 py-1 text-[10px] font-heading font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Personagens ({cardMatches.length + characterMatches.length})
                </p>
                {cardMatches.map(card => (
                  <button
                    key={card.id}
                    onClick={() => go(`/card/${card.id}`)}
                    className="w-full flex items-center gap-3.5 px-5 py-2 hover:bg-emerald-500/10 text-left transition-colors group"
                  >
                    {(card.img_custom || card.img_oficial || card.image_url) ? (
                      <img src={card.img_custom || card.img_oficial || card.image_url} alt="" className="w-7 h-9 object-cover shrink-0 rounded border border-border/40 shadow-sm" />
                    ) : (
                      <div className="w-7 h-9 bg-muted/40 rounded flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-bold text-foreground group-hover:text-emerald-300 transition-colors truncate">{card.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{card.series || "Personagem"} · {card.role} · {card.rarity}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* ITENS RESULTS */}
            {itemMatches.length > 0 && (
              <div>
                <p className="px-5 py-1 text-[10px] font-heading font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Itens ({itemMatches.length})
                </p>
                {itemMatches.map(item => (
                  <button
                    key={item.id}
                    onClick={() => go("/inventory")}
                    className="w-full flex items-center gap-3.5 px-5 py-2 hover:bg-cyan-500/10 text-left transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-bold text-foreground group-hover:text-cyan-300 transition-colors truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{item.series || item.collection_name || "Geral"} · {item.type || "Item"}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* BOSSES RESULTS */}
            {bossMatches.length > 0 && (
              <div>
                <p className="px-5 py-1 text-[10px] font-heading font-bold tracking-widest text-red-400 uppercase flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5" /> Bosses ({bossMatches.length})
                </p>
                {bossMatches.map(boss => (
                  <button
                    key={boss.id}
                    onClick={() => go("/arena")}
                    className="w-full flex items-center gap-3.5 px-5 py-2 hover:bg-red-500/10 text-left transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Skull className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-bold text-foreground group-hover:text-red-300 transition-colors truncate">{boss.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">Nível {boss.level || 1} · {boss.series || "Boss"}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* STATIC / NAVIGATION RESULTS */}
            {staticMatches.length > 0 && (
              <div>
                <p className="px-5 py-1 text-[10px] font-heading font-bold tracking-widest text-muted-foreground/60 uppercase">MÓDULOS DE SISTEMA</p>
                {staticMatches.map(cmd => (
                  <button
                    key={cmd.to}
                    onClick={() => go(cmd.to)}
                    className="w-full flex items-center gap-3 px-5 py-2 hover:bg-card text-left transition-colors group"
                  >
                    <span className="text-base">{cmd.icon}</span>
                    <span className="flex-1 text-xs font-heading font-bold text-foreground group-hover:text-primary transition-colors">{cmd.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {cleanQuery.length >= 2 && cardMatches.length === 0 && collectionMatches.length === 0 && itemMatches.length === 0 && bossMatches.length === 0 && staticMatches.length === 0 && (
              <p className="px-5 py-8 text-center text-xs font-body text-muted-foreground">Nenhum resultado encontrado para "{query}"</p>
            )}

            {cleanQuery.length === 0 && (
              <div className="px-5 py-3 border-t border-border/20">
                <p className="text-[10px] font-heading font-bold tracking-widest text-muted-foreground/50 uppercase mb-2">ATALHOS RÁPIDOS DO TECLADO</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 border border-border/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground bg-card/30">
                    <kbd className="text-primary font-bold">Ctrl+K</kbd>
                    <span>→ Abrir Busca Global</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-border/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground bg-card/30">
                    <kbd className="text-primary font-bold">H</kbd>
                    <span>→ Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-border/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground bg-card/30">
                    <kbd className="text-primary font-bold">E</kbd>
                    <span>→ Equipes</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}