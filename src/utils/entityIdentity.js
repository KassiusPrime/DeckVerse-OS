// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Canonical Entity Identity Utility
// Generates secure entityKeys taking collection, entityType, name, continuity,
// version, and form into account.
// ════════════════════════════════════════════════════════════════════════════

import { resolveCollectionCode, inferCollectionCode } from "../../lib/collectionCodes.js";
import { normalizeNameKey } from "./deduplication.js";

/**
 * Creates a unique canonical entity key for any entity in DeckVerse OS.
 * Form: <CANONICAL_COLLECTION>::<ENTITY_TYPE>::<NORMALIZED_NAME>[::<CONTINUITY>][::<VERSION>][::<FORM>]
 */
export function createEntityKey(record = {}) {
  if (!record || typeof record !== "object") return "";

  const rawCol =
    record.collectionCanonicalId ||
    record.collection_id ||
    record.collectionCode ||
    record.collection_code ||
    record.code ||
    record.collectionId ||
    record.collection ||
    "";

  let canonicalCollection = resolveCollectionCode(rawCol);

  if (!canonicalCollection || canonicalCollection === "COL-00-MULTI") {
    const inferred = inferCollectionCode(record);
    if (inferred && inferred !== "COL-00-MULTI") {
      canonicalCollection = inferred;
    } else {
      canonicalCollection = canonicalCollection || "COL-00-MULTI";
    }
  }

  // Determine canonical entity type strictly
  let rawType = record.entityType || record.canonicalEntityType || record.suggestedType || record.type || record.sourceTable || record._sourceTable || record.table || "";
  let normType = rawType.toString().toLowerCase().trim();

  let canonicalEntityType = "character";
  if (normType === "collection" || normType === "col" || record._sourceTable === "Collection" || (record.code && record.code.startsWith("COL-"))) {
    canonicalEntityType = "collection";
  } else if (normType === "item" || normType === "equipment" || normType === "artifact" || normType === "consumable" || normType === "weapon" || record._sourceTable === "Item" || record.item_code) {
    canonicalEntityType = "item";
  } else if (normType === "boss" || normType === "boss_entity" || record._sourceTable === "Boss") {
    canonicalEntityType = "boss";
  } else if (normType === "metadata" || normType === "lore" || normType === "concept" || normType === "gallery" || normType === "universe" || normType === "volume" || normType === "ability" || normType === "saga" || normType === "episode" || record._sourceTable === "Lore" || record._sourceTable === "Universe" || record.lore_id) {
    canonicalEntityType = "metadata";
  } else {
    canonicalEntityType = "character";
  }

  const rawName = record.canonicalName || record.name || record.title || "";
  const normalizedName = normalizeNameKey(rawName);

  if (!normalizedName) return "";

  const parts = [canonicalCollection, canonicalEntityType, normalizedName];

  if (record.continuity) {
    const normCont = record.continuity.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (normCont) parts.push(normCont);
  }

  if (record.version) {
    const normVer = record.version.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (normVer) parts.push(normVer);
  }

  if (record.form) {
    const normForm = record.form.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (normForm) parts.push(normForm);
  }

  return parts.join("::");
}

/**
 * Checks if two entity records represent the exact same entity identity.
 */
export function isSameEntityIdentity(recordA, recordB) {
  if (!recordA || !recordB) return false;
  if (recordA.id && recordB.id && recordA.id === recordB.id) return true;
  if (recordA.card_id && recordB.card_id && recordA.card_id === recordB.card_id) return true;

  const keyA = createEntityKey(recordA);
  const keyB = createEntityKey(recordB);

  return Boolean(keyA && keyB && keyA === keyB);
}
