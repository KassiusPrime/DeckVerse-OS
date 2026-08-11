import { resolveCollectionCodeStrict } from "../../lib/collectionCodes.js";

/**
 * Converte um texto para formato de slug padronizado (lowercase, sem acentos, sem pontuação, separado por underlines).
 * Ex: "Monkey D. Luffy" -> "monkey_d_luffy"
 * Ex: "Equipamento DMT Tridimensional" -> "equipamento_dmt_tridimensional"
 */
export function slugifyText(text = "") {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")    // Substitui pontuação e espaços por '_'
    .replace(/^_+|_+$/g, "");        // Trima underlines nas pontas
}

/**
 * Compara se um slug de arquivo bate exatamente com uma entidade.
 */
function isSlugMatch(parsedSlug, entityName, entitySlug, entityId) {
  if (!parsedSlug) return false;
  const cleanParsed = parsedSlug.toLowerCase();

  if (entitySlug && entitySlug.toLowerCase() === cleanParsed) {
    return true;
  }

  if (entityName && slugifyText(entityName) === cleanParsed) {
    return true;
  }

  if (entityId && slugifyText(String(entityId)) === cleanParsed) {
    return true;
  }

  // Compatibilidade com hífens no lugar de underlines
  const hyphenatedParsed = cleanParsed.replace(/_/g, "-");
  if (entitySlug && entitySlug.toLowerCase().replace(/_/g, "-") === hyphenatedParsed) {
    return true;
  }
  if (entityName && slugifyText(entityName).replace(/_/g, "-") === hyphenatedParsed) {
    return true;
  }

  return false;
}

/**
 * Realiza o matching estrito de uma imagem parseada com o catálogo de entidades.
 * SEM auto-match fuzzy.
 * 
 * @param {Object} parsedResult - Resultado de parseMediaFilename
 * @param {Object} catalog - Objeto contendo { collections, cards, items, bosses }
 * @returns {Object} Resultado do matching { matchStatus, matchedEntity, candidatesCount, reason }
 */
export function matchMediaEntity(parsedResult, catalog = {}) {
  if (!parsedResult || !parsedResult.valid) {
    return {
      matchStatus: "INVALID",
      matchedEntity: null,
      candidatesCount: 0,
      reason: parsedResult?.error || "INVALID_PARSED_INPUT"
    };
  }

  const { collectionCodeCanonical, entityType, slug } = parsedResult;
  const collections = catalog.collections || [];
  const cards = catalog.cards || catalog.characters || [];
  const items = catalog.items || [];
  const bosses = catalog.bosses || [];

  if (entityType === "collection") {
    // Para capa de coleção, slug deve ser 'cover'
    const matchingCols = collections.filter(c => {
      const code = resolveCollectionCodeStrict(c.code || c.id || c.collection_id);
      return code === collectionCodeCanonical;
    });

    if (matchingCols.length === 1) {
      return {
        matchStatus: "MATCHED",
        matchedEntity: matchingCols[0],
        candidatesCount: 1,
        reason: "Coleção encontrada com sucesso."
      };
    } else if (matchingCols.length > 1) {
      return {
        matchStatus: "AMBIGUOUS",
        matchedEntity: null,
        candidatesCount: matchingCols.length,
        reason: `Múltiplas coleções cadastradas com o código ${collectionCodeCanonical}.`
      };
    } else {
      return {
        matchStatus: "NOT_FOUND",
        matchedEntity: null,
        candidatesCount: 0,
        reason: `Coleção ${collectionCodeCanonical} não encontrada no catálogo.`
      };
    }
  }

  let entityPool = [];
  if (entityType === "character") entityPool = cards;
  else if (entityType === "item") entityPool = items;
  else if (entityType === "boss") entityPool = bosses;

  // Filtragem estrita por coleção + slug
  const matchedEntities = entityPool.filter(ent => {
    const entCol = resolveCollectionCodeStrict(ent.collection_id || ent.collection || ent.collectionCode);
    if (entCol !== collectionCodeCanonical) return false;

    return isSlugMatch(slug, ent.name || ent.title, ent.slug, ent.card_id || ent.item_id || ent.boss_id || ent.id);
  });

  if (matchedEntities.length === 1) {
    return {
      matchStatus: "MATCHED",
      matchedEntity: matchedEntities[0],
      candidatesCount: 1,
      reason: "Entidade encontrada por match estrito."
    };
  } else if (matchedEntities.length > 1) {
    return {
      matchStatus: "AMBIGUOUS",
      matchedEntity: null,
      candidatesCount: matchedEntities.length,
      reason: `Múltiplas entidades encontradas para ${collectionCodeCanonical}::${entityType}::${slug}.`
    };
  } else {
    return {
      matchStatus: "NOT_FOUND",
      matchedEntity: null,
      candidatesCount: 0,
      reason: `Nenhuma entidade correspondente para ${collectionCodeCanonical}::${entityType}::${slug}.`
    };
  }
}

export default {
  slugifyText,
  matchMediaEntity
};
