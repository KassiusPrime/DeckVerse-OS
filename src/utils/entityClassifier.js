// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Entity Classifier & Structural Normalization Engine
// Ensures 100% strict separation between Collections, Characters, Items, and Bosses.
// Converts non-character concepts (episodes, games, movies, sagas, locations, etc.)
// into canonical metadata attributes rather than standalone card entities.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that identify non-character concepts erroneously stored as cards
 */
export const NON_CHARACTER_PATTERNS = [
  // Episodes & Seasons
  /^(epis[óo]dio|episode)\s*\d*/i,
  /^(temporada|season)\s*\d*/i,
  /^(cap[íi]tulo|chapter)\s*\d*/i,
  /^(vol(ume)?)\s*\d*/i,
  /\b(s\d+e\d+|\d+x\d+)\b/i,
  /^the power$/i,

  // Standalone Game & Movie Titles (when stored as cards)
  /^(god of war ragnarök|god of war|cyberpunk 2077|elden ring|bloodborne|dark souls|mortal kombat|the witcher|skyrim|street fighter|tekken)$/i,
  /^(spider-man: no way home|avengers: endgame|infinity war|multiverse of madness)$/i,
  /^(filme|movie|jogo|game|dlc|série|series)$/i,

  // Sagas & Arcs
  /^(saga|arco|arc)\s+/i,
  /\b(saga|arco)\b/i,
  /^saga\s+(majin boo|cell|frieza|saiyajin|pilaf|soul society|marineford|wano|shibuya|dressrosa)$/i,
  /^arco\s+(pain|chimera ants|mugen train|arrancar|greed island)$/i,

  // Organizations & Factions as standalone cards
  /^(liga da justiça|akatsuki|vought|avengers|vingadores|gotei 13|esquadrão de caçadores|tropa de exploração|sociedade do anel|os sete|bando do falcão|x-men|phantom troupe|trupe fantasma)$/i,

  // Locations & Places
  /^(gotham|konoha|namekusei|asgard|tóquio jujutsu|tokyo|yharnam|hogwarts|arrakis|westeros|paradis|shiganshina)$/i,

  // Abilities & Powers standalone
  /^(kamehameha|genki dama|teletransporte|rasengan|chidori|getsuga tensho|bankai|expansão de domínio|amaterasu|susanoo)$/i,

  // Races & Titles standalone
  /^(kryptoniano|saiyajin|shinigami|quincy|arrancar|homúnculo|vampiro|guerreiro divino|o mais forte)$/i,

  // Categories & Technical pages
  /^(category|categoria|template|predefini[çc][ãa]o):/i,
  /^(lista\s+de|list\s+of)/i,
  /^(cole[çc][ãa]o|collection|franquia|franchise|universo|universe)$/i
];

/**
 * Known Item Names for reclassifying stray cards into the Items entity table
 */
export const KNOWN_ITEM_NAMES = [
  "omnitrix", "excalibur", "espada excalibur", "batarang", "lâminas do caos",
  "anel dos lanternas verdes", "death note", "pedra filosofal", "pokébola",
  "pokebola", "semente dos deuses", "master sword", "agarrador", "escudo do capitão américa",
  "manopla do infinito", "grimório", "flecha de stand", "frasco de estus", "musa de atena"
];

/**
 * Known Boss Names for reclassifying stray cards into the Bosses entity table
 */
export const KNOWN_BOSS_NAMES = [
  "darkseid", "thanos", "vilgax", "muzan", "muzan kibutsuji", "frieza", "freeza",
  "sukuna", "ryomen sukuna", "sephiroth", "jiren", "eren yeager (titã fundador)",
  "griffith (femto)", "yhwach", "lord boros", "malenia", "odin"
];

/**
 * Validates if an entity name or card payload represents a non-character element
 */
export function isInvalidCardEntity(name = "", cardPayload = {}) {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;

  // Check explicit invalid type string
  const typeStr = (cardPayload.type || cardPayload.entity_type || "").toLowerCase();
  const invalidTypes = [
    "episode", "season", "game", "movie", "saga", "arc", "chapter",
    "volume", "event", "location", "organization", "ability", "race",
    "class", "title", "concept"
  ];
  if (invalidTypes.includes(typeStr)) {
    return true;
  }

  // Check regex patterns
  return NON_CHARACTER_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Determines the primary canonical entity classification type
 * Returns: "collection" | "character" | "item" | "boss"
 */
export function classifyEntityType(item = {}) {
  const name = (item.name || item.title || "").trim().toLowerCase();
  const rawType = (item.type || item.entity_type || "").trim().toLowerCase();

  if (rawType === "collection" || item.code?.startsWith("COL-") || item.bank?.startsWith("COL-")) {
    return "collection";
  }

  if (rawType === "item" || rawType === "equipment" || rawType === "artifact" || rawType === "consumable" || KNOWN_ITEM_NAMES.some(i => name.includes(i))) {
    return "item";
  }

  if (rawType === "boss" || item.is_boss || KNOWN_BOSS_NAMES.some(b => name.includes(b))) {
    return "boss";
  }

  if (isInvalidCardEntity(item.name || item.title, item)) {
    return "invalid_card";
  }

  return "character";
}

/**
 * Audits and migrates cards dataset, removing invalid cards and attaching
 * useful metadata to characters/bosses/items/collections.
 */
export function auditAndMigrateEntities(cards = [], items = [], bosses = [], collections = []) {
  const stats = {
    charactersBefore: cards.length,
    charactersAfter: 0,
    itemsBefore: items.length,
    itemsAfter: 0,
    bossesBefore: bosses.length,
    bossesAfter: 0,
    invalidFound: 0,
    convertedCount: 0,
    removedCount: 0,
    metadataMigrated: 0,
    ambiguousRecords: []
  };

  const cleanCharacters = [];
  const cleanItems = [...items];
  const cleanBosses = [...bosses];
  const metadataStore = new Map(); // characterKey -> metadata object

  for (const card of cards) {
    if (!card || (!card.name && !card.title)) continue;

    const name = card.name || card.title;
    const classified = classifyEntityType(card);

    if (classified === "invalid_card" || isInvalidCardEntity(name, card)) {
      stats.invalidFound++;

      // Check if it should actually be an Item
      if (KNOWN_ITEM_NAMES.some(i => name.toLowerCase().includes(i))) {
        cleanItems.push({
          id: card.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: card.name,
          type: "item",
          rarity: card.rarity || "SR",
          collection_id: card.collection_id || "COL-00-MULTI",
          item_code: card.card_id || `ITEM-${Date.now()}`,
          description: card.lore || "Objeto com propriedades especiais.",
          image_url: card.img_custom || card.img_oficial || card.image_url || ""
        });
        stats.convertedCount++;
        stats.removedCount++;
        continue;
      }

      // Check if it should actually be a Boss
      if (KNOWN_BOSS_NAMES.some(b => name.toLowerCase().includes(b)) || card.rarity === "BOSS" || card.rarity === "ANOMALIA") {
        cleanBosses.push({
          id: card.id || `boss_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: card.name,
          type: "boss",
          rarity: card.rarity || "BOSS",
          collection_id: card.collection_id || "COL-00-MULTI",
          hp: card.hp ? Math.max(card.hp, 2500) : 3000,
          attack: card.attack || 250,
          defense: card.defense || 180,
          element: card.element || "Shadow",
          lore: card.lore || "",
          image_url: card.img_custom || card.img_oficial || card.image_url || "",
          is_boss: true
        });
        stats.convertedCount++;
        stats.removedCount++;
        continue;
      }

      // Otherwise it's metadata (Episode, Saga, Movie, Game title, Organization, Location)
      // Extract useful metadata to attach to characters of the same collection or series
      const targetCol = card.collection_id || card.series;
      if (targetCol) {
        metadataStore.set(targetCol, {
          origin: card.origin || card.name,
          first_appearance: card.name,
          lore: card.lore,
          image: card.img_custom || card.img_oficial || card.image_url
        });
        stats.metadataMigrated++;
      } else {
        stats.ambiguousRecords.push({ id: card.id, name: card.name, reason: "Sem relação de coleção direta" });
      }

      stats.removedCount++;
    } else {
      // Valid Character
      cleanCharacters.push({
        ...card,
        type: "character"
      });
    }
  }

  // Enrich valid characters with migrated metadata where applicable
  const enrichedCharacters = cleanCharacters.map(char => {
    const colMeta = metadataStore.get(char.collection_id) || metadataStore.get(char.series);
    if (colMeta) {
      return {
        ...char,
        type: "character",
        origin: char.origin || colMeta.origin,
        first_appearance: char.first_appearance || colMeta.first_appearance
      };
    }
    return {
      ...char,
      type: "character"
    };
  });

  // Ensure clean items and bosses have explicit `type`
  const finalItems = cleanItems.map(it => ({ ...it, type: "item" }));
  const finalBosses = cleanBosses.map(b => ({ ...b, type: "boss", is_boss: true }));

  stats.charactersAfter = enrichedCharacters.length;
  stats.itemsAfter = finalItems.length;
  stats.bossesAfter = finalBosses.length;

  return {
    stats,
    characters: enrichedCharacters,
    items: finalItems,
    bosses: finalBosses
  };
}
