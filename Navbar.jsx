import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, Layers, Users, Menu, X, ShoppingBag, Trophy, Swords,
  Sparkles, Zap, TrendingUp, ArrowLeftRight, Gift, Shield, Settings,
  User, BarChart2, Gem, Package, Wifi, Globe, BookOpen
} from "lucide-react";
import { Input } from "@/input";
import { useI18n } from "./i18n";
import DeckVerseLogo from "./DeckVerseLogo";

const SERVERS = ["SA-EAST-SP", "NA-VIRGINIA", "EU-LONDON"];

function PingDisplay() {
  const [ping, setPing] = useState(18);
  const [server] = useState(SERVERS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulated ping fluctuation for immersion
      setPing(Math.floor(12 + Math.random() * 30));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const color = ping < 30 ? "text-green-400" : ping < 80 ? "text-amber-400" : "text-destructive";

  return (
    <div className="hidden lg:flex items-center gap-1.5 border border-border/40 px-2 py-1 shrink-0">
      <Wifi className="w-3 h-3 text-muted-foreground" />
      <span className="text-[9px] font-mono text-muted-foreground">{server}</span>
      <span className={`text-[9px] font-mono font-bold tabular-nums ${color}`}>{ping}ms</span>
    </div>
  );
}

export default function Navbar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
    window.dispatchEvent(new CustomEvent("open-global-search", { detail: { query } }));
  };

  const openGlobalSearch = () => {
    window.dispatchEvent(new CustomEvent("open-global-search", { detail: { query } }));
  };

  const links = [
    { to: "/collections", icon: Layers,         label: t("nav_collections") },
    { to: "/lore",        icon: BookOpen,       label: "Lore Archive" },
    { to: "/fandom",      icon: Globe,          label: "Fandom Importer" },
    { to: "/roster",      icon: Users,          label: t("nav_roster") },
    { to: "/store",       icon: ShoppingBag,    label: t("nav_store") },
    { to: "/leaderboard", icon: Trophy,         label: t("nav_leaderboard") },
    { to: "/battles",     icon: Swords,         label: t("nav_battles") },
    { to: "/gacha",       icon: Sparkles,       label: t("nav_gacha") },
    { to: "/synergy",     icon: Zap,            label: t("nav_synergy") },
    { to: "/upgrade",     icon: TrendingUp,     label: t("nav_upgrade") },
    { to: "/market",      icon: ArrowLeftRight, label: t("nav_market") },
    { to: "/arena",       icon: Swords,         label: t("nav_arena") },
    { to: "/quests",      icon: Gift,           label: t("nav_quests") },
    { to: "/guilds",      icon: Shield,         label: t("nav_guilds") },
    { to: "/trade",       icon: ArrowLeftRight, label: "Trocas" },
    { to: "/ranking",     icon: BarChart2,      label: "Ranking" },
    { to: "/gemshop",     icon: Gem,            label: "Loja Premium" },
    { to: "/inventory",   icon: Package,        label: "Inventário" },
    { to: "/dashboard",   icon: BarChart2,      label: "Dashboard" },
    { to: "/profile",     icon: User,           label: "Perfil" },
    { to: "/settings",    icon: Settings,       label: t("nav_settings") },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
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
              className="pl-9 pr-14 h-8 bg-muted/30 border-border/40 focus:border-primary/60 font-body text-xs cursor-pointer"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/50 border border-border/30 px-1 py-0.2 rounded bg-muted/20 pointer-events-none">
              Ctrl+K
            </kbd>
          </div>
        </form>

        {/* Desktop nav links — horizontally scrollable */}
        <div className="hidden md:flex items-center gap-0 overflow-x-auto max-w-2xl scrollbar-none flex-1">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-heading font-bold tracking-wide text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap shrink-0 border-r border-transparent hover:border-primary/20"
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          ))}
        </div>

        {/* Ping display */}
        <PingDisplay />

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/98 backdrop-blur-xl px-4 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border/50 font-body text-sm"
              />
            </div>
          </form>
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-heading font-bold tracking-wide text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}