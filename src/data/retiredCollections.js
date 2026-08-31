// Collections intentionally removed from the collectible product.
// Historical/mythological material may return later in a separate educational encyclopedia.
export const RETIRED_COLLECTION_PREFIXES = ["COL-05-", "COL-06-"];

export function getCollectionCodeLike(value) {
  if (typeof value === "string") return value.trim().toUpperCase();
  return String(
    value?.collectionCode ||
    value?.collection_code ||
    value?.collection_id ||
    value?.collectionId ||
    value?.code ||
    value?.id ||
    ""
  ).trim().toUpperCase();
}

export function isRetiredCollection(value) {
  const code = getCollectionCodeLike(value);
  return RETIRED_COLLECTION_PREFIXES.some((prefix) => code.startsWith(prefix));
}

export function filterRetiredCollections(items = []) {
  return (Array.isArray(items) ? items : []).filter((item) => !isRetiredCollection(item));
}

export default { RETIRED_COLLECTION_PREFIXES, isRetiredCollection, filterRetiredCollections };
