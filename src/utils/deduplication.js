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
  "kaneki ken": "ken_kaneki",

  // Franchise & Collection canonical name keys
  "avatar aang": "avatar_last_airbender",
  "avatar a lenda de aang": "avatar_last_airbender",
  "avatar last airbender": "avatar_last_airbender",
  "avatar the last airbender": "avatar_last_airbender"
};

/**
 * Clean raw Wikitext / MediaWiki lore text into clean readable narrative text.
 * Strips raw wikitext templates like {{...}}, |altbackcolor=#000, '''Chapter 317''', etc.
 */
export function cleanLoreText(rawLore = "", cardName = "", universeName = "") {
  if (!rawLore || typeof rawLore !== "string") {
    return cardName ? `${cardName} é uma figura lendária do universo de ${universeName || "Multiverso"}, destacando-se por seu poder e habilidade incomparáveis.` : "";
  }

  let cleaned = rawLore;

  // 1. Remove curly bracket blocks {{...}} and leftover brackets
  cleaned = cleaned.replace(/\{\{[\s\S]*?\}\}/g, "");
  cleaned = cleaned.replace(/\}\}/g, "");
  cleaned = cleaned.replace(/\{\{/g, "");

  // 2. Extract structured key-values if it's an infobox (like gender, affiliation, occupation)
  const keyValues = [];
  const lines = cleaned.split("\n");
  const filteredLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line is an infobox parameter like "| affiliation = Aizen's Arrancar Army"
    const match = trimmed.match(/^\|?\s*([a-zA-Z0-9_\s]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      let val = match[2].trim().replace(/''+/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1");
      
      // Ignore formatting/style keys
      if (["altbackcolor", "textcolor", "alttextcolor", "maxwidth", "height", "tab1", "tab2", "tab3", "tab4", "width", "align", "style"].includes(key)) {
        continue;
      }
      if (val && val !== "}}" && val !== "null") {
        keyValues.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`);
      }
    } else {
      // Keep non-infobox lines that aren't empty bracket remnants
      if (trimmed && !trimmed.startsWith("}}") && !trimmed.startsWith("{{")) {
        filteredLines.push(trimmed);
      }
    }
  }

  cleaned = filteredLines.join("\n");

  // 3. Strip bold/italics/wiki links
  cleaned = cleaned
    .replace(/'''(.*?)'''/g, "$1")
    .replace(/''(.*?)''/g, "$1")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/^==+\s*(.*?)\s*==+/gm, "$1:")
    .replace(/&nbsp;/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  // If we extracted infobox key-values, append them formatted
  if (keyValues.length > 0) {
    const formattedKV = keyValues.map(kv => `• ${kv}`).join("\n");
    if (cleaned.length > 20) {
      cleaned = `${cleaned}\n\n${formattedKV}`;
    } else {
      cleaned = formattedKV;
    }
  }

  // Fallback if cleaned text is too short or empty
  if (cleaned.length < 15) {
    cleaned = `${cardName || "Este personagem"} é uma figura emblemática do universo de ${universeName || "Multiverso"}, possuindo técnicas especiais e presença marcante na história de DeckVerse.`;
  }

  return cleaned;
}

/**
 * Map of canonical franchise information for merging collections
 */
const CANONICAL_COLLECTION_NAMES = [
  { keywords: ["avatar", "aang", "airbender", "dobradores"], name: "Avatar: The Last Airbender", code: "COL-02-ATLA" },
  { keywords: ["marvel"], name: "Marvel Comics Universe", code: "COL-03-MARVEL" },
  { keywords: ["dc universe", "dc comics", "justiça jovem", "super-choque"], name: "DC Universe", code: "COL-03-DC" },
  { keywords: ["naruto", "shippuden"], name: "Naruto Shippuden", code: "COL-01-NAR" },
  { keywords: ["dragon ball", "dragonball", "dbz", "dbs"], name: "Dragon Ball Super", code: "COL-01-DBZ" },
  { keywords: ["bleach"], name: "Bleach Universe", code: "COL-01-BLC" },
  { keywords: ["jujutsu", "kaisen", "jjk"], name: "Jujutsu Kaisen", code: "COL-01-JJK" },
  { keywords: ["attack on titan", "shingeki", "aot"], name: "Attack on Titan", code: "COL-01-AOT" },
  { keywords: ["demon slayer", "kimetsu"], name: "Demon Slayer", code: "COL-01-KNY" },
  { keywords: ["solo leveling"], name: "Solo Leveling", code: "COL-01-SLV" },
  { keywords: ["my hero academia", "boku no hero"], name: "My Hero Academia", code: "COL-01-MHA" },
  { keywords: ["one piece"], name: "One Piece Universe", code: "COL-01-OP" }
];

export function getCanonicalCollectionInfo(rawName = "") {
  if (!rawName || typeof rawName !== "string") return null;
  const lower = rawName.toLowerCase();

  for (const canon of CANONICAL_COLLECTION_NAMES) {
    if (canon.keywords.some(kw => lower.includes(kw))) {
      return canon;
    }
  }
  return null;
}

/**
 * Strips episode titles, season markers, and inner collection/series prefixes from card names.
 * Example: "Naruto Shippuden Ep. 120 - Naruto Uzumaki" -> "Naruto Uzumaki"
 * Example: "Eren Yeager (Season 4 Episode 5)" -> "Eren Yeager"
 * Example: "Marvel Comics - Iron Man" -> "Iron Man"
 */
export function cleanCardName(rawName = "") {
  if (!rawName || typeof rawName !== "string") return "";

  let cleaned = rawName.trim();

  // Remove common episode/season patterns
  cleaned = cleaned
    .replace(/\b(ep|episode|episódio|episodio|season|temporada|s\d+e\d+|\d+x\d+)\s*[-.:]?\s*\d+\b/gi, "")
    .replace(/\[(ep|episode|episódio|season|temporada)\s*\d+\]/gi, "")
    .replace(/\((ep|episode|episódio|season|temporada)\s*\d+\)/gi, "");

  // Remove prefixes like "Marvel Comics - ", "DC Universe - ", "Naruto Shippuden: "
  cleaned = cleaned
    .replace(/^(marvel comics universe|marvel comics|marvel cinematic|dc universe|dc comics|naruto shippuden|dragon ball z|dragon ball super|attack on titan|demon slayer|my hero academia)\s*[-:]\s*/gi, "")
    .replace(/^col-\d+-[a-z0-9]+\s*[-:]\s*/gi, "");

  // Remove trailing empty parentheses or brackets left behind
  cleaned = cleaned.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "").trim();

  return cleaned || rawName;
}

/**
 * Normalizes a raw string into a canonical identifier key.
 * Strips accents, lowercases, removes non-alphanumerics, and handles multi-language equivalences.
 */
export function normalizeNameKey(rawName = "") {
  if (!rawName || typeof rawName !== "string") return "";

  const cleaned = cleanCardName(rawName)
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
 * Merges collections with similar names (e.g. "Marvel Comics" & "Marvel Cinematic" -> shorter "Marvel").
 * Longer collection names get merged into shorter ones if they share the same root.
 */
export function deduplicateCollections(collectionsList = []) {
  if (!Array.isArray(collectionsList)) return [];

  const map = new Map();

  for (const col of collectionsList) {
    if (!col) continue;

    const rawName = col.name || col.title || "";
    const canonInfo = getCanonicalCollectionInfo(rawName);

    const canonicalName = canonInfo ? canonInfo.name : rawName;
    const nameKey = normalizeNameKey(canonicalName);
    const codeKey = ((canonInfo && canonInfo.code) || col.code || col.id || "").toString().toUpperCase().trim();

    let primaryKey = nameKey ? `col_${nameKey}` : `code_${codeKey}`;

    // Look for similar/prefix collections to merge (e.g. Avatar (Aang) -> Avatar: The Last Airbender)
    for (const [existingKey, existingCol] of map.entries()) {
      const existingNameKey = normalizeNameKey(existingCol.name || "");
      if (existingNameKey && nameKey) {
        if (nameKey === existingNameKey || nameKey.startsWith(existingNameKey) || existingNameKey.startsWith(nameKey)) {
          primaryKey = existingKey;
          break;
        }
      }
    }

    if (!map.has(primaryKey)) {
      map.set(primaryKey, {
        ...col,
        name: canonicalName,
        code: (canonInfo && canonInfo.code) || col.code || codeKey
      });
    } else {
      const existing = map.get(primaryKey);
      map.set(primaryKey, {
        ...existing,
        ...col,
        id: existing.id || col.id,
        code: existing.code || col.code || (canonInfo && canonInfo.code),
        name: canonicalName,
        description: (existing.description && existing.description.length > (col.description || "").length)
          ? existing.description
          : (col.description || existing.description),
        image_url: existing.image_url || col.image_url || "",
        character_count: Math.max(existing.character_count || 0, col.character_count || 0)
      });
    }
  }

  return Array.from(map.values());
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
 * Merges duplicate entries: if one card lacks an image, transfers its missing data into the card WITH an image.
 */
export function deduplicateCards(cardsList = []) {
  if (!Array.isArray(cardsList)) return [];

  const canonicalMap = new Map();

  for (const rawCard of cardsList) {
    if (!rawCard || (!rawCard.name && !rawCard.title)) continue;

    // Clean name (strip episode & collection markers)
    const card = {
      ...rawCard,
      name: cleanCardName(rawCard.name || rawCard.title || "")
    };

    const nameKey = normalizeNameKey(card.name);
    const versionKey = (card.version || card.form || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const colKey = (card.collection_id || card.collection_code || "").toUpperCase().trim();
    const cardIdKey = (card.id || card.card_id || "").toString();

    // Key includes collection and version/form to avoid deleting distinct character transformations/versions
    const key = nameKey
      ? `card_${colKey ? colKey + "_" : ""}${nameKey}${versionKey ? "_" + versionKey : ""}`
      : `id_${cardIdKey}`;

    if (!canonicalMap.has(key)) {
      canonicalMap.set(key, { ...card });
    } else {
      const existing = canonicalMap.get(key);

      const hasImgExisting = Boolean(existing.image_url || existing.img_oficial || existing.img_custom);
      const hasImgCurrent = Boolean(card.image_url || card.img_oficial || card.img_custom);

      let base, fallback;

      // Transfer rule: If existing has NO image and current HAS image -> base = current (with image), fallback = existing (transfer data)
      if (!hasImgExisting && hasImgCurrent) {
        base = card;
        fallback = existing;
      } else if (hasImgExisting && !hasImgCurrent) {
        base = existing;
        fallback = card;
      } else {
        // Compare rarity rank or quality
        const existingRank = RARITY_RANK[existing.rarity] || 1;
        const currentRank = RARITY_RANK[card.rarity] || 1;
        const keepCurrentAsBase = currentRank > existingRank || (card.quality_score || 0) > (existing.quality_score || 0);

        base = keepCurrentAsBase ? card : existing;
        fallback = keepCurrentAsBase ? existing : card;
      }

      // Merge tags
      const mergedTags = Array.from(new Set([
        ...(base.tags || []),
        ...(fallback.tags || [])
      ])).filter(t => typeof t === "string" && t.trim().length > 0);

      // Merge skills
      const mergedSkills = (base.skills && base.skills.length >= 2)
        ? base.skills
        : (fallback.skills && fallback.skills.length > 0 ? fallback.skills : base.skills || []);

      canonicalMap.set(key, {
        ...fallback,
        ...base,
        id: base.id || fallback.id,
        card_id: base.card_id || fallback.card_id,
        name: base.name || fallback.name,
        collection_id: base.collection_id || fallback.collection_id,
        // Ensure image is preserved from the one that has it
        img_custom: base.img_custom || fallback.img_custom || "",
        img_oficial: base.img_oficial || fallback.img_oficial || base.image_url || fallback.image_url || "",
        image_url: base.image_url || fallback.image_url || base.img_oficial || fallback.img_oficial || "",
        lore: (base.lore && base.lore.length > 20) ? base.lore : (fallback.lore || base.lore || ""),
        tags: mergedTags,
        skills: mergedSkills,
        // Transfer missing master prompt classifications
        personality: base.personality || fallback.personality || "",
        identity: base.identity || fallback.identity || "",
        origin: base.origin || fallback.origin || "",
        narrative_function: base.narrative_function || fallback.narrative_function || "",
        character_class: base.character_class || fallback.character_class || "",
        power_type: base.power_type || fallback.power_type || "",
        // Sanitize and take max stats
        hp: Math.min(30000, Math.max(base.hp || 0, fallback.hp || 0, 400)),
        attack: Math.min(5000, Math.max(base.attack || 0, fallback.attack || 0, 50)),
        defense: Math.min(5000, Math.max(base.defense || 0, fallback.defense || 0, 50)),
        speed: Math.min(3000, Math.max(base.speed || 0, fallback.speed || 0, 50)),
        mag: Math.min(5000, Math.max(base.mag || 0, fallback.mag || 0, 0)),
        quality_score: Math.max(base.quality_score || 0, fallback.quality_score || 0)
      });
    }
  }

  return Array.from(canonicalMap.values());
}

/**
 * Enforces a strict limit of max N cards (including bosses) per collection.
 */
export function enforceCollectionMaxLimit(cardsList = [], bossesList = [], maxPerCollection = 100) {
  const collectionCounts = new Map();
  const allowedCards = [];

  for (const card of cardsList) {
    if (!card) continue;
    const colId = (card.collection_id || "MULTIVERSE").toUpperCase().trim();
    const currentCount = collectionCounts.get(colId) || 0;

    if (currentCount < maxPerCollection) {
      allowedCards.push(card);
      collectionCounts.set(colId, currentCount + 1);
    }
  }

  return allowedCards;
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
