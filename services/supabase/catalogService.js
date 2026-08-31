import { getSupabaseBrowserClient, isSupabaseConfigured } from './client.js';

const RETIRED_PREFIXES = ['COL-05', 'COL-06'];
const normalize = (value) => String(value || '').trim();
const isRetired = (collectionId) => RETIRED_PREFIXES.some((prefix) => normalize(collectionId).toUpperCase().startsWith(prefix));

export function toPublicCollection(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || '',
    coverUrl: row.cover_url || row.image_url || '',
  };
}

export function toPublicCard(row) {
  return {
    id: row.id,
    name: row.name,
    entityType: row.entity_type || 'character',
    rarity: row.rarity || 'R',
    role: row.role || '',
    atk: Number(row.atk || 0),
    def: Number(row.def || 0),
    mag: Number(row.mag || 0),
    speed: Number(row.speed || 0),
    hp: Number(row.hp || 0),
    imageUrl: row.image_url || '',
    description: row.description || row.lore || '',
    collectionId: row.collection_id,
    collectionName: row.collections?.name || '',
  };
}

export function toPublicForm(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    name: row.name,
    rarity: row.rarity || '',
    imageUrl: row.image_url || '',
    description: row.description || '',
    order: Number(row.order_index || 1),
    collectionId: row.cards?.collection_id || '',
    baseName: row.cards?.name || '',
  };
}

export async function loadPublicCatalog() {
  if (!isSupabaseConfigured()) {
    const { db } = await import('../../deckverseClient.js');
    const [collections, cards, items, bosses] = await Promise.all([
      db.entities.Collection.list(''),
      db.entities.Card.list(''),
      db.entities.Item.list(''),
      db.entities.Boss.list(''),
    ]);
    const visibleCollections = (collections || []).filter((entry) => !isRetired(entry.code || entry.id));
    const namesById = new Map(visibleCollections.flatMap((entry) => [[entry.id, entry.name], [entry.code, entry.name]]));
    const mappedCards = [
      ...(cards || []).map((entry) => ({ ...entry, entity_type: 'character' })),
      ...(items || []).map((entry) => ({ ...entry, entity_type: 'item' })),
      ...(bosses || []).map((entry) => ({ ...entry, entity_type: 'boss' })),
    ]
      .filter((entry) => !isRetired(entry.collection_id || entry.collectionCode))
      .map((entry) => toPublicCard({ ...entry, atk: entry.atk ?? entry.attack, def: entry.def ?? entry.defense, collections: { name: namesById.get(entry.collection_id || entry.collectionCode) || '' } }));

    const legacyForms = [];
    for (const card of cards || []) {
      for (const form of Array.isArray(card.forms) ? card.forms : []) {
        const normalized = typeof form === 'string' ? { name: form } : form || {};
        legacyForms.push({
          id: normalized.id || `${card.id || card.card_id}:${normalized.name || normalized.title || 'form'}`,
          cardId: card.id || card.card_id,
          name: normalized.name || normalized.title || 'Forma',
          rarity: normalized.rarity || '',
          imageUrl: normalized.image_url || normalized.imageUrl || '',
          description: normalized.description || normalized.lore || '',
          order: Number(normalized.order || normalized.order_index || 1),
          collectionId: card.collection_id || card.collectionCode || '',
          baseName: card.name || '',
        });
      }
    }
    return { source: 'LEGACY_READ_ONLY', collections: visibleCollections.map(toPublicCollection), cards: mappedCards, forms: legacyForms };
  }

  const supabase = getSupabaseBrowserClient();
  const [collectionsResult, cardsResult, formsResult] = await Promise.all([
    supabase.from('collections').select('id, name, description, category, cover_url').eq('is_active', true).order('name'),
    supabase.from('cards').select('id, collection_id, name, entity_type, rarity, role, atk, def, mag, speed, hp, image_url, description, collections(name)').eq('is_active', true).order('name'),
    supabase.from('card_forms').select('id, card_id, name, rarity, image_url, description, order_index, cards!inner(name, collection_id, is_active, collections!inner(is_active))').eq('is_active', true).eq('cards.is_active', true).eq('cards.collections.is_active', true).order('order_index'),
  ]);
  if (collectionsResult.error) throw collectionsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (formsResult.error) throw formsResult.error;

  return {
    source: 'SUPABASE',
    collections: (collectionsResult.data || []).filter((entry) => !isRetired(entry.id)).map(toPublicCollection),
    cards: (cardsResult.data || []).filter((entry) => !isRetired(entry.collection_id)).map(toPublicCard),
    forms: (formsResult.data || []).filter((entry) => !isRetired(entry.cards?.collection_id)).map(toPublicForm),
  };
}

export default { loadPublicCatalog, toPublicCollection, toPublicCard, toPublicForm };
