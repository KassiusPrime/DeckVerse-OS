const clean = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

export const slugifyMigrationName = clean;

export function entityCollectionCode(entity) {
  return String(entity?.collectionCode || entity?.collection_code || entity?.collection_id || entity?.collectionId || entity?.collection || "")
    .trim().toUpperCase();
}

function characterSlug(character) {
  return clean(character?.slug || character?.name || character?.canonicalName || character?.title || "");
}

export function classifyLegacyBoss(boss, characters = []) {
  const collectionCode = entityCollectionCode(boss);
  const bossSlug = clean(boss?.slug || boss?.name || boss?.canonicalName || boss?.title || boss?.id || "");
  const sameCollection = characters.filter((character) => entityCollectionCode(character) === collectionCode);

  const explicitBaseId = boss?.baseCharacterId || boss?.base_character_id || boss?.character_id || boss?.characterId;
  if (explicitBaseId) {
    const explicit = sameCollection.find((character) => [character.id, character.card_id, character.entityKey].filter(Boolean).map(String).includes(String(explicitBaseId)));
    if (explicit) return { kind: "form", bossSlug, collectionCode, baseCharacter: explicit, reason: "explicit-base-link" };
  }

  const exact = sameCollection.find((character) => characterSlug(character) === bossSlug);
  if (exact) return { kind: "merge-character", bossSlug, collectionCode, baseCharacter: exact, reason: "same-canonical-identity" };

  // A legacy boss becomes a form only when its slug actually contains the complete
  // canonical character slug. We intentionally avoid fuzzy similarity here: when
  // uncertain, preserving an independent Character is safer than inventing a form.
  const formCandidates = sameCollection
    .map((character) => ({ character, slug: characterSlug(character) }))
    .filter(({ slug }) => slug.length >= 4 && bossSlug !== slug && (
      bossSlug.startsWith(`${slug}_`) ||
      bossSlug.endsWith(`_${slug}`) ||
      bossSlug.includes(`_${slug}_`)
    ))
    .sort((a, b) => b.slug.length - a.slug.length);

  if (formCandidates.length) {
    return { kind: "form", bossSlug, collectionCode, baseCharacter: formCandidates[0].character, reason: "boss-slug-contains-character" };
  }

  return { kind: "character", bossSlug, collectionCode, baseCharacter: null, reason: "independent-identity" };
}

export function classifyLegacyBossSlug({ collectionCode, bossSlug }, characters = []) {
  return classifyLegacyBoss({ collectionCode, slug: bossSlug, name: bossSlug }, characters);
}

export default { classifyLegacyBoss, classifyLegacyBossSlug, slugifyMigrationName, entityCollectionCode };
