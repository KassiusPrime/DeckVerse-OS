import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Swords, Package, Hexagon, MessageSquare, Zap } from "lucide-react";

export default function BottomNav() {
  const loc = useLocation();
  const isActive = (to) => loc.pathname === to;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-4 py-2 border-t border-border/40 bg-background/80 backdrop-blur-xl">
        {/* Esquadrão */}
        <Link to="/synergy" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all ${isActive("/synergy") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Swords className="w-5 h-5" />
          <span className="text-[9px] font-heading tracking-widest">Equipe</span>
        </Link>

        {/* Inventário */}
        <Link to="/inventory" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all ${isActive("/inventory") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-heading tracking-widest">Inv.</span>
        </Link>

        {/* Center — Nexus Core */}
        <Link to="/dashboard" className="relative flex flex-col items-center -mt-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/60 transition-all hover:scale-105">
            <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
            <Hexagon className="w-7 h-7 text-primary" />
          </div>
          <span className="text-[8px] font-heading tracking-widest text-primary mt-0.5">HOME</span>
        </Link>

        {/* Nexus/Guilds */}
        <Link to="/guilds" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all ${isActive("/guilds") ? "text-primary" : "text-muted-foreground/60"}`}>
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-heading tracking-widest">Nexus</span>
        </Link>

        {/* Lab/Gacha */}
        <Link to="/gacha" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all ${isActive("/gacha") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-heading tracking-widest">Lab</span>
        </Link>
      </div>
    </nav>
  );
}