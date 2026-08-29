import { db as localDb } from "../../deckverseClient.js";
import { firebasePersistenceAdapter } from "../persistence/firebasePersistenceAdapter.js";
import { isFirebaseConfigured } from "../firebase/firebaseClient.js";
import { parseMediaFilename } from "../media/mediaFilenameParser.js";
import { applyFallbackRarityPolicy } from "../../src/utils/rarityPolicy.js";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export function slugifyCatalogName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getEntityCollectionCode(entity) {
  return String(
    entity?.collectionCode ||
    entity?.collection_code ||
    entity?.collection_id ||
    entity?.collectionId ||
    ""
  ).trim().toUpperCase();
}

export function buildMediaLookup(mediaIndex = []) {
  const byEntityKey = new Map();
  const byFilenameKey = new Map();

  mediaIndex.forEach((record) => {
    if (!record || record.status === "deleted" || !record.downloadURL) return;
    if (record.entityKey) byEntityKey.set(String(record.entityKey), record.downloadURL);

    const filename = record.canonicalFilename || record.originalFilename || record.filename;
    if (!filename) return;
    const parsed = parseMediaFilename(filename);
    if (!parsed.valid) return;
    const key = `${parsed.collectionCodeCanonical}|${parsed.entityType}|${parsed.slug}`;
    byFilenameKey.set(key, record.downloadURL);
  });

  return { byEntityKey, byFilenameKey };
}

export function resolveIndexedImage(entity, entityType, mediaLookup) {
  if (!entity || !mediaLookup) return "";
  if (entity.entityKey && mediaLookup.byEntityKey.has(String(entity.entityKey))) {
    return mediaLookup.byEntityKey.get(String(entity.entityKey));
  }

  const collectionCode = getEntityCollectionCode(entity);
  if (!collectionCode) return "";
  const slug = entityType === "collection"
    ? "cover"
    : String(entity.slug || slugifyCatalogName(entity.name || entity.canonicalName || entity.title));
  if (!slug) return "";
  return mediaLookup.byFilenameKey.get(`${collectionCode}|${entityType}|${slug}`) || "";
}

async function loadLocal() {
  const [collections, charactersRaw, items, bosses] = await Promise.all([
    localDb.entities.Collection.list(""),
    localDb.entities.Card.list(""),
    localDb.entities.Item.list(""),
    localDb.entities.Boss.list(""),
  ]);

  return {
    collections,
    characters: applyFallbackRarityPolicy(charactersRaw),
    items,
    bosses,
    mediaIndex: [],
    source: "LOCAL_FALLBACK",
  };
}

function mergeCollections(cloud = [], local = []) {
  const seen = new Set();
  return [...cloud, ...local].filter((collection) => {
    const key = normalize(collection?.code || collection?.id || collection?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadCatalogSnapshot() {
  const localCollections = await localDb.entities.Collection.list("");

  if (!isFirebaseConfigured()) return loadLocal();

  try {
    const [collections, characters, items, bosses, mediaIndex] = await Promise.all([
      firebasePersistenceAdapter.getCollections(),
      firebasePersistenceAdapter.getCharacters(),
      firebasePersistenceAdapter.getItems(),
      firebasePersistenceAdapter.getBosses(),
      firebasePersistenceAdapter.getMediaIndex(),
    ]);

    // Never fill a partially imported Firebase catalog with demo entities.
    // The local collection registry may still be merged so planned collections
    // remain navigable, but characters/items/bosses represent cloud truth only.
    return {
      collections: mergeCollections(collections || [], localCollections || []),
      characters: characters || [],
      items: items || [],
      bosses: bosses || [],
      mediaIndex: mediaIndex || [],
      source: "FIREBASE",
    };
  } catch (error) {
    console.warn("[CatalogDataService] Firebase indisponível; usando fallback local somente para navegação.", error);
    return loadLocal();
  }
}

export function collectionMatches(entity, collection) {
  if (!entity || !collection) return false;
  const refs = [
    entity.collectionCode,
    entity.collection_code,
    entity.collection_id,
    entity.collectionId,
    entity.collection,
    entity.series,
  ].filter(Boolean).map(normalize);
  const candidates = [collection.code, collection.id, collection.name, collection.slug]
    .filter(Boolean)
    .map(normalize);
  return candidates.some((candidate) => refs.includes(candidate));
}

export default {
  loadCatalogSnapshot,
  buildMediaLookup,
  resolveIndexedImage,
  slugifyCatalogName,
  getEntityCollectionCode,
  collectionMatches,
};
