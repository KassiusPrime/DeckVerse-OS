// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Multi-Language Name Normalization & Deduplication Utility
// Cleanly removes duplicate cards and collections across Portuguese, English,
// Japanese Romaji, and common character/franchise aliases.
// ════════════════════════════════════════════════════════════════════════════

// Comprehensive Dictionary of Multi-Language & Multi-Alias Equivalent Names
export const NAME_EQUIVALENTS = {
  // ─── COLLECTIONS & FRANCHISES ───
  "attack on titan": "attack_on_titan",
  "ataque dos titas": "attack_on_titan",
  "ataque dos titãs": "attack_on_titan",
  "shingeki no kyojin": "attack_on_titan",
  "tita de ataque": "attack_on_titan",
  "aot": "attack_on_titan",

  "demon slayer": "demon_slayer",
  "kimetsu no yaiba": "demon_slayer",
  "matador de demonios": "demon_slayer",
  "matador de demônios": "demon_slayer",
  "ds": "demon_slayer",

  "my hero academia": "my_hero_academia",
  "boku no hero academia": "my_hero_academia",
  "boku no hero": "my_hero_academia",
  "minha academia de herois": "my_hero_academia",
  "minha academia de heróis": "my_hero_academia",
  "mha": "my_hero_academia",

  "dragon ball z": "dragon_ball_z",
  "dragon ball": "dragon_ball_z",
  "dbz": "dragon_ball_z",
  "dragon ball super": "dragon_ball_z",
  "dbs": "dragon_ball_z",

  "fullmetal alchemist": "fullmetal_alchemist",
  "alquimista de aco": "fullmetal_alchemist",
  "alquimista de aço": "fullmetal_alchemist",
  "hagane no renkinjutsushi": "fullmetal_alchemist",
  "fullmetal alchemist brotherhood": "fullmetal_alchemist",
  "fma": "fullmetal_alchemist",

  "seven deadly sins": "seven_deadly_sins",
  "nanatsu no taizai": "seven_deadly_sins",
  "os sete pecados capitais": "seven_deadly_sins",
  "sete pecados capitais": "seven_deadly_sins",

  "the legend of zelda": "legend_of_zelda",
  "legend of zelda": "legend_of_zelda",
  "a lenda de zelda": "legend_of_zelda",
  "zelda": "legend_of_zelda",

  "the last of us": "the_last_of_us",
  "o ultimo de nos": "the_last_of_us",
  "o último de nós": "the_last_of_us",
  "tlou": "the_last_of_us",

  "game of thrones": "game_of_thrones",
  "a guerra dos tronos": "game_of_thrones",
  "guerra dos tronos": "game_of_thrones",
  "got": "game_of_thrones",

  "lord of the rings": "lord_of_the_rings",
  "the lord of the rings": "lord_of_the_rings",
  "o senhor dos aneis": "lord_of_the_rings",
  "o senhor dos anéis": "lord_of_the_rings",
  "senhor dos aneis": "lord_of_the_rings",
  "lotr": "lord_of_the_rings",

  "harry potter": "harry_potter",
  "harry potter series": "harry_potter",
  "hp": "harry_potter",

  "hora de aventura": "adventure_time",
  "adventure time": "adventure_time",

  "invencivel": "invincible",
  "invencível": "invincible",
  "invincible": "invincible",

  "saint seiya": "saint_seiya",
  "os cavaleiros do zodiaco": "saint_seiya",
  "os cavaleiros do zodíaco": "saint_seiya",
  "cavaleiros do zodiaco": "saint_seiya",
  "cavaleiros do zodíaco": "saint_seiya",

  "yu yu hakusho": "yu_yu_hakusho",
  "yuyu hakusho": "yu_yu_hakusho",

  "jojo bizarre adventure": "jojo_bizarre_adventure",
  "jojos bizarre adventure": "jojo_bizarre_adventure",
  "jojo no kimyou na bouken": "jojo_bizarre_adventure",
  "jojo": "jojo_bizarre_adventure",

  "mitologia grega": "greek_mythology",
  "greek mythology": "greek_mythology",

  "mitologia egipcia": "egyptian_mythology",
  "mitologia egípcia": "egyptian_mythology",
  "egyptian mythology": "egyptian_mythology",

  "mitologia japonesa": "japanese_mythology",
  "japanese mythology": "japanese_mythology",

  "mitologia nordica": "norse_mythology",
  "mitologia nórdica": "norse_mythology",
  "norse mythology": "norse_mythology",

  "mitologia mesopotamica": "mesopotamian_mythology",
  "mitologia mesopotâmica": "mesopotamian_mythology",
  "mesopotamian mythology": "mesopotamian_mythology",

  "mitologia maori & polinesia": "polynesian_mythology",
  "mitologia maori e polinesia": "polynesian_mythology",
  "mitologia maori & polinésia": "polynesian_mythology",
  "polynesian mythology": "polynesian_mythology",

  "antiguidade classica": "classical_antiquity",
  "antiguidade clássica": "classical_antiquity",
  "classical antiquity": "classical_antiquity",

  "era das revolucoes": "age_of_revolutions",
  "era das revoluções": "age_of_revolutions",
  "age of revolutions": "age_of_revolutions",

  "mestres da arte & ciencia": "masters_art_science",
  "mestres da arte e ciencia": "masters_art_science",
  "mestres da arte & ciência": "masters_art_science",
  "masters of art & science": "masters_art_science",

  "japao feudal & samurai": "feudal_japan",
  "japão feudal & samurai": "feudal_japan",
  "japao feudal e samurai": "feudal_japan",
  "feudal japan & samurai": "feudal_japan",

  "dc universe": "dc_universe",
  "universo dc": "dc_universe",
  "dc comics": "dc_universe",

  "marvel comics universe": "marvel_universe",
  "universo marvel": "marvel_universe",
  "marvel comics": "marvel_universe",
  "marvel": "marvel_universe",

  // ─── CHARACTERS / CARDS ───
  "son goku": "son_goku",
  "goku": "son_goku",
  "son gokuu": "son_goku",
  "kakarotto": "son_goku",
  "kakarot": "son_goku",

  "naruto uzumaki": "naruto_uzumaki",
  "uzumaki naruto": "naruto_uzumaki",
  "naruto": "naruto_uzumaki",

  "sasuke uchiha": "sasuke_uchiha",
  "uchiha sasuke": "sasuke_uchiha",
  "sasuke": "sasuke_uchiha",

  "kakashi hatake": "kakashi_hatake",
  "hatake kakashi": "kakashi_hatake",
  "kakashi": "kakashi_hatake",

  "itachi uchiha": "itachi_uchiha",
  "uchiha itachi": "itachi_uchiha",
  "itachi": "itachi_uchiha",

  "levi ackerman": "levi_ackerman",
  "captain levi": "levi_ackerman",
  "capitao levi": "levi_ackerman",
  "capitão levi": "levi_ackerman",
  "levi": "levi_ackerman",

  "eren yeager": "eren_yeager",
  "eren jaeger": "eren_yeager",
  "eren": "eren_yeager",

  "mikasa ackerman": "mikasa_ackerman",
  "mikasa": "mikasa_ackerman",

  "tanjiro kamado": "tanjiro_kamado",
  "kamado tanjiro": "tanjiro_kamado",
  "tanjiro": "tanjiro_kamado",

  "nezuko kamado": "nezuko_kamado",
  "kamado nezuko": "nezuko_kamado",
  "nezuko": "nezuko_kamado",

  "iron man": "iron_man",
  "homem de ferro": "iron_man",

  "spider-man": "spider_man",
  "spider man": "spider_man",
  "spiderman": "spider_man",
  "homem-aranha": "spider_man",
  "homem aranha": "spider_man",

  "captain america": "captain_america",
  "capitao america": "captain_america",
  "capitão américa": "captain_america",

  "wonder woman": "wonder_woman",
  "mulher maravilha": "wonder_woman",
  "mulher-maravilha": "wonder_woman",

  "the flash": "the_flash",
  "flash": "the_flash",

  "green lantern": "green_lantern",
  "lanterna verde": "green_lantern",

  "superboy": "superboy",
  "super-boy": "superboy",
  "super boy": "superboy",

  "super-choque": "static_shock",
  "super choque": "static_shock",
  "static shock": "static_shock",
  "static": "static_shock",

  "gear": "gear_richie",
  "richie foley": "gear_richie",
  "gear (richie)": "gear_richie",

  "finn the human": "finn_human",
  "finn o humano": "finn_human",
  "finn": "finn_human",

  "jake the dog": "jake_dog",
  "jake o cao": "jake_dog",
  "jake o cão": "jake_dog",
  "jake": "jake_dog",

  "ice king": "ice_king",
  "rei gelado": "ice_king",

  "princess bubblegum": "princess_bubblegum",
  "princesa jujuba": "princess_bubblegum",

  "monkey d. luffy": "monkey_d_luffy",
  "monkey d luffy": "monkey_d_luffy",
  "luffy": "monkey_d_luffy",

  "roronoa zoro": "roronoa_zoro",
  "zoro": "roronoa_zoro",

  "satoru gojo": "satoru_gojo",
  "gojo satoru": "satoru_gojo",
  "gojo": "satoru_gojo",

  "ryomen sukuna": "ryomen_sukuna",
  "sukuna": "ryomen_sukuna",

  "yuji itadori": "yuji_itadori",
  "itadori yuji": "yuji_itadori",

  "geralt of rivia": "geralt_of_rivia",
  "geralt de rivia": "geralt_of_rivia",
  "geralt de rívia": "geralt_of_rivia",

  "seiya de pegaso": "pegasus_seiya",
  "seiya de pégaso": "pegasus_seiya",
  "pegasus seiya": "pegasus_seiya",

  "ikki de fenix": "phoenix_ikki",
  "ikki de fênix": "phoenix_ikki",
  "phoenix ikki": "phoenix_ikki",

  "shiryu de dragao": "dragon_shiryu",
  "shiryu de dragão": "dragon_shiryu",
  "dragon shiryu": "dragon_shiryu",

  "hyoga de cisne": "cygnus_hyoga",
  "cygnus hyoga": "cygnus_hyoga",

  "shun de andromeda": "andromeda_shun",
  "shun de andrômeda": "andromeda_shun",
  "andromeda shun": "andromeda_shun",

  "sung jinwoo": "sung_jinwoo",
  "sung jin-woo": "sung_jinwoo",

  "ken kaneki": "ken_kaneki",
  "kaneki ken": "ken_kaneki"
};

/**
 * Normalizes a raw string into a canonical identifier key.
 * Strips accents, lowercases, removes non-alphanumerics, and handles multi-language equivalences.
 */
export function normalizeNameKey(rawName = "") {
  if (!rawName || typeof rawName !== "string") return "";

  const cleaned = rawName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  if (NAME_EQUIVALENTS[cleaned]) {
    return NAME_EQUIVALENTS[cleaned];
  }

  // Remove leading articles (the, a, o, a, os, as)
  const noArticle = cleaned
    .replace(/^(the|a|an|o|a|os|as)\s+/, "")
    .trim();

  if (NAME_EQUIVALENTS[noArticle]) {
    return NAME_EQUIVALENTS[noArticle];
  }

  return cleaned.replace(/\s+/g, "_");
}

/**
 * Deduplicates a list of collections based on canonical name keys or collection code.
 */
export function deduplicateCollections(collectionsList = []) {
  if (!Array.isArray(collectionsList)) return [];

  const seenMap = new Map();

  for (const col of collectionsList) {
    if (!col) continue;

    const nameKey = normalizeNameKey(col.name || col.title || "");
    const codeKey = (col.code || col.id || "").toString().toUpperCase().trim();
    const primaryKey = nameKey ? `col_${nameKey}` : `code_${codeKey}`;

    if (!seenMap.has(primaryKey)) {
      seenMap.set(primaryKey, { ...col });
    } else {
      const existing = seenMap.get(primaryKey);
      // Merge properties: keep better image, description, or higher character_count
      seenMap.set(primaryKey, {
        ...existing,
        ...col,
        id: existing.id || col.id,
        code: existing.code || col.code,
        name: existing.name || col.name, // keep original display name
        description: (existing.description && existing.description.length > (col.description || "").length)
          ? existing.description
          : (col.description || existing.description),
        image_url: existing.image_url || col.image_url || "",
        character_count: Math.max(existing.character_count || 0, col.character_count || 0)
      });
    }
  }

  return Array.from(seenMap.values());
}

