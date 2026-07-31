// ════════════════════════════════════════════════
// DECKVERSE — Global Constants
// ════════════════════════════════════════════════

// New Rarity Tiers (Tag System era)
export const RARITY_TIERS = {
  C:        { label: "[C] Comum",           color: "text-zinc-400",    bg: "bg-zinc-500/10",    border: "border-zinc-500/30",    glow: "",                              order: 1  },
  UC:       { label: "[UC] Incomum",        color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30",   glow: "",                              order: 2  },
  R:        { label: "[R] Raro",            color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    glow: "shadow-blue-500/30",            order: 3  },
  SR:       { label: "[SR] Épico",          color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  glow: "shadow-purple-500/40",          order: 4  },
  SSR:      { label: "[SSR] Épico+",        color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", glow: "shadow-fuchsia-500/50",         order: 5  },
  UR:       { label: "[UR] Lendário",       color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   glow: "shadow-amber-500/60 shadow-lg", order: 6  },
  LR:       { label: "[LR] Lendário+",      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  glow: "shadow-orange-500/70 shadow-xl", order: 7 },
  MR:       { label: "[MR] Mítico",         color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     glow: "shadow-red-500/80 shadow-xl",   order: 8  },
  DIV:      { label: "[DIV] Divino",        color: "text-sky-300",     bg: "bg-sky-400/10",     border: "border-sky-400/40",     glow: "shadow-sky-400/80 shadow-2xl",  order: 9, isBoss: true },
  BOSS:     { label: "[BOSS] Divino",       color: "text-sky-300",     bg: "bg-sky-400/10",     border: "border-sky-400/40",     glow: "shadow-sky-400/80 shadow-2xl",  order: 9, isBoss: true },
  TRS:      { label: "[TRS] Transcendente", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/40", glow: "shadow-emerald-400/90 shadow-2xl animate-pulse", order: 10 },
  ANOMALIA: { label: "[ANOMALIA]",          color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/40",    glow: "shadow-rose-500/90 shadow-2xl animate-pulse", order: 10 },
};

// Legacy alias map (old name → new code, for backwards compat)
export const RARITY_ALIAS = {
  Recruit:     "C",
  Adept:       "UC",
  Elite:       "R",
  Champion:    "SR",
  Sovereign:   "UR",
  Ascendant:   "LR",
  Divine:      "DIV",
  Common:      "C",
  Comum:       "C",
  Uncommon:    "UC",
  Incomum:     "UC",
  Rare:        "R",
  Raro:        "R",
  Epic:        "SR",
  Épico:       "SR",
  Legendary:   "UR",
  Lendário:    "UR",
  Mythic:      "MR",
  Mítico:      "MR",
  Transcendent: "TRS",
  Transcendente: "TRS",
};

export const RARITY_ORDER = ["C","UC","R","SR","SSR","UR","LR","MR","DIV","BOSS","TRS","ANOMALIA"];

export const ELEMENTS = ["Fire","Water","Earth","Wind","Lightning","Shadow","Light"];
export const ROLES = ["DPS","Tank","Support","Healer","Assassin","Mage","Berserker","Sniper","Invoker","Bard"];

// MAG / Energy source types (Etapa 7.2)
export const MAG_SOURCES = [
  "Mana","Chakra","Ki","Nen","Cursed Energy","Reiatsu",
  "The Force","Speed Force","Haki","Technology","Divine",
];

// Alignments (Etapa 7.5)
export const ALIGNMENTS = [
  "Hero","Villain","Anti-Hero","Anti-Villain","Neutral",
  "Mercenary","Vigilante","Tyrant","Savior","Renegade",
];

// Races (Etapa 7.4)
export const RACES = [
  "Human","Kryptonian","Saiyan","Otsutsuki","Demon","Angel",
  "Undead","Cyborg","Symbiote","Deity","Hybrid","Dragon",
];

// Universe categories (Etapa 7.3)
export const UNIVERSES = [
  "Anime/Manga","Games","Comics/HQ","Film/Series","Cartoon/Western",
];

// Factions (Etapa 7.6)
export const FACTIONS = [
  "Akatsuki","Survey Corps","Jujutsu High","Gotei 13","Phantom Troupe",
  "Hashiras","Straw Hat Crew","Justice League","Avengers","Bat-Family",
  "Jedi Order","Sith Empire","House Stark","House Targaryen",
  "The Seven (Vought)","Team Rocket","Lin Kuei","Shirai Ryu",
];

export const ELEMENT_EMOJI = {
  Fire:"🔥", Water:"💧", Earth:"🪨", Wind:"🌪️",
  Lightning:"⚡", Shadow:"🌑", Light:"✨",
};

// Elemental triangle (Etapa 6.6): key beats value (+25% dmg / +10% crit)
export const ELEMENT_ADVANTAGE = {
  Fire:"Wind", Wind:"Earth", Earth:"Water", Water:"Fire",
  Lightning:"Water", Shadow:"Light", Light:"Shadow",
};

// Arcane axis — these deal 50% extra vs each other
export const ELEMENT_ARCANE_AXIS = ["Light","Shadow"];

// Damage bonus constants
export const ELEMENT_ADVANTAGE_DMG_BONUS = 0.25;
export const ELEMENT_ADVANTAGE_CRIT_BONUS = 0.10;
export const ELEMENT_WEAKNESS_DMG_PENALTY = -0.25;
export const ELEMENT_ARCANE_DMG_BONUS = 0.50;

// Status effects (Etapa 6.7)
export const STATUS_EFFECTS = {
  Burn:      { element: "Fire",      type: "debuff", desc: "Continuous fire damage for 3 turns" },
  Freeze:    { element: "Water",     type: "debuff", desc: "SPD set to 0 for 1 turn" },
  Paralysis: { element: "Lightning", type: "debuff", desc: "50% chance to fail action each turn" },
  Bleed:     { element: "Physical",  type: "debuff", desc: "Reduces DEF each turn" },
  Frenzy:    { element: "Any",       type: "buff",   desc: "+ATK +SPD but -DEF" },
  ManaShield:{ element: "Light",     type: "buff",   desc: "Damage redirects to MAG instead of HP" },
};

export const RARITY_POWER = {
  C:1, UC:1.3, R:1.7, SR:2.0, SSR:2.5, UR:3.2, LR:4.2, MR:5.5, BOSS:8.0, ANOMALIA:6.5,
  // legacy fallbacks
  Recruit:1, Adept:1.3, Elite:1.7, Champion:2.2, Sovereign:3.0, Ascendant:4.0, Divine:6.0,
  Common:1, Uncommon:1.3, Rare:1.7, Epic:2.2, Legendary:3.0, Mythic:4.0,
};

// Player XP thresholds per level (1–50)
export function getXpForLevel(lvl) {
  return Math.floor(100 * Math.pow(lvl, 1.5));
}

export function getPlayerRank(wins) {
  if (wins >= 500) return { rank: "God of War",   icon: "👑", color: "text-sky-300" };
  if (wins >= 200) return { rank: "Warlord",       icon: "⚔️", color: "text-red-400" };
  if (wins >= 100) return { rank: "Sovereign",     icon: "🏆", color: "text-amber-400" };
  if (wins >= 50)  return { rank: "Champion",      icon: "💎", color: "text-purple-400" };
  if (wins >= 20)  return { rank: "Elite",         icon: "🌟", color: "text-blue-400" };
  if (wins >= 5)   return { rank: "Adept",         icon: "🗡️", color: "text-green-400" };
  return           { rank: "Recruit",              icon: "🛡️", color: "text-zinc-400" };
}