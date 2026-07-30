// ═══════════════════════════════════════════════════
// TAG SYNERGY DEFINITIONS
// Each entry: minCount → bonus activated when ≥N cards share this tag
// ═══════════════════════════════════════════════════

export const TAG_SYNERGIES = {
  // ── Naruto Universe ──
  Uchihas: {
    3: { name: "Chamas Amaterasu", bonus: "+20% Dano de Fogo para toda a equipe", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    5: { name: "Susanoo Supremo",  bonus: "+40% DEF + imunidade a Shadow 1x por batalha", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  },
  Akatsuki: {
    3: { name: "Anel da Ordem",    bonus: "+15% ATQ + ignora 10% DEF inimiga", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  },
  Ninja: {
    3: { name: "Jutsus Combinados", bonus: "+10% Velocidade e +10% Crítico", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  },
  Saiyajins: {
    2: { name: "Poder Saiyan",     bonus: "+20% ATQ quando HP < 50%", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
    4: { name: "Super Saiyan God", bonus: "+50% PWR + aura de regeneração", color: "text-red-300", bg: "bg-red-500/10 border-red-500/30" },
  },

  // ── Marvel Universe ──
  Vingadores: {
    3: { name: "Assemble!",        bonus: "+15% DEF para todo o time", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    4: { name: "Vingadores Unidos", bonus: "+25% DEF + imunidade a debuffs por 1 turno", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  },
  Mutantes: {
    3: { name: "Força X-Gene",     bonus: "+20% de resistência a elementos adversos", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  },
  "X-Men": {
    3: { name: "Equipe X",         bonus: "Líder ganha +30% ATQ e +20% HP", color: "text-yellow-300", bg: "bg-yellow-400/10 border-yellow-400/30" },
  },

  // ── DC Universe ──
  "Justice League": {
    3: { name: "Liga da Justiça",   bonus: "+20% a todos os stats", color: "text-blue-300", bg: "bg-blue-400/10 border-blue-400/30" },
  },
  "Bat-Family": {
    2: { name: "Protocolo Batman",  bonus: "+30% Esquiva + stealth no T1", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  },

  // ── Demon Slayer ──
  Hashiras: {
    3: { name: "Respiração Unificada", bonus: "+25% Dano de todos os ataques", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30" },
  },

  // ── Bleach ──
  "Gotei 13": {
    3: { name: "Bankai Coletivo",   bonus: "+20% ATQ + ignora imunidades uma vez", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
  },

  // ── Jujutsu Kaisen ──
  "Jujutsu High": {
    3: { name: "Energia Amaldiçoada", bonus: "+25% MAG para todos os membros", color: "text-purple-300", bg: "bg-purple-400/10 border-purple-400/30" },
  },

  // ── One Piece ──
  "Straw Hat Crew": {
    3: { name: "Nakama Power",      bonus: "Quando 1 membro cai, os outros ganham +20% ATQ", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  },

  // ── Star Wars ──
  "Jedi Order": {
    3: { name: "Força Unificada",   bonus: "+20% a ATQ e DEF, imunidade a Shadow 1x", color: "text-sky-300", bg: "bg-sky-400/10 border-sky-400/30" },
  },
  "Sith Empire": {
    2: { name: "Lado Sombrio",      bonus: "+30% ATQ mas -15% DEF", color: "text-red-500", bg: "bg-red-600/10 border-red-500/30" },
  },

  // ── Generic crossover tags ──
  Renegado: {
    2: { name: "Aliança Improvável", bonus: "+10% a todos os stats por serem outsiders", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/30" },
  },
  Rival: {
    2: { name: "Rivalidade Acesa",  bonus: "Ambos os rivais ganham +15% Crítico", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  },
  Demônios: {
    3: { name: "Horda Demoníaca",   bonus: "+20% ATQ + causa Medo automaticamente", color: "text-red-600", bg: "bg-red-700/10 border-red-600/30" },
  },
  Cyborgs: {
    2: { name: "Interface Neural",  bonus: "+20% SPD + imunidade a Paralysis", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  },
  Imortais: {
    2: { name: "Chama Eterna",      bonus: "Ressuscita uma vez com 30% HP", color: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/30" },
  },
};

// Compute active tag synergies from a team array
export function calcTagSynergies(team) {
  const tagCount = {};
  for (const card of team) {
    for (const tag of (card.tags || [])) {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }
  }

  const active = [];
  for (const [tag, count] of Object.entries(tagCount)) {
    const def = TAG_SYNERGIES[tag];
    if (!def) continue;
    // Find highest tier unlocked
    const tiers = Object.keys(def).map(Number).sort((a, b) => b - a);
    for (const minCount of tiers) {
      if (count >= minCount) {
        active.push({
          tag,
          count,
          minCount,
          ...def[minCount],
          type: "tag",
        });
        break;
      }
    }
  }

  return active;
}

// All known tags (for the tag input buttons in Admin)
export const ALL_TAGS = [
  // Naruto
  "Uchihas","Akatsuki","Ninja","Otsutsuki","Renegado","Rival",
  // Dragon Ball
  "Saiyajins","Z-Fighters","Guerreiros do Universo 7",
  // Marvel
  "Vingadores","Mutantes","X-Men","Guardiões da Galáxia","S.H.I.E.L.D.",
  // DC
  "Justice League","Bat-Family","Lanternas Verdes","Kryptonianos",
  // Demon Slayer
  "Hashiras","Oni","Respiração Solar",
  // Bleach
  "Gotei 13","Espadas","Arrancar","Quincy",
  // JJK
  "Jujutsu High","Amaldiçoados","Clã Zenin","Clã Gojo",
  // One Piece
  "Straw Hat Crew","Marinha","Yonko","Shichibukai",
  // Attack on Titan
  "Survey Corps","Titãs","Guerreiros Marleyanos","Eldians",
  // Star Wars
  "Jedi Order","Sith Empire","Rebeldes","Mandalorianos",
  // Generic
  "Demônios","Cyborgs","Imortais","Divindades","Dragões","Caçadores","Nobres",
];