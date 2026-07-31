import React from "react";
import { Crown, Gem, Star, Circle, Flame, Sparkles, Zap, Shield, AlertTriangle } from "lucide-react";
import { RARITY_TIERS, RARITY_ALIAS } from "@/constants";

// Resolve rarity string (old or new) → RARITY_TIERS config
function resolveTier(rarity) {
  if (!rarity) return RARITY_TIERS["C"];
  if (RARITY_TIERS[rarity]) return RARITY_TIERS[rarity];
  const alias = RARITY_ALIAS[rarity];
  if (alias && RARITY_TIERS[alias]) return RARITY_TIERS[alias];
  return RARITY_TIERS["C"];
}

const TIER_ICON = {
  C: Circle, UC: Star, R: Gem, SR: Gem,
  SSR: Sparkles, UR: Crown, LR: Crown,
  MR: Flame, BOSS: Shield, ANOMALIA: AlertTriangle,
};

function getTierIcon(code) {
  return TIER_ICON[code] || Circle;
}

export function RarityBadge({ rarity }) {
  const code = RARITY_TIERS[rarity] ? rarity : (RARITY_ALIAS[rarity] || "C");
  const config = resolveTier(rarity);
  const Icon = getTierIcon(code);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-heading font-bold tracking-wide border ${config.bg} ${config.color} ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

const ROLE_CONFIG = {
  DPS:      { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30"     },
  Tank:     { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30"    },
  Support:  { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30"   },
  Healer:   { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Assassin: { bg: "bg-violet-500/15",  text: "text-violet-400",  border: "border-violet-500/30"  },
  Mage:     { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/30"    },
  Berserker:{ bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/30"  },
  Sniper:   { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-500/30"    },
  Invoker:  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
  Bard:     { bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/30"    },
};

export function RoleBadge({ role }) {
  const config = ROLE_CONFIG[role] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-heading font-bold tracking-wide border ${config.bg} ${config.text} ${config.border}`}>
      {role}
    </span>
  );
}

export function ElementBadge({ element }) {
  const ELEMENT_MAP = {
    Fire:      { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", emoji: "🔥" },
    Water:     { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   emoji: "💧" },
    Earth:     { bg: "bg-amber-700/15",  text: "text-amber-600",  border: "border-amber-700/30",  emoji: "🪨" },
    Wind:      { bg: "bg-teal-500/15",   text: "text-teal-400",   border: "border-teal-500/30",   emoji: "🌪️" },
    Lightning: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", emoji: "⚡" },
    Shadow:    { bg: "bg-slate-500/15",  text: "text-slate-400",  border: "border-slate-500/30",  emoji: "🌑" },
    Light:     { bg: "bg-sky-300/15",    text: "text-sky-300",    border: "border-sky-300/30",    emoji: "✨" },
  };
  const config = ELEMENT_MAP[element] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", emoji: "?" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-heading font-bold tracking-wide border ${config.bg} ${config.text} ${config.border}`}>
      {config.emoji} {element}
    </span>
  );
}

// Tag badge — used in card details and synergy builder
export function TagBadge({ tag }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading font-bold border border-primary/30 bg-primary/5 text-primary">
      #{tag}
    </span>
  );
}

// Card border class based on level (XP progression visual)
export function getCardBorderClass(level = 1, rarity = "C") {
  const isAnomalia = rarity === "ANOMALIA";
  if (isAnomalia || level >= 81) return "border-fuchsia-500/60 shadow-fuchsia-500/50 shadow-lg animate-pulse";
  if (level >= 51) return "border-primary/70 shadow-primary/40 shadow-md";
  if (level >= 21) return "border-primary/40 shadow-primary/20 shadow-sm";
  const tierConfig = resolveTier(rarity);
  return tierConfig.border;
}