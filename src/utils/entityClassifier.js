// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Entity Classifier & Structural Normalization Engine
// Ensures 100% strict separation between Collections, Characters, Items, Bosses, and Metadata.
// Converts non-character concepts (episodes, games, movies, sagas, locations, etc.)
// into canonical metadata attributes rather than standalone card entities.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that identify non-character concepts erroneously stored as cards
 */
export const NON_CHARACTER_PATTERNS = [
  // Gallery & Wiki Administrative Pages
  /\/Gallery$/i,
  /\bGallery\b/i,
  /^(Category|Categoria|Template|Predefini[çc][ãa]o):/i,
  /^(Lista\s+de|List\s+of)/i,
  /^(File|Arquivo|Image|Imagem):/i,

  // Episodes & Seasons & Chapters
  /^(epis[óo]dio|episode)\s*\d*/i,
  /\b(episode|epis[óo]dio)\b/i,
  /^(temporada|season)\s*\d*/i,
  /\b(season|temporada)\b/i,
  /^(cap[íi]tulo|chapter)\s*\d*/i,
  /\b(chapter|cap[íi]tulo)\b/i,
  /^(vol(ume)?)\s*\d*/i,
  /\b\(volume\)/i,
  /\bvolume\b/i,
  /\b(s\d+e\d+|\d+x\d+)\b/i,
  /^the power$/i,

  // Universes, Dimensions, Timelines
  /\bEarth-\d+\b/i,
  /\bTimeline\b/i,
  /\bUniverse\b/i,
  /\bMultiverse\b/i,

  // Standalone Game & Movie Titles (when stored as cards)
  /^(god of war ragnarök|god of war|cyberpunk 2077|elden ring|bloodborne|dark souls|mortal kombat|the witcher|skyrim|street fighter|tekken)$/i,
  /^(spider-man: no way home|avengers: endgame|infinity war|multiverse of madness|naruto mobile)$/i,
  /^(filme|movie|jogo|game|dlc|série|series)$/i,
  /\b(mobile|online|ragnarök|remake|remaster|edition)\b/i,

  // Sagas & Arcs
  /^(saga|arco|arc)\s+/i,
  /\b(saga|arco)\b/i,
  /^saga\s+(majin boo|cell|frieza|saiyajin|pilaf|soul society|marineford|wano|shibuya|dressrosa)$/i,
  /^arco\s+(pain|chimera ants|mugen train|arrancar|greed island)$/i,

  // Organizations & Factions as standalone cards
  /^(liga da justiça|akatsuki|vought|avengers|vingadores|gotei 13|esquadrão de caçadores|tropa de exploração|sociedade do anel|os sete|bando do falcão|x-men|phantom troupe|trupe fantasma)$/i,

  // Locations & Places
  /^(gotham|konoha|namekusei|asgard|tóquio jujutsu|tokyo|yharnam|hogwarts|arrakis|westeros|paradis|shiganshina)$/i,

  // Abilities, Jutsu & Powers standalone
  /\b(technique|jutsu|ability|skill|art|senjutsu|sage art)\b/i,
  /^(kamehameha|genki dama|teletransporte|rasengan|chidori|getsuga tensho|bankai|expansão de domínio|amaterasu|susanoo)$/i,

  // Historical Periods & Synthetic Artificial Names
  /^(antiguidade\s+cl[áa]ssica|era\s+das\s+revolu[çc][õo]es|mestres\s+da\s+arte\s+&\s+ci[êe]ncia|jap[ãa]o\s+feudal)$/i,
  /hero$/i,

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
  "manopla do infinito", "grimório", "flecha de stand", "frasco de estus", "musa de atena",
  "sword of the thunder god", "thunder god sword", "flash bomb", "bomba de luz"
];

/**
 * Known Boss Names for reclassifying stray cards into the Bosses entity table
 */
export const KNOWN_BOSS_NAMES = [
  "darkseid", "thanos", "vilgax", "muzan", "muzan kibutsuji", "frieza", "freeza",
  "sukuna", "ryomen sukuna", "sephiroth", "jiren", "eren yeager (titã fundador)",
  "griffith (femto)", "yhwach", "lord boros", "malenia", "odin", "kaido", "madara uchiha"
];

/**
 * Known Character Names or Key Expressions that MUST NOT be auto-purged/invalidated
 */
export const PROTECTED_CHARACTER_PATTERNS = [
  /saga\s+de\s+g[êe]meos/i,
  /gemini\s+saga/i,
  /^amaterasu$/i,
  /^susanoo$/i,
  /virgil\s+hawkins/i,
  /super-choque/i,
  /miss\s+martian/i,
  /m'gann/i,
  /hamura/i,
  /shikamaru/i,
  /king\s+bradley/i,
  /ereshkigal/i,
  /ishtar/i,
  /vandal\s+savage/i
];

/**
 * Classifica detalhadamente o tipo de entidade
 */
export function classifyEntityDetail(item = {}) {
  const name = (item.name || item.title || "").trim();
  const lowerName = name.toLowerCase();
  const rawType = (item.type || item.entity_type || "").trim().toLowerCase();

  // 1. Subpágina de galeria Wiki ou Desambiguação
  if (name.includes("/Gallery") || name.endsWith("/Gallery") || lowerName.endsWith("gallery")) {
    const parentEntityName = name.replace(/\/Gallery$/i, "").trim();
    return {
      entityType: "metadata",
      metadataType: "gallery",
      entityTypeConfidence: 0.99,
      isCardAllowed: false,
      isWikiGallerySubpage: true,
      parentEntityName: parentEntityName || name,
      reason: `Subpágina de galeria de mídia ("${name}").`
    };
  }

  if (lowerName.includes("(disambiguation)") || lowerName.includes("desambiguação")) {
    return {
      entityType: "metadata",
      metadataType: "disambiguation",
      entityTypeConfidence: 0.99,
      isCardAllowed: false,
      reason: `Página de desambiguação ("${name}").`
    };
  }

  // 0. Personagens protegidos conhecidos
  const isProtectedCharacter = PROTECTED_CHARACTER_PATTERNS.some(p => p.test(name));
  if (isProtectedCharacter) {
    return {
      entityType: "character",
      metadataType: null,
      entityTypeConfidence: 0.99,
      isCardAllowed: true,
      reason: `Personagem em lista de proteção canônica ("${name}").`
    };
  }

  // 2. Coleção
  if (rawType === "collection" || item._sourceTable === "Collection" || item.code?.startsWith("COL-") || item.bank?.startsWith("COL-")) {
    return {
      entityType: "collection",
      metadataType: null,
      entityTypeConfidence: 0.98,
      isCardAllowed: false,
      reason: "Coleção estrutural do sistema."
    };
  }

  // Metadado / Lore / Universo
  if (rawType === "metadata" || item._sourceTable === "Lore" || item._sourceTable === "Universe" || item.lore_id) {
    return {
      entityType: "metadata",
      metadataType: "concept",
      entityTypeConfidence: 0.99,
      isCardAllowed: false,
      reason: `Registro de Lore/Metadado ("${name}").`
    };
  }

  // 3. Sintéticos (Vão para QUARENTENA, não invalid)
  if (/hero$/i.test(name) && !["superman", "deku", "all might", "hercules", "super-choque"].some(k => lowerName.includes(k))) {
    return {
      entityType: "quarantine",
      metadataType: "synthetic_data",
      entityTypeConfidence: 0.85,
      isCardAllowed: false,
      syntheticAlert: true,
      reason: `Entrada sintética suspeita ("${name}"). Enviada para quarentena.`
    };
  }

  // 4. Itens
  if (rawType === "item" || rawType === "equipment" || rawType === "artifact" || KNOWN_ITEM_NAMES.some(i => lowerName.includes(i))) {
    return {
      entityType: "item",
      metadataType: "equipment",
      entityTypeConfidence: 0.95,
      isCardAllowed: true,
      reason: `Item/Equipamento (${name}).`
    };
  }

  // 5. Bosses (Apenas se a fonte for a tabela de Boss, se for explicitamente boss, ou se tiver o flag is_boss)
  if (item._sourceTable === "Boss" || item.type === "boss" || item.is_boss === true) {
    return {
      entityType: "boss",
      metadataType: "boss_entity",
      entityTypeConfidence: 0.95,
      isCardAllowed: true,
      reason: `Chefe/Boss (${name}).`
    };
  }

  // 6. Habilidades / Técnicas (somente se não for personagem com stats)
  if (!item.hp && !item.attack && (/\b(technique|jutsu|ability|senjutsu|sage art|transformation technique)\b/i.test(lowerName) || /\b(rasengan|chidori|kamehameha|bankai|domain expansion)\b/i.test(lowerName))) {
    return {
      entityType: "metadata",
      metadataType: "ability",
      entityTypeConfidence: 0.95,
      isCardAllowed: false,
      reason: `Técnica/Habilidade ("${name}").`
    };
  }

  // 7. Universos
  if (/\bEarth-\d+\b/i.test(name) || /^(earth-\d+|universe \d+|dimensão \w+)$/i.test(lowerName)) {
    return {
      entityType: "metadata",
      metadataType: "universe",
      entityTypeConfidence: 0.98,
      isCardAllowed: false,
      reason: `Registro de Universo/Continuidade ("${name}").`
    };
  }

  // 8. Mídia / Jogos
  if (/\b(naruto mobile|ragnarök|cyberpunk 2077|elden ring|dlc)\b/i.test(lowerName) || lowerName.endsWith("mobile")) {
    return {
      entityType: "metadata",
      metadataType: "game",
      entityTypeConfidence: 0.95,
      isCardAllowed: false,
      reason: `Título de Jogo/Mídia ("${name}").`
    };
  }

  // 9. Episódios, Volumes, Sagas, Períodos Históricos
  if (/\(volume\)/i.test(lowerName) || /^vol(ume)?\s*\d*/i.test(lowerName) || /^(episode|episódio|season|temporada|chapter|capítulo)\s*\d*/i.test(lowerName)) {
    return {
      entityType: "metadata",
      metadataType: lowerName.includes("volume") ? "volume" : "episode",
      entityTypeConfidence: 0.98,
      isCardAllowed: false,
      reason: `Volume/Episódio/Capítulo ("${name}").`
    };
  }

  if ((/^(saga|arco|arc)\s+/i.test(lowerName) || lowerName.startsWith("saga ") || lowerName.startsWith("arco ")) && !lowerName.includes("de gêmeos") && !lowerName.includes("gemini")) {
    return {
      entityType: "metadata",
      metadataType: "saga",
      entityTypeConfidence: 0.95,
      isCardAllowed: false,
      reason: `Saga/Arco Narrativo ("${name}").`
    };
  }

  if (/^(antiguidade|era das revoluções|mestres da arte|japão feudal)$/i.test(lowerName)) {
    return {
      entityType: "metadata",
      metadataType: "historical_period",
      entityTypeConfidence: 0.98,
      isCardAllowed: false,
      reason: `Período Histórico ("${name}").`
    };
  }

  // 10. Regex Geral
  if (NON_CHARACTER_PATTERNS.some(p => p.test(name))) {
    return {
      entityType: "metadata",
      metadataType: "concept",
      entityTypeConfidence: 0.90,
      isCardAllowed: false,
      reason: `Termo não-personagem detectado ("${name}").`
    };
  }

  // 11. Personagem Válido
  return {
    entityType: "character",
    metadataType: null,
    entityTypeConfidence: 0.95,
    isCardAllowed: true,
    reason: "Personagem válido aprovado."
  };
}

/**
 * Validates if an entity name or card payload represents a non-character element
 */
export function isInvalidCardEntity(name = "", cardPayload = {}) {
  const detail = classifyEntityDetail({ name, ...cardPayload });
  return !detail.isCardAllowed;
}

/**
 * Determines the primary canonical entity classification type
 * Returns: "collection" | "character" | "item" | "boss" | "invalid_card" | "metadata"
 */
export function classifyEntityType(item = {}) {
  const detail = classifyEntityDetail(item);
  if (!detail.isCardAllowed) {
    return detail.entityType === "metadata" ? "metadata" : "invalid_card";
  }
  return detail.entityType;
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
