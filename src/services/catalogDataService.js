import { db } from "@/deckverseClient";
import firebasePersistenceAdapter from "@/services/persistence/firebasePersistenceAdapter";
import { isFirebaseConfigured } from "@/services/firebase/firebaseClient";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function dedupeCollections(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = normalize(item?.code || item?.collectionCode || item?.id || item?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tagLocalCards(items) {
  return (items || []).map((item) => ({
    ...item,
    __catalogSource: "LOCAL_FALLBACK",
    __demoSeed: /^card_col_/i.test(String(item?.id || "")),
  }));
}

export async function loadCatalogData() {
  const localCollectionsPromise = db.entities.Collection.list();

  if (isFirebaseConfigured()) {
    try {
      const [cloudCollections, characters, items, bosses, localCollections] = await Promise.all([
        firebasePersistenceAdapter.getCollections(),
        firebasePersistenceAdapter.getCharacters(),
        firebasePersistenceAdapter.getItems(),
        firebasePersistenceAdapter.getBosses(),
        localCollectionsPromise,
      ]);

      return {
        source: "FIREBASE",
        collections: dedupeCollections([...(cloudCollections || []), ...(localCollections || [])]),
        characters: (characters || []).map((item) => ({ ...item, __catalogSource: "FIREBASE" })),
        items: (items || []).map((item) => ({ ...item, __catalogSource: "FIREBASE" })),
        bosses: (bosses || []).map((item) => ({ ...item, __catalogSource: "FIREBASE" })),
      };
    } catch (error) {
      console.warn("[Catalog] Firebase indisponível; usando fallback local somente para navegação.", error);
    }
  }

  const [collections, characters, items, bosses] = await Promise.all([
    localCollectionsPromise,
    db.entities.Card.list(),
    db.entities.Item.list(),
    db.entities.Boss.list(),
  ]);

  return {
    source: "LOCAL_FALLBACK",
    collections: dedupeCollections(collections),
    characters: tagLocalCards(characters),
    items: (items || []).map((item) => ({ ...item, __catalogSource: "LOCAL_FALLBACK" })),
    bosses: (bosses || []).map((item) => ({ ...item, __catalogSource: "LOCAL_FALLBACK" })),
  };
}

export default loadCatalogData;
