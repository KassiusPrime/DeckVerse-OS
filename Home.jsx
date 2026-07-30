const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Terminal, FileText, Sparkles, HelpCircle, X, CheckCircle2, Circle, Server, Wifi } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { RarityBadge, RoleBadge } from "@/components/wiki/RarityBadge";

// ─── Tutorial steps ───────────────────────────────────────────
const TUTORIAL_STEPS = [
{ id: 0, title: "Bem-vindo ao DeckVerse OS", body: "Terminal tático de alta tecnologia para gerenciar seu arsenal de cartas multiversal. Este é o seu Hub Central.", icon: "⚡" },
{ id: 1, title: "Explore as Coleções", body: "Vá em Coleções para explorar e filtrar todas as cartas do banco de dados. Busque por nome, raridade, elemento ou coleção.", icon: "📚" },
{ id: 2, title: "Monte seu Esquadrão", body: "No Synergy Builder, aloque 5 cartas no seu esquadrão e descubra sinergias poderosas que amplificam o PWR total.", icon: "⚔️" },
{ id: 3, title: "Sistema de Gacha & Gemas", body: "Acesse Gacha Drop para invocar cartas usando Gemas. O sistema de pity garante que cartas raras apareçam com mais frequência.", icon: "💎" },
{ id: 4, title: "Arena & Batalhas", body: "Desafie ondas de inimigos na Arena para ganhar gemas e ouro. Verifique seu histórico em Batalhas.", icon: "🏟️" }];

// ─── Server status ─────────────────────────────────────────────
const SERVERS = [
{ name: "BASE44 DB", status: "online", latency: 12 },
{ name: "SA-EAST-SP", status: "online", latency: 18 },
{ name: "BOT ENGINE", status: "online", latency: 45 }];

const LIVE_DROPS = [
{ user: "void_hunter", card: "Vexor the Hollow", rarity: "Mythic", time: "2m ago" },
{ user: "stormcaller99", card: "Kaelith Stormfang", rarity: "Legendary", time: "7m ago" },
{ user: "frost_witch", card: "Lyra Frostweaver", rarity: "Legendary", time: "15m ago" },
{ user: "ironwall_fan", card: "Grommash Ironwall", rarity: "Rare", time: "22m ago" },
{ user: "dawn_keeper", card: "Seraphina Dawnkeeper", rarity: "Epic", time: "31m ago" }];

const RARITY_DOT = {
  Mythic: "bg-red-400",
  Legendary: "bg-amber-400",
  Epic: "bg-purple-400",
  Rare: "bg-blue-400",
  Uncommon: "bg-green-400",
  Common: "bg-zinc-400"
};

export default function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem("deckverse_onboarding_done");
    if (!done) {
      setTimeout(() => setShowTutorial(true), 1200);
    }
  }, []);

  const closeTutorial = () => {
    localStorage.setItem("deckverse_onboarding_done", "1");
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const nextStep = () => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {closeTutorial();return;}
    setTutorialStep((s) => s + 1);
  };

  const { data: cards = [] } = useQuery({
    queryKey: ["cards-featured"],
    queryFn: () => db.entities.Card.list("-created_date", 3)
  });

  const { data: changelogs = [] } = useQuery({
    queryKey: ["changelogs-home"],
    queryFn: () => db.entities.Changelog.list("-created_date", 3)
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-md border border-primary/40 bg-background/98 p-6 space-y-5">
            
              {/* Logo glow */}
              <div className="text-center mb-2">
                <span className="text-4xl neon-flicker">{TUTORIAL_STEPS[tutorialStep].icon}</span>
                <h1 className="font-heading text-lg font-black text-primary mt-2 neon-flicker tracking-widest">DECK<span className="text-foreground">VERSE</span></h1>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2">
                {TUTORIAL_STEPS.map((_, i) =>
              <div key={i} className={`transition-all rounded-full ${i === tutorialStep ? "w-6 h-2 bg-primary" : i < tutorialStep ? "w-2 h-2 bg-primary/50" : "w-2 h-2 bg-border"}`} />
              )}
              </div>

              {/* Content */}
              <div className="border border-border/30 bg-muted/10 p-4">
                <h3 className="font-heading text-sm font-black text-foreground mb-2">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{TUTORIAL_STEPS[tutorialStep].body}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button onClick={closeTutorial} className="text-xs font-body text-muted-foreground/50 hover:text-muted-foreground underline">
                  Pular Protocolo
                </button>
                <button onClick={nextStep} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors">
                  {tutorialStep >= TUTORIAL_STEPS.length - 1 ? "INICIAR SISTEMA" : "PRÓXIMO"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Tutorial restart button (always visible) */}
      <button
        onClick={() => {setTutorialStep(0);setShowTutorial(true);}}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full border border-primary/40 bg-background/90 flex items-center justify-center text-primary hover:bg-primary/10 transition-all neon-flicker shadow-lg shadow-primary/20"
        title="Tutorial">
        
        <HelpCircle className="w-4 h-4" />
      </button>

      <Navbar />

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          

          
          <h1 className="font-heading text-5xl sm:text-7xl font-black tracking-tight text-foreground mb-4">
            DECK<span className="text-primary">VERSE</span>
          </h1>
          <p className="text-muted-foreground font-body text-sm sm:text-base mb-10 max-w-xl mx-auto">
            The definitive compendium for every Warden in the game. Search, explore, and build your roster.
          </p>

          {/* Terminal search */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 rounded border border-primary/20 pointer-events-none" />
            <div className="flex items-center gap-3 bg-muted/30 border border-border/60 rounded px-4 py-3 focus-within:border-primary/50 transition-colors">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span className="text-primary font-heading text-xs tracking-widest">$&gt;</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search --card 'character name'"
                className="flex-1 bg-transparent text-foreground font-body text-sm placeholder:text-muted-foreground/50 outline-none" />
              
              <button
                type="submit" className="bg-primary text-primary-foreground px-1 py-1 font-heading text-xs font-bold tracking-wider rounded-none shrink-0 hover:bg-primary/80 transition-colors">
                
                
                EXEC
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 md:pb-20 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Featured Cards */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
              — Featured Wardens
            </h2>
            <Link to="/collections" className="flex items-center gap-1 text-xs font-body text-primary hover:underline">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card, i) =>
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}>
              
                <Link to={`/card/${card.id}`} className="group block">
                  <div className="relative rounded border border-border/40 bg-card/60 overflow-hidden hover:border-primary/40 transition-all duration-300">
                    {/* Image */}
                    <div className="aspect-[3/4] relative overflow-hidden">
                      {card.image_url ?
                    <img src={card.image_url} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :

                    <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <span className="text-4xl font-heading font-black text-muted-foreground/20">{card.name?.[0]}</span>
                        </div>
                    }
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5" />
                      {/* Bottom info */}
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
            )}
          </div>
        </div>

        {/* Live Drops Sidebar */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Live Drops
            </h2>
          </div>
          <div className="rounded border border-border/40 bg-card/40 divide-y divide-border/30">
            {LIVE_DROPS.map((drop, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="px-3 py-3">
              
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${RARITY_DOT[drop.rarity] || "bg-zinc-400"}`} />
                  <span className="text-xs font-body font-bold text-foreground truncate">{drop.card}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-body text-muted-foreground">@{drop.user}</span>
                  <span className="text-[10px] font-body text-muted-foreground/50">{drop.time}</span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-4">
            <Link
              to="/store"
              className="block w-full text-center px-4 py-2.5 rounded border border-primary/30 bg-primary/5 text-primary font-heading text-xs font-bold tracking-wider hover:bg-primary/10 transition-colors">
              
              EXPLORE ACTIVE DROPS →
            </Link>
          </div>

          {/* Server Status */}
          <div className="mt-4 border border-border/40 bg-card/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-3 h-3 text-muted-foreground" />
              <span className="font-heading text-[10px] font-bold tracking-widest text-muted-foreground">STATUS DOS SERVIDORES</span>
            </div>
            {SERVERS.map((srv) =>
            <div key={srv.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${srv.status === "online" ? "bg-green-400 animate-pulse" : "bg-destructive"}`} />
                  <span className="font-mono text-[9px] text-muted-foreground">{srv.name}</span>
                </div>
                <span className={`font-mono text-[9px] tabular-nums font-bold ${srv.latency < 30 ? "text-green-400" : srv.latency < 100 ? "text-amber-400" : "text-destructive"}`}>
                  {srv.latency}ms
                </span>
              </div>
            )}
          </div>

          {/* Patch Notes */}
          {changelogs.length > 0 &&
          <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Patch Notes
                </h2>
              </div>
              <div className="space-y-2">
                {changelogs.map((log, i) =>
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="border border-border/30 bg-card/30 px-3 py-2.5">
                
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-accent shrink-0" />
                      <span className="font-heading text-[10px] font-bold text-accent">{log.patch_version}</span>
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                      {log.notes}
                    </p>
                  </motion.div>
              )}
              </div>
            </div>
          }
        </div>
      </div>
    </div>);

}