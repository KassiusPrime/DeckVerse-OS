import { resolveCollectionCodeStrict } from "../../lib/collectionCodes.js";
import { classifyLegacyBossSlug, slugifyMigrationName } from "../migration/bossMigrationPolicy.js";

export function slugifyText(text = "") {
  if (typeof text !== "string") return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

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

function collectionCodeOf(entity) {
  return resolveCollectionCodeStrict(entity?.collection_id || entity?.collection || entity?.collectionCode || entity?.collection_code);
}

function canonicalizeLegacyParsed(parsedResult, { targetSlug, baseSlug = targetSlug, formStateSlug = null }) {
  parsedResult.legacySourceEntityType = "boss";
  parsedResult.entityType = "character";
  parsedResult.slug = targetSlug;
  parsedResult.baseSlug = baseSlug;
  parsedResult.stateType = formStateSlug ? "form" : null;
  parsedResult.stateSlug = formStateSlug;
  return parsedResult;
}

export function matchMediaEntity(parsedResult, catalog = {}) {
  if (!parsedResult?.valid) {
    return { matchStatus: "INVALID", matchedEntity: null, candidatesCount: 0, reason: parsedResult?.error || "INVALID_PARSED_INPUT", mediaState: null };
  }

  const { collectionCodeCanonical, entityType, slug, baseSlug = slug, stateType = null, stateSlug = null } = parsedResult;
  const collections = catalog.collections || [];
  const cards = catalog.cards || catalog.characters || [];
  const items = catalog.items || [];
  const mediaState = stateType ? { type: stateType, slug: stateSlug, fullSlug: slug, baseSlug } : null;

  if (entityType === "collection") {
    const matchingCols = collections.filter((entry) => collectionCodeOf(entry) === collectionCodeCanonical);
    if (matchingCols.length === 1) return { matchStatus: "MATCHED", matchedEntity: matchingCols[0], candidatesCount: 1, reason: "Coleção encontrada com sucesso.", mediaState: null };
    if (matchingCols.length > 1) return { matchStatus: "AMBIGUOUS", matchedEntity: null, candidatesCount: matchingCols.length, reason: `Múltiplas coleções cadastradas com o código ${collectionCodeCanonical}.`, mediaState: null };
    return { matchStatus: "NOT_FOUND", matchedEntity: null, candidatesCount: 0, reason: `Coleção ${collectionCodeCanonical} não encontrada no catálogo.`, mediaState: null };
  }

  // Current audited ZIPs still contain legacy `boss` filenames. Boss is no
  // longer a collectible entity, so mutate the parsed target before the commit
  // service builds entityKey/storagePath/canonicalFilename.
  if (entityType === "boss") {
    const sameCollection = cards.filter((entry) => collectionCodeOf(entry) === collectionCodeCanonical);
    const classification = classifyLegacyBossSlug({ collectionCode: collectionCodeCanonical, bossSlug: slug }, sameCollection);
    if (classification.kind === "merge-character") {
      const targetSlug = slugifyMigrationName(classification.baseCharacter?.slug || classification.baseCharacter?.name || slug);
      canonicalizeLegacyParsed(parsedResult, { targetSlug });
      return {
        matchStatus: "MATCHED",
        matchedEntity: classification.baseCharacter,
        candidatesCount: 1,
        reason: "Boss legado corresponde à identidade canônica de um personagem.",
        mediaState: null,
        canonicalEntityType: "character",
        canonicalSlug: targetSlug,
        legacyBossProjection: "character",
      };
    }
    if (classification.kind === "form") {
      const base = classification.baseCharacter;
      const targetBase = slugifyMigrationName(base?.slug || base?.name || base?.canonicalName || base?.title);
      const targetSlug = `${targetBase}_form_${slug}`;
      canonicalizeLegacyParsed(parsedResult, { targetSlug, baseSlug: targetBase, formStateSlug: slug });
      return {
        matchStatus: "MATCHED",
        matchedEntity: base,
        candidatesCount: 1,
        reason: "Boss legado corresponde a uma forma/estado de um personagem.",
        mediaState: { type: "form", slug, baseSlug: targetBase, fullSlug: targetSlug },
        canonicalEntityType: "character",
        canonicalSlug: targetSlug,
        legacyBossProjection: "form",
      };
    }
    return {
      matchStatus: "NOT_FOUND",
      matchedEntity: null,
      candidatesCount: 0,
      reason: `Boss legado ${collectionCodeCanonical}::${slug} ainda não foi migrado para Personagem/Forma. Execute a migração Owner primeiro.`,
      mediaState: null,
    };
  }

  const entityPool = entityType === "character" ? cards : entityType === "item" ? items : [];
  const matchedEntities = entityPool.filter((entity) => collectionCodeOf(entity) === collectionCodeCanonical && isSlugMatch(baseSlug, entity.name || entity.title, entity.slug, entity.card_id || entity.item_id || entity.id));

  if (matchedEntities.length === 1) {
    return {
      matchStatus: "MATCHED",
      matchedEntity: matchedEntities[0],
      candidatesCount: 1,
      reason: stateType ? `${stateType === "form" ? "Forma" : "Aparência"} vinculada à entidade-base por match estrito.` : "Entidade encontrada por match estrito.",
      mediaState,
      canonicalEntityType: entityType,
      canonicalSlug: slug,
    };
  }
  if (matchedEntities.length > 1) return { matchStatus: "AMBIGUOUS", matchedEntity: null, candidatesCount: matchedEntities.length, reason: `Múltiplas entidades encontradas para ${collectionCodeCanonical}::${entityType}::${baseSlug}.`, mediaState };
  return { matchStatus: "NOT_FOUND", matchedEntity: null, candidatesCount: 0, reason: `Nenhuma entidade correspondente para ${collectionCodeCanonical}::${entityType}::${baseSlug}.`, mediaState };
}

export default { slugifyText, matchMediaEntity };
