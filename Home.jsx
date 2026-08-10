import { db } from "@/deckverseClient";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, ChevronRight, Terminal, FileText, Sparkles, HelpCircle, X, 
  CheckCircle2, Circle, Server, Wifi, BookOpen, Swords, Trophy, 
  Users, ArrowLeftRight, ShoppingBag, Globe, Shield, Flame, Activity
} from "lucide-react";
import Navbar from "@/Navbar";
import { RarityBadge, RoleBadge, ElementBadge } from "@/RarityBadge";
import DeckVerseLogo from "./DeckVerseLogo";

// ─── Tutorial steps ───────────────────────────────────────────
const TUTORIAL_STEPS = [
  { id: 0, title: "Bem-vindo ao DeckVerse OS", body: "Terminal tático de alta tecnologia para gerenciar seu arsenal de cartas multiversal. Este é o seu Hub Central.", icon: Zap },
  { id: 1, title: "Explore as Coleções", body: "Vá em Coleções para explorar e filtrar todas as cartas do banco de dados. Busque por nome, raridade, elemento ou coleção.", icon: BookOpen },
  { id: 2, title: "Monte seu Esquadrão", body: "No Synergy Builder, aloque 5 cartas no seu esquadrão e descubra sinergias poderosas que amplificam o PWR total.", icon: Swords },
  { id: 3, title: "Sistema de Gacha & Gemas", body: "Acesse Gacha Drop para invocar cartas usando Gemas. O sistema de pity garante que cartas raras apareçam com mais frequência.", icon: Sparkles },
  { id: 4, title: "Arena & Batalhas", body: "Desafie ondas de inimigos na Arena para ganhar gemas e ouro. Verifique seu histórico em Batalhas.", icon: Trophy }
];

