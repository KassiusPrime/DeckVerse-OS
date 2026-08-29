export const CATALOG_RARITIES = ["C", "UC", "R", "SR", "SSR", "UR", "LR", "MR"];

const LEGACY_ALIASES = {
  COMMON: "C",
  COMUM: "C",
  UNCOMMON: "UC",
  INCOMUM: "UC",
  RARE: "R",
  RARO: "R",
  EPIC: "SR",
  "ÉPICO": "SR",
  LEGENDARY: "UR",
  "LENDÁRIO": "UR",
  MYTHIC: "MR",
  "MÍTICO": "MR",
  DIV: "MR",
  DIVINE: "MR",
  BOSS: "MR",
  TRS: "MR",
  TRANSCENDENT: "MR",
  ANOMALIA: "MR",
};

export function normalizeCatalogRarity(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (CATALOG_RARITIES.includes(normalized)) return normalized;
  return LEGACY_ALIASES[normalized] || "";
}

export function isGeneratedFallbackCard(entity) {
  if (!entity || entity.source === "FIREBASE" || entity.rarityReviewed === true || entity.raritySource === "curated") return false;
  const id = String(entity.id || "");
  const cardId = String(entity.card_id || "");
  return id.startsWith("card_col_") || /-CHR-(?:C|UC|R|SR|SSR|UR|LR|MR)-\d+$/i.test(cardId);
}

/**
 * Fallback only. Imported/curated rarities are never overwritten.
 * Ranking is relative to the character's own collection and is based on
 * prominence ordering, not cross-franchise combat power.
 */
export function fallbackRarityForRank(index, total) {
  const size = Math.max(1, Number(total) || 1);
  const rank = Math.max(0, Number(index) || 0);

  if (rank === 0) return "MR";
  if (size >= 8 && rank === 1) return "LR";
  if (size >= 6 && rank === 2) return "UR";

  const eliteSlots = size >= 8 ? 3 : size >= 6 ? 2 : 1;
  const remainder = Math.max(1, size - eliteSlots);
  const position = Math.max(0, rank - eliteSlots) / remainder;

  if (position < 0.12) return "SSR";
  if (position < 0.26) return "SR";
  if (position < 0.50) return "R";
  if (position < 0.70) return "UC";
  return "C";
}

const collectionKey = (entity) => String(
  entity?.collectionCode ||
  entity?.collection_code ||
  entity?.collection_id ||
  entity?.collectionId ||
  entity?.collection ||
  entity?.series ||
  "UNASSIGNED"
).trim().toUpperCase();

export function applyFallbackRarityPolicy(entities = []) {
  const result = entities.map((entity) => ({ ...entity }));
  const groups = new Map();

  result.forEach((entity, index) => {
    if (!isGeneratedFallbackCard(entity)) return;
    const key = collectionKey(entity);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ entity, index });
  });

  groups.forEach((entries) => {
    entries.forEach(({ index }, rank) => {
      result[index] = {
        ...result[index],
        rarity: fallbackRarityForRank(rank, entries.length),
        raritySource: "fallback-prominence",
      };
    });
  });

  return result;
}

export function rarityDistribution(entities = []) {
  const distribution = Object.fromEntries(CATALOG_RARITIES.map((rarity) => [rarity, 0]));
  entities.forEach((entity) => {
    const rarity = normalizeCatalogRarity(entity?.rarity);
    if (rarity) distribution[rarity] += 1;
  });
  return distribution;
}

export default {
  CATALOG_RARITIES,
  normalizeCatalogRarity,
  isGeneratedFallbackCard,
  fallbackRarityForRank,
  applyFallbackRarityPolicy,
  rarityDistribution,
};