/**
 * Rarity tier rank map for merging cards
 */
const RARITY_RANK = {
  DIV: 10,
  ANOMALIA: 9,
  MR: 8,
  LR: 7,
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  UC: 2,
  C: 1
};

/**
 * Deduplicates a list of cards based on canonical character name keys.
 * Merges duplicate entries across languages and preserves the richest attributes.
 */
export function deduplicateCards(cardsList = []) {
  if (!Array.isArray(cardsList)) return [];

  const canonicalMap = new Map();

  for (const card of cardsList) {
    if (!card || (!card.name && !card.title)) continue;

    const nameKey = normalizeNameKey(card.name || card.title || "");
    const cardIdKey = (card.id || card.card_id || "").toString();

    // Secondary fallback key if name key is empty
    const key = nameKey ? `card_${nameKey}` : `id_${cardIdKey}`;

    if (!canonicalMap.has(key)) {
      canonicalMap.set(key, { ...card });
    } else {
      const existing = canonicalMap.get(key);

      // Compare rarity rank
      const existingRank = RARITY_RANK[existing.rarity] || 1;
      const currentRank = RARITY_RANK[card.rarity] || 1;
      const keepCurrentAsBase = currentRank > existingRank || (card.quality_score || 0) > (existing.quality_score || 0);

      const base = keepCurrentAsBase ? card : existing;
      const fallback = keepCurrentAsBase ? existing : card;

      // Merge tags
      const mergedTags = Array.from(new Set([...(base.tags || []), ...(fallback.tags || [])]));

      // Merge skills
      const mergedSkills = (base.skills && base.skills.length >= 2)
        ? base.skills
        : (fallback.skills && fallback.skills.length > 0 ? fallback.skills : base.skills || []);

      canonicalMap.set(key, {
        ...fallback,
        ...base,
        id: existing.id || card.id,
        card_id: existing.card_id || card.card_id,
        img_custom: base.img_custom || fallback.img_custom || "",
        img_oficial: base.img_oficial || fallback.img_oficial || base.image_url || fallback.image_url || "",
        image_url: base.image_url || fallback.image_url || base.img_oficial || fallback.img_oficial || "",
        lore: (base.lore && base.lore.length > 20) ? base.lore : (fallback.lore || base.lore || ""),
        tags: mergedTags,
        skills: mergedSkills,
        hp: Math.max(base.hp || 0, fallback.hp || 0),
        attack: Math.max(base.attack || 0, fallback.attack || 0),
        defense: Math.max(base.defense || 0, fallback.defense || 0),
        speed: Math.max(base.speed || 0, fallback.speed || 0),
        mag: Math.max(base.mag || 0, fallback.mag || 0),
        quality_score: Math.max(base.quality_score || 0, fallback.quality_score || 0)
      });
    }
  }

  return Array.from(canonicalMap.values());
}

/**
 * Utility to purge and clean all duplicate cards and collections stored in LocalStorage
 */
export function cleanAndDeduplicateAllStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { collectionsRemoved: 0, cardsRemoved: 0 };
  }

  let collectionsRemoved = 0;
  let cardsRemoved = 0;

  try {
    // 1. Deduplicate Collections
    const rawCols = localStorage.getItem("deckverse_Collection");
    if (rawCols) {
      const parsedCols = JSON.parse(rawCols);
      if (Array.isArray(parsedCols)) {
        const cleanCols = deduplicateCollections(parsedCols);
        collectionsRemoved = parsedCols.length - cleanCols.length;
        localStorage.setItem("deckverse_Collection", JSON.stringify(cleanCols));
      }
    }

    // 2. Deduplicate Cards
    const rawCards = localStorage.getItem("deckverse_Card");
    if (rawCards) {
      const parsedCards = JSON.parse(rawCards);
      if (Array.isArray(parsedCards)) {
        const cleanCards = deduplicateCards(parsedCards);
        cardsRemoved = parsedCards.length - cleanCards.length;
        localStorage.setItem("deckverse_Card", JSON.stringify(cleanCards));
      }
    }

    // 3. Deduplicate Franchises if existing
    const rawFran = localStorage.getItem("deckverse_Franchise");
    if (rawFran) {
      const parsedFran = JSON.parse(rawFran);
      if (Array.isArray(parsedFran)) {
        const cleanFran = deduplicateCollections(parsedFran);
        localStorage.setItem("deckverse_Franchise", JSON.stringify(cleanFran));
      }
    }
  } catch (e) {
    console.warn("Error running cleanAndDeduplicateAllStorage:", e);
  }

  return { collectionsRemoved, cardsRemoved };
}
