// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Script de Migração para Banco de Conhecimento Hierárquico
// (Universe -> Franchise -> Character -> CharacterVersion -> Card)
// ════════════════════════════════════════════════════════════════════════════

import { MEGA_COLLECTIONS, generateExpandedCards } from "../src/data/megaCollectionsData.js";
import { SEED_ARCHETYPES, SEED_PERSONALITIES } from "../services/ai/enrichmentService.js";

// Universos Padrão
export const DEFAULT_UNIVERSES = [
  { id: "univ_anime", name: "Anime & Mangá", slug: "anime-manga", description: "Franquias do universo oriental de animações e mangás", source_wiki: "Fandom Anime" },
  { id: "univ_comics", name: "Quadrinhos & HQs", slug: "comics", description: "Heróis e vilões de quadrinhos ocidentais e graphic novels", source_wiki: "Fandom Comics" },
  { id: "univ_games", name: "Jogos Eletrônicos", slug: "games", description: "Lendas dos games de luta, RPGs e ação", source_wiki: "Fandom Gaming" },
  { id: "univ_movies", name: "Cinema & Séries", slug: "movies", description: "Obras cinematográficas e produções de ficção", source_wiki: "Fandom Cinema" },
  { id: "univ_myth", name: "Mitologia & Folclore", slug: "myth", description: "Mitos e lendas ancestrais do multiverso", source_wiki: "Fandom Mythology" },
];

/**
 * Atribui uma coleção/franquia a um universo pelo código/nome
 */
function mapFranchiseToUniverse(code = "", name = "") {
  const n = (code + " " + name).toLowerCase();
  if (n.includes("mvc") || n.includes("marvel") || n.includes("dc") || n.includes("comic")) return "univ_comics";
  if (n.includes("cyb") || n.includes("game") || n.includes("street") || n.includes("tekken")) return "univ_games";
  if (n.includes("myth") || n.includes("greece") || n.includes("norse")) return "univ_myth";
  return "univ_anime"; // Padrão
}

/**
 * Executa a migração no LocalStorage mantendo compatibilidade 100%
 */
export function runKnowledgeBaseMigration() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const isDone = localStorage.getItem("deckverse_kb_migration_v2_done");
    if (isDone === "true") return;

    console.log("🚀 Iniciando migração do DeckVerse OS para Banco de Conhecimento Hierárquico...");

    // 1. Salva os Universos Padrão
    localStorage.setItem("deckverse_Universe", JSON.stringify(DEFAULT_UNIVERSES));

    // 2. Salva Archetypes e Personalities Padrão
    localStorage.setItem("deckverse_Archetype", JSON.stringify(SEED_ARCHETYPES));
    localStorage.setItem("deckverse_Personality", JSON.stringify(SEED_PERSONALITIES));

    // 3. Mapeia Coleções Existentes para Franchises
    const rawCols = localStorage.getItem("deckverse_Collection");
    const existingCols = rawCols ? JSON.parse(rawCols) : MEGA_COLLECTIONS;

    const franchises = existingCols.map((col, idx) => ({
      id: `fran_${col.code?.toLowerCase() || idx}`,
      universe_id: mapFranchiseToUniverse(col.code, col.name),
      name: col.name,
      slug: col.code || `COL-${idx}`,
      description: col.description || "",
      image_url: col.image_url || ""
    }));

    localStorage.setItem("deckverse_Franchise", JSON.stringify(franchises));

    // 4. Mapeia Cartas Existentes para Character -> CharacterVersion -> Card
    const rawCards = localStorage.getItem("deckverse_Card");
    const cardsToMigrate = rawCards ? JSON.parse(rawCards) : generateExpandedCards();

    const charactersMap = new Map();
    const characterVersions = [];
    const updatedCards = [];
    const idMapping = new Map(); // old_card_id -> new_card_id

    cardsToMigrate.forEach((card, idx) => {
      const canonicalName = card.name || `Personagem ${idx}`;
      const charSlug = canonicalName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const franchiseId = `fran_${(card.collection_id || card.series || "NAR").toLowerCase()}`;

      // Reutiliza Character se já existe para deduplicar
      let characterId = charactersMap.get(charSlug)?.id;
      if (!characterId) {
        characterId = `char_${charSlug}`;
        const newCharacter = {
          id: characterId,
          franchise_id: franchiseId,
          canonical_name: canonicalName,
          gender: card.gender || "Desconhecido",
          species: "Humano/Especial",
          bio: card.lore || `${canonicalName} é um lutador lendário do multiverso.`,
          fandom_url: "",
          archetype_ids: card.role === "Mage" ? ["arch_intelectual"] : card.role === "Tank" ? ["arch_justiceiro"] : ["arch_determinado"],
          power_ids: [],
          tag_ids: card.tags || [],
          personality_ids: ["pers_corajoso"],
          catchphrases: [],
          motivations: "Combater na Arena e proteger sua honra.",
          fears: "Derrota no torneio multiversal.",
          moral_alignment: "Ordeiro e Bom",
          voice_tone: "Determinado"
        };
        charactersMap.set(charSlug, newCharacter);
      }

      // Cria CharacterVersion
      const versionId = `ver_${charSlug}_${(card.version || "base").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${idx}`;
      const newVersion = {
        id: versionId,
        character_id: characterId,
        version_name: card.version || "Classic",
        description: card.lore || "",
        img_avatar: card.img_custom || card.img_oficial || card.image_url || "",
        img_art: card.img_custom || card.img_oficial || card.image_url || "",
        img_banner: card.img_custom || card.img_oficial || card.image_url || "",
        img_icon: card.img_custom || card.img_oficial || card.image_url || "",
        img_thumbnail: card.img_custom || card.img_oficial || card.image_url || "",
        stats: {
          strength: card.attack || 70,
          speed: card.speed || 70,
          intelligence: card.mag || 60,
          strategy: 65,
          resistance: card.defense || 60,
          energy: card.mag || 70,
          precision: 70,
          influence: 60,
          control: 65,
          versatility: 65,
          potential: 80,
          experience: 70
        },
        movepool: (card.skills || []).map((sk, sIdx) => ({
          id: `m_${sIdx}`,
          name: sk.name,
          power: 50 + sIdx * 25,
          type: sk.type === "Ultimate" ? "Ultimate" : "Ataque",
          desc: sk.description
        }))
      };
      characterVersions.push(newVersion);

      // Re-cria Card apontando para character_version_id (SEM o campo element)
      const { element, ...cardWithoutElement } = card;
      const updatedCard = {
        ...cardWithoutElement,
        character_version_id: versionId,
        role: card.role || "DPS"
      };
      updatedCards.push(updatedCard);

      if (card.id) {
        idMapping.set(card.id, updatedCard.id);
      }
    });

    const charactersList = Array.from(charactersMap.values());

    localStorage.setItem("deckverse_Character", JSON.stringify(charactersList));
    localStorage.setItem("deckverse_CharacterVersion", JSON.stringify(characterVersions));
    localStorage.setItem("deckverse_Card", JSON.stringify(updatedCards));

    // 5. Atualiza Rosters dos Jogadores preservando as referências
    const rawRoster = localStorage.getItem("deckverse_Roster");
    if (rawRoster) {
      const rosterList = JSON.parse(rawRoster);
      const updatedRoster = rosterList.map(item => {
        const mappedId = idMapping.get(item.card_id);
        if (mappedId) {
          return { ...item, card_id: mappedId };
        }
        return item;
      });
      localStorage.setItem("deckverse_Roster", JSON.stringify(updatedRoster));
    }

    localStorage.setItem("deckverse_kb_migration_v2_done", "true");
    console.log("✅ Migração para Banco de Conhecimento concluída com sucesso!");
  } catch (err) {
    console.error("Erro durante a migração do banco de conhecimento:", err);
  }
}

export default runKnowledgeBaseMigration;
