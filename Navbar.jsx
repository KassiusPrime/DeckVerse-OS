import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search, Layers, Users, Menu, X, ShoppingBag, Trophy, Swords,
  Sparkles, Zap, TrendingUp, ArrowLeftRight, Gift, Shield, Settings,
  User, BarChart2, Gem, Package, Globe, BookOpen, ChevronDown
} from "lucide-react";
import { Input } from "@/input";
import { useI18n } from "./i18n";
import DeckVerseLogo from "./DeckVerseLogo";
import NotificationBell from "./NotificationBell";

const SERVERS = ["SA-EAST-SP", "NA-VIRGINIA", "EU-LONDON"];

function PingDisplay() {
  const [ping, setPing] = useState(18);
  const [server] = useState(SERVERS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(12 + Math.random() * 30));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const color = ping < 30 ? "text-green-400" : ping < 80 ? "text-amber-400" : "text-destructive";

  return (
    <div className="hidden lg:flex items-center gap-1.5 border border-border/40 px-2 py-1 shrink-0">
      <div className={`w-1.5 h-1.5 rounded-full ${ping < 30 ? "bg-green-400" : "bg-amber-400"} animate-pulse`} />
      <span className="text-[9px] font-mono text-muted-foreground">{server}</span>
      <span className={`text-[9px] font-mono font-bold tabular-nums ${color}`}>{ping}ms</span>
    </div>
  );
}

export default function Navbar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [moreOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
    window.dispatchEvent(new CustomEvent("open-global-search", { detail: { query } }));
  };

  const openGlobalSearch = () => {
    window.dispatchEvent(new CustomEvent("open-global-search", { detail: { query } }));
  };

  const primaryLinks = [
    { to: "/collections", icon: Layers, label: t("nav_collections") },
    { to: "/roster", icon: Users, label: t("nav_roster") },
    { to: "/arena", icon: Swords, label: t("nav_arena") },
    { to: "/gacha", icon: Sparkles, label: t("nav_gacha") },
    { to: "/market", icon: ArrowLeftRight, label: t("nav_market") },
    { to: "/store", icon: ShoppingBag, label: t("nav_store") },
  ];

  const secondaryLinks = [
    { to: "/lore", icon: BookOpen, label: "Lore Archive" },
    { to: "/fandom", icon: Globe, label: "Fandom Importer" },
    { to: "/synergy", icon: Zap, label: t("nav_synergy") },
    { to: "/upgrade", icon: TrendingUp, label: t("nav_upgrade") },
    { to: "/quests", icon: Gift, label: t("nav_quests") },
    { to: "/guilds", icon: Shield, label: t("nav_guilds") },
    { to: "/battles", icon: Swords, label: t("nav_battles") },
    { to: "/ranking", icon: BarChart2, label: "Ranking" },
    { to: "/leaderboard", icon: Trophy, label: t("nav_leaderboard") },
    { to: "/inventory", icon: Package, label: "Inventário" },
    { to: "/profile", icon: User, label: "Perfil" },
    { to: "/settings", icon: Settings, label: t("nav_settings") },
  ];

  const allMobileLinks = [...primaryLinks, ...secondaryLinks];

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border bg-background shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

        {/* Logo canonical DeckVerse OS */}
        <Link to="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
          <DeckVerseLogo size="sm" showTagline={true} />
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Busca global... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={openGlobalSearch}
              className="pl-9 pr-14 h-8 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary font-body text-xs cursor-pointer"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground border border-border px-1 py-0.2 rounded bg-muted/40 pointer-events-none">
              Ctrl+K
            </kbd>
          </div>
        </form>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {primaryLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-heading font-bold tracking-wide text-foreground hover:text-primary hover:bg-primary/10 transition-all rounded"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </Link>
          ))}

          {/* Menu "Mais" Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-heading font-bold tracking-wide text-foreground hover:text-primary hover:bg-primary/10 transition-all rounded"
            >
              Mais
              <ChevronDown className={`w-3 h-3 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <div className="absolute right-0 top-10 w-52 border border-border bg-background shadow-2xl p-2 grid grid-cols-1 gap-1 z-[9998] rounded-md">
                {secondaryLinks.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-bold text-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Notification Bell + Ping + Mobile Toggle */}
        <div className="flex items-center gap-2">
          {/* NotificationBell Persistente */}
          <NotificationBell />

          {/* Ping Display */}
          <PingDisplay />

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 border border-border bg-card text-foreground hover:text-primary hover:border-primary transition-colors rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Alternar Menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown 100% opaque */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto shadow-2xl z-50">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no DeckVerse..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground font-body text-sm"
              />
            </div>
          </form>
          {allMobileLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-heading font-bold tracking-wide text-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-md min-h-[44px]"
            >
              <Icon className="w-4 h-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}