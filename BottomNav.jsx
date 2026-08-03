import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Layers, Package, Hexagon, Swords, Zap } from "lucide-react";

export default function BottomNav() {
  const loc = useLocation();
  const isActive = (to) => loc.pathname === to;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-2 py-2 border-t border-border/40 bg-background/90 backdrop-blur-xl">
        {/* Coleções */}
        <Link to="/collections" className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${isActive("/collections") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Layers className="w-5 h-5" />
          <span className="text-[9px] font-heading font-bold tracking-wider">Coleções</span>
        </Link>

        {/* Inventário */}
        <Link to="/inventory" className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${isActive("/inventory") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-heading font-bold tracking-wider">Inv.</span>
        </Link>

        {/* Center — Home */}
        <Link to="/" className="relative flex flex-col items-center -mt-4">
          <div className={`w-12 h-12 rounded-full bg-primary/10 border-2 ${loc.pathname === "/" || loc.pathname === "/dashboard" ? "border-primary shadow-primary/50" : "border-primary/60 shadow-primary/30"} flex items-center justify-center shadow-lg hover:shadow-primary/60 transition-all hover:scale-105`}>
            <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
            <Hexagon className="w-6 h-6 text-primary" />
          </div>
          <span className="text-[8px] font-heading font-bold tracking-widest text-primary mt-0.5">HOME</span>
        </Link>

        {/* Arena */}
        <Link to="/arena" className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${isActive("/arena") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Swords className="w-5 h-5" />
          <span className="text-[9px] font-heading font-bold tracking-wider">Arena</span>
        </Link>

        {/* Gacha */}
        <Link to="/gacha" className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${isActive("/gacha") ? "text-primary" : "text-muted-foreground/60"}`}>
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-heading font-bold tracking-wider">Gacha</span>
        </Link>
      </div>
    </nav>
  );
}