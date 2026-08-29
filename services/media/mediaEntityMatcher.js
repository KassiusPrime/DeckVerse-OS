import { resolveCollectionCodeStrict } from "../../lib/collectionCodes.js";

/**
 * Converte um texto para formato de slug padronizado (lowercase, sem acentos,
 * sem pontuação, separado por underlines).
 */
export function slugifyText(text = "") {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Compara se um slug de arquivo bate exatamente com uma entidade. */
function isSlugMatch(parsedSlug, entityName, entitySlug, entityId) {
  if (!parsedSlug) return false;
  const cleanParsed = parsedSlug.toLowerCase();

  if (entitySlug && entitySlug.toLowerCase() === cleanParsed) return true;
  if (entityName && slugifyText(entityName) === cleanParsed) return true;
  if (entityId && slugifyText(String(entityId)) === cleanParsed) return true;

  const hyphenatedParsed = cleanParsed.replace(/_/g, "-");
  if (entitySlug && entitySlug.toLowerCase().replace(/_/g, "-") === hyphenatedParsed) return true;
  if (entityName && slugifyText(entityName).replace(/_/g, "-") === hyphenatedParsed) return true;

  return false;
}

/**
 * Realiza matching estrito de uma imagem parseada com o catálogo.
 * Forms e appearances apontam para a entidade-base e nunca criam uma segunda
 * carta. O slug completo da mídia continua preservado no resultado do parser.
 */
export function matchMediaEntity(parsedResult, catalog = {}) {
  if (!parsedResult || !parsedResult.valid) {
    return {
      matchStatus: "INVALID",
      matchedEntity: null,
      candidatesCount: 0,
      reason: parsedResult?.error || "INVALID_PARSED_INPUT",
      mediaState: null,
    };
  }

  const {
    collectionCodeCanonical,
    entityType,
    slug,
    baseSlug = slug,
    stateType = null,
    stateSlug = null,
  } = parsedResult;
  const collections = catalog.collections || [];
  const cards = catalog.cards || catalog.characters || [];
  const items = catalog.items || [];
  const bosses = catalog.bosses || [];
  const mediaState = stateType ? { type: stateType, slug: stateSlug, fullSlug: slug, baseSlug } : null;

  if (entityType === "collection") {
    const matchingCols = collections.filter((c) => {
      const code = resolveCollectionCodeStrict(c.code || c.id || c.collection_id);
      return code === collectionCodeCanonical;
    });

    if (matchingCols.length === 1) {
      return {
        matchStatus: "MATCHED",
        matchedEntity: matchingCols[0],
        candidatesCount: 1,
        reason: "Coleção encontrada com sucesso.",
        mediaState: null,
      };
    }
    if (matchingCols.length > 1) {
      return {
        matchStatus: "AMBIGUOUS",
        matchedEntity: null,
        candidatesCount: matchingCols.length,
        reason: `Múltiplas coleções cadastradas com o código ${collectionCodeCanonical}.`,
        mediaState: null,
      };
    }
    return {
      matchStatus: "NOT_FOUND",
      matchedEntity: null,
      candidatesCount: 0,
      reason: `Coleção ${collectionCodeCanonical} não encontrada no catálogo.`,
      mediaState: null,
    };
  }

  let entityPool = [];
  if (entityType === "character") entityPool = cards;
  else if (entityType === "item") entityPool = items;
  else if (entityType === "boss") entityPool = bosses;

  const matchedEntities = entityPool.filter((ent) => {
    const entCol = resolveCollectionCodeStrict(ent.collection_id || ent.collection || ent.collectionCode);
    if (entCol !== collectionCodeCanonical) return false;
    return isSlugMatch(baseSlug, ent.name || ent.title, ent.slug, ent.card_id || ent.item_id || ent.boss_id || ent.id);
  });

  if (matchedEntities.length === 1) {
    return {
      matchStatus: "MATCHED",
      matchedEntity: matchedEntities[0],
      candidatesCount: 1,
      reason: stateType
        ? `${stateType === "form" ? "Forma" : "Aparência"} vinculada à entidade-base por match estrito.`
        : "Entidade encontrada por match estrito.",
      mediaState,
    };
  }
  if (matchedEntities.length > 1) {
    return {
      matchStatus: "AMBIGUOUS",
      matchedEntity: null,
      candidatesCount: matchedEntities.length,
      reason: `Múltiplas entidades encontradas para ${collectionCodeCanonical}::${entityType}::${baseSlug}.`,
      mediaState,
    };
  }
  return {
    matchStatus: "NOT_FOUND",
    matchedEntity: null,
    candidatesCount: 0,
    reason: `Nenhuma entidade correspondente para ${collectionCodeCanonical}::${entityType}::${baseSlug}.`,
    mediaState,
  };
}

export default {
  slugifyText,
  matchMediaEntity,
};