// ─── Real System Status ─────────────────────────────────────────────
function SystemStatusWidget() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="border border-border/40 bg-card/40 p-3 rounded space-y-2">
      <div className="flex items-center justify-between border-b border-border/30 pb-2">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-primary" />
          <span className="font-heading text-[10px] font-bold tracking-widest text-muted-foreground uppercase">STATUS DO SISTEMA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
          <span className="font-mono text-[10px] font-bold">{isOnline ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </div>
      <div className="flex items-center justify-between py-1 text-[10px] font-mono">
        <span className="text-muted-foreground">Motor de Dados:</span>
        <span className="text-cyan-400 font-bold">DeckVerse Local Database</span>
      </div>
      <div className="flex items-center justify-between py-1 text-[10px] font-mono">
        <span className="text-muted-foreground">Versão do SO:</span>
        <span className="text-primary font-bold">v9.2 Canônico</span>
      </div>
    </div>
  );
}

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
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) { closeTutorial(); return; }
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

  const CurrentTutorialIcon = TUTORIAL_STEPS[tutorialStep].icon;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-md border border-primary/40 bg-background/98 p-6 space-y-5 shadow-2xl rounded-lg">
            
              {/* Logo & Icon header */}
              <div className="text-center mb-2 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,240,255,0.35)]">
                  <CurrentTutorialIcon className="w-7 h-7" />
                </div>
                <h1 className="font-heading text-lg font-black text-primary tracking-widest">DECK<span className="text-foreground">VERSE OS</span></h1>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div key={i} className={`transition-all rounded-full ${i === tutorialStep ? "w-6 h-2 bg-primary" : i < tutorialStep ? "w-2 h-2 bg-primary/50" : "w-2 h-2 bg-border"}`} />
                ))}
              </div>

              {/* Content */}
              <div className="border border-border/40 bg-muted/20 p-4 rounded">
                <h3 className="font-heading text-sm font-black text-foreground mb-2 flex items-center gap-2">
                  <CurrentTutorialIcon className="w-4 h-4 text-primary shrink-0" />
                  {TUTORIAL_STEPS[tutorialStep].title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{TUTORIAL_STEPS[tutorialStep].body}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button onClick={closeTutorial} className="text-xs font-body text-muted-foreground/50 hover:text-muted-foreground underline">
                  Pular Protocolo
                </button>
                <button onClick={nextStep} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors rounded">
                  {tutorialStep >= TUTORIAL_STEPS.length - 1 ? "INICIAR SISTEMA" : "PRÓXIMO"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial restart button (always visible) */}
      <button
        onClick={() => { setTutorialStep(0); setShowTutorial(true); }}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full border border-primary/40 bg-background/90 flex items-center justify-center text-primary hover:bg-primary/10 transition-all shadow-lg shadow-primary/20"
        title="Tutorial">
        <HelpCircle className="w-4 h-4" />
      </button>

      <Navbar />

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          
          <div className="flex justify-center mb-6">
            <DeckVerseLogo size="lg" showTagline={true} />
          </div>

          <p className="text-[#D1D5DB] font-mono text-xs sm:text-sm mb-6 max-w-xl mx-auto border-y border-[#00F0FF]/20 py-2.5 bg-black/40 rounded">
            [SYSTEM_READY] Terminal tático de alta tecnologia do Caçador de Anomalias.
          </p>

          {/* Big Navigation CTAs with Lucide Icons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link
              to="/collections"
              className="px-5 py-3 bg-primary text-primary-foreground font-heading text-xs font-black tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 rounded"
            >
              <BookOpen className="w-4 h-4" />
              <span>ABRIR COLEÇÕES</span>
            </Link>
            <Link
              to="/gacha"
              className="px-5 py-3 bg-amber-500 text-black font-heading text-xs font-black tracking-wider hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 rounded"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>GACHA DROP</span>
            </Link>
            <Link
              to="/arena"
              className="px-5 py-3 bg-red-600 text-white font-heading text-xs font-black tracking-wider hover:bg-red-500 transition-all shadow-md shadow-red-600/20 flex items-center gap-2 rounded"
            >
              <Swords className="w-4 h-4" />
              <span>ARENA PVE</span>
            </Link>
            <Link
              to="/synergy"
              className="px-5 py-3 bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-heading text-xs font-black tracking-wider hover:bg-cyan-900/60 transition-all shadow-md shadow-cyan-500/10 flex items-center gap-2 rounded"
            >
              <Zap className="w-4 h-4" />
              <span>SINERGIA</span>
            </Link>
          </div>

          {/* Terminal search */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 rounded border border-primary/20 pointer-events-none" />
            <div className="flex items-center gap-3 bg-muted/30 border border-border/60 rounded px-4 py-3 focus-within:border-primary/50 transition-colors">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span className="text-primary font-heading text-xs tracking-widest">$&gt;</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search --card 'nome da carta ou anime'"
                className="flex-1 bg-transparent text-foreground font-body text-sm placeholder:text-muted-foreground/50 outline-none" />
              
              <button
                type="submit" className="bg-primary text-primary-foreground px-3 py-1.5 font-heading text-xs font-bold tracking-wider rounded shrink-0 hover:bg-primary/80 transition-colors flex items-center gap-1.5">
                EXEC
              </button>
            </div>
          </form>

        </motion.div>
      </section>

      {/* Quick System Access Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: "/collections", icon: BookOpen, label: "Coleções", color: "text-primary border-primary/30" },
            { to: "/roster", icon: Users, label: "Esquadrão", color: "text-blue-400 border-blue-500/30" },
            { to: "/synergy", icon: Zap, label: "Sinergia", color: "text-amber-400 border-amber-500/30" },
            { to: "/gacha", icon: Sparkles, label: "Gacha Drop", color: "text-purple-400 border-purple-500/30" },
            { to: "/arena", icon: Swords, label: "Arena Raids", color: "text-red-400 border-red-500/30" },
            { to: "/market", icon: ArrowLeftRight, label: "Mercado", color: "text-green-400 border-green-500/30" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`p-3 border ${item.color} bg-card/40 hover:bg-card/80 transition-all rounded flex items-center gap-2.5 group`}
              >
                <Icon className={`w-4 h-4 ${item.color.split(" ")[0]} group-hover:scale-110 transition-transform`} />
                <span className="font-heading text-xs font-bold text-foreground truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 md:pb-20 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Featured Cards */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Featured Wardens
            </h2>
            <Link to="/collections" className="flex items-center gap-1 text-xs font-body text-primary hover:underline font-mono">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}>
                
                <Link to={`/card/${card.id}`} className="group block">
                  <div className="relative rounded border border-border/40 bg-card/60 overflow-hidden hover:border-primary/40 transition-all duration-300">
                    {/* Image */}
                    <div className="aspect-[3/4] relative overflow-hidden">
                      {card.image_url ? (
                        <img src={card.image_url} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <span className="text-4xl font-heading font-black text-muted-foreground/20">{card.name?.[0]}</span>
                        </div>
                      )}
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5" />
                      
                      {/* Bottom info */}
                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <p className="font-heading text-sm font-black text-white truncate">{card.name}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <RarityBadge rarity={card.rarity} />
                          <RoleBadge role={card.role} />
                          {card.element && <ElementBadge element={card.element} />}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* System & Status Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <SystemStatusWidget />

          <div>
            <Link
              to="/gacha"
              className="block w-full text-center px-4 py-2.5 rounded border border-primary/40 bg-primary/10 text-primary font-heading text-xs font-bold tracking-wider hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              ABRIR GACHA DROP →
            </Link>
          </div>

          {/* Patch Notes */}
          {changelogs.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Patch Notes
                </h2>
              </div>
              <div className="space-y-2">
                {changelogs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="border border-border/30 bg-card/30 px-3 py-2.5 rounded">
                    
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-heading text-[10px] font-bold text-primary">{log.patch_version}</span>
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                      {log.notes}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}