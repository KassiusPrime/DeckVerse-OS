export const CATALOG_RARITIES = ["R", "SR", "SSR", "UR", "LR", "MR"];

// Only textual aliases that map unambiguously to the current collectible scale.
// Entity types/states such as BOSS, DIV, TRS and ANOMALIA are deliberately NOT
// converted to a rarity. C/UC are reserved for a future minor/background tier
// and are not part of the current catalog UI.
const SAFE_TEXT_ALIASES = {
  RARE: "R",
  RARO: "R",
  EPIC: "SR",
  "ÉPICO": "SR",
  LEGENDARY: "UR",
  "LENDÁRIO": "UR",
  MYTHIC: "MR",
  "MÍTICO": "MR",
};

export function normalizeCatalogRarity(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (CATALOG_RARITIES.includes(normalized)) return normalized;
  return SAFE_TEXT_ALIASES[normalized] || "";
}

export function isGeneratedFallbackCard(entity) {
  if (!entity || entity.source === "FIREBASE" || entity.rarityReviewed === true || entity.raritySource === "curated") return false;
  const id = String(entity.id || "");
  const cardId = String(entity.card_id || "");
  return id.startsWith("card_col_") || /-CHR-(?:C|UC|R|SR|SSR|UR|LR|MR)-\d+$/i.test(cardId);
}

export function isRarityReviewed(entity) {
  if (!entity) return false;
  if (entity.rarityReviewed === false) return false;
  if (isGeneratedFallbackCard(entity)) return false;
  return Boolean(normalizeCatalogRarity(entity.rarity || entity.tier));
}

/**
 * Legacy fallback cards used to receive rarity from their position in a list.
 * That made the first character MR, the second LR, etc. This is intentionally
 * disabled: prominence/order is not enough evidence for an editorial rarity.
 * Curated/imported values are preserved; generated seed rarities are cleared.
 */
export function applyFallbackRarityPolicy(entities = []) {
  return (entities || []).map((entity) => {
    if (!isGeneratedFallbackCard(entity)) return { ...entity };
    return {
      ...entity,
      rarity: "",
      rarityReviewed: false,
      raritySource: "unreviewed-seed",
    };
  });
}

export function rarityDistribution(entities = []) {
  const distribution = Object.fromEntries(CATALOG_RARITIES.map((rarity) => [rarity, 0]));
  let unreviewed = 0;
  entities.forEach((entity) => {
    const rarity = normalizeCatalogRarity(entity?.rarity || entity?.tier);
    if (rarity) distribution[rarity] += 1;
    else unreviewed += 1;
  });
  return { ...distribution, unreviewed };
}

export default {
  CATALOG_RARITIES,
  normalizeCatalogRarity,
  isGeneratedFallbackCard,
  isRarityReviewed,
  applyFallbackRarityPolicy,
  rarityDistribution,
};
