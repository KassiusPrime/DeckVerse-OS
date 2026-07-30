const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Search, Layers, Zap, Swords, Package, ArrowRight } from "lucide-react";

const STATIC_COMMANDS = [
  { label: "Home / Dashboard", to: "/dashboard", icon: "🏠", keys: ["h"] },
  { label: "Synergy Builder", to: "/synergy", icon: "⚔️", keys: ["e"] },
  { label: "Gacha Drop", to: "/gacha", icon: "✨" },
  { label: "Inventário", to: "/inventory", icon: "🎒" },
  { label: "Arena", to: "/arena", icon: "🏟️" },
  { label: "Coleções", to: "/collections", icon: "📚" },
  { label: "Guilda", to: "/guilds", icon: "🛡️" },
  { label: "Ranking", to: "/ranking", icon: "🏆" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data: cards = [] } = useQuery({
    queryKey: ["cards-cmd"],
    queryFn: () => db.entities.Card.list("-created_date", 200),
    enabled: open,
  });

  // Ctrl+K / Esc hotkeys
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
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, navigate]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const cardMatches = query.length >= 2
    ? cards.filter(c =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 4)
    : [];

  const staticMatches = STATIC_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
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
        className="fixed inset-0 z-[9998] flex items-start justify-center pt-24 px-4"
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg border border-primary/40 bg-background/98 shadow-2xl shadow-primary/20 z-10"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Buscar cartas, coleções, páginas... "Uchihas"'
              className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <kbd className="text-[9px] font-mono text-muted-foreground/40 border border-border/30 px-1.5 py-0.5">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-2">
            {cardMatches.length > 0 && (
              <div>
                <p className="px-4 py-1 text-[9px] font-heading tracking-widest text-muted-foreground/50">CARTAS</p>
                {cardMatches.map(card => (
                  <button
                    key={card.id}
                    onClick={() => go(`/card/${card.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-primary/5 text-left transition-colors"
                  >
                    {(card.img_custom || card.img_oficial || card.image_url) && (
                      <img src={card.img_custom || card.img_oficial || card.image_url} alt="" className="w-6 h-8 object-cover shrink-0 border border-border/30" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-bold text-foreground truncate">{card.name}</p>
                      <p className="text-[9px] font-mono text-muted-foreground">{card.card_id}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}

            {staticMatches.length > 0 && (
              <div>
                <p className="px-4 py-1 text-[9px] font-heading tracking-widest text-muted-foreground/50">NAVEGAÇÃO</p>
                {staticMatches.map(cmd => (
                  <button
                    key={cmd.to}
                    onClick={() => go(cmd.to)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-primary/5 text-left transition-colors"
                  >
                    <span className="text-base">{cmd.icon}</span>
                    <span className="flex-1 text-xs font-body text-foreground">{cmd.label}</span>
                    {cmd.keys && (
                      <kbd className="text-[9px] font-mono text-muted-foreground/40 border border-border/30 px-1.5 py-0.5">{cmd.keys[0]}</kbd>
                    )}
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && cardMatches.length === 0 && staticMatches.length === 0 && (
              <p className="px-4 py-6 text-center text-xs font-body text-muted-foreground/50">Nenhum resultado para "{query}"</p>
            )}

            {query.length === 0 && (
              <div className="px-4 py-2">
                <p className="text-[9px] font-heading tracking-widest text-muted-foreground/40 mb-2">ATALHOS RÁPIDOS</p>
                <div className="flex flex-wrap gap-1.5">
                  {[["H","Home"],["E","Esquadrão"],["L","Lab"]].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1 border border-border/30 px-2 py-1 text-[9px] font-mono text-muted-foreground">
                      <kbd className="text-primary">{key}</kbd>
                      <span>→ {label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 border border-border/30 px-2 py-1 text-[9px] font-mono text-muted-foreground">
                    <kbd className="text-primary">Ctrl+K</kbd>
                    <span>→ Busca</span>
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