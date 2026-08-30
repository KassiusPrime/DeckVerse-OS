const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

const collectionCode = (entity) => String(
  entity?.collectionCode || entity?.collection_code || entity?.collection_id || entity?.collectionId || ""
).toUpperCase();

const entitySlug = (entity) => normalize(entity?.slug || entity?.canonicalName || entity?.name || entity?.title || entity?.id);

const codeHas = (entity, suffix) => {
  const code = collectionCode(entity);
  return code === suffix || code.endsWith(`-${suffix}`) || code === `COL-${suffix}`;
};

/**
 * Narrow aliases confirmed by the curated ZIP audit. This is deliberately not
 * fuzzy: titles/aliases are normalized only when the identity is known.
 */
function canonicalIdentitySlug(entity, type) {
  const slug = entitySlug(entity);

  if (type === "character" && codeHas(entity, "BB") && slug === "skeptical_man") return "narrow_minded_man";
  if (type === "character" && codeHas(entity, "MHA") && ["all_might", "all_might_normal_form"].includes(slug)) return "toshinori_yagi";
  if (type === "character" && codeHas(entity, "TG") && slug === "kichimura_washuu") return "furuta_nimura";

  return slug;
}

// Explicit cross-type identity/state corrections. These are intentionally
// narrow because fuzzy substring merging would combine unrelated characters.
function correctionFor(entity, type) {
  const slug = entitySlug(entity);

  if (type === "boss" && codeHas(entity, "BLC") && slug === "yhwach_rei_quincy") {
    return { action: "hide", reason: "TITLE_DUPLICATE", canonicalIdentity: "yhwach", mediaRole: "appearance" };
  }

  if (type === "boss" && codeHas(entity, "CSM") && slug === "gun_fiend") {
    return { action: "hide", reason: "FORM_DUPLICATE", canonicalIdentity: "aki_hayakawa", form: "gun_fiend" };
  }

  if (type === "boss" && codeHas(entity, "DBZ") && slug === "kid_buu") {
    return { action: "hide", reason: "FORM_DUPLICATE", canonicalIdentity: "majin_buu", form: "kid_buu" };
  }

  if (type === "boss" && codeHas(entity, "JOJO") && slug === "dio") {
    return { action: "hide", reason: "ERA_ALIAS_DUPLICATE", canonicalIdentity: "dio_brando", mediaRole: "appearance" };
  }

  if (type === "boss" && codeHas(entity, "MHA") && slug === "izuku_midoriya") {
    return { action: "hide", reason: "IDENTITY_DUPLICATE", canonicalIdentity: "izuku_midoriya", canonicalType: "character", mediaRole: "appearance" };
  }

  if (type === "character" && codeHas(entity, "MHA") && ["all_might", "all_might_normal_form"].includes(slug)) {
    return { action: "hide", reason: "TITLE_DUPLICATE", canonicalIdentity: "toshinori_yagi", mediaRole: "appearance" };
  }

  if (type === "character" && codeHas(entity, "TG") && slug === "kichimura_washuu") {
    return { action: "hide", reason: "ALIAS_DUPLICATE", canonicalIdentity: "furuta_nimura", canonicalType: "boss", mediaRole: "appearance" };
  }

  // Older database rows may still encode Bloodborne titles/locations as Bosses.
  if (type === "boss" && codeHas(entity, "BB") && ["gehrman_first_hunter", "lady_maria_astral_clocktower"].includes(slug)) {
    return {
      action: "hide",
      reason: "TITLE_OR_LOCATION_DUPLICATE",
      canonicalIdentity: slug.startsWith("gehrman") ? "gehrman" : "lady_maria",
      canonicalType: "character",
      mediaRole: "appearance",
    };
  }

  return null;
}

export function isTopLevelCatalogEntity(entity, type) {
  if (!entity) return false;
  const slug = entitySlug(entity);
  if (!slug) return false;
  if (
    entity.entityType === "form" ||
    entity.entityType === "appearance" ||
    entity.isForm === true ||
    entity.isAppearance === true ||
    entity.formOf ||
    entity.appearanceOf ||
    slug.includes("_form_") ||
    slug.includes("_appearance_")
  ) return false;
  return correctionFor(entity, type)?.action !== "hide";
}

export function dedupeCatalogEntities(entities = [], type = "character") {
  const seen = new Set();
  const hidden = [];
  const visible = [];

  for (const entity of entities || []) {
    const correction = correctionFor(entity, type);
    if (correction?.action === "hide") {
      hidden.push({ entity, ...correction });
      continue;
    }
    if (!isTopLevelCatalogEntity(entity, type)) {
      hidden.push({
        entity,
        action: "hide",
        reason: entitySlug(entity).includes("_appearance_") ? "APPEARANCE_NOT_CARD" : "FORM_NOT_CARD",
        canonicalIdentity: canonicalIdentitySlug(entity, type),
      });
      continue;
    }

    const code = collectionCode(entity);
    const slug = canonicalIdentitySlug(entity, type);
    const key = entity.entityKey
      ? `key:${String(entity.entityKey).toLowerCase()}`
      : `${code}|${type}|${slug}`;
    if (seen.has(key)) {
      hidden.push({ entity, action: "hide", reason: "EXACT_IDENTITY_DUPLICATE", canonicalIdentity: slug });
      continue;
    }
    seen.add(key);
    visible.push(entity);
  }

  return { visible, hidden };
}

export function normalizeCatalogSnapshot(snapshot = {}) {
  const characterResult = dedupeCatalogEntities(snapshot.characters, "character");
  const itemResult = dedupeCatalogEntities(snapshot.items, "item");
  const bossResult = dedupeCatalogEntities(snapshot.bosses, "boss");

  return {
    ...snapshot,
    characters: characterResult.visible,
    items: itemResult.visible,
    bosses: bossResult.visible,
    identityAudit: [
      ...characterResult.hidden,
      ...itemResult.hidden,
      ...bossResult.hidden,
    ],
  };
}

export function getCatalogEntitySlug(entity) {
  return entitySlug(entity);
}

export function getCanonicalIdentitySlug(entity, type = "character") {
  return canonicalIdentitySlug(entity, type);
}

export default {
  isTopLevelCatalogEntity,
  dedupeCatalogEntities,
  normalizeCatalogSnapshot,
  getCatalogEntitySlug,
  getCanonicalIdentitySlug,
};
