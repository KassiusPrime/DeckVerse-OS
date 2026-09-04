import { loadPublicCatalog } from '../supabase/catalogService.js';
import { stripRetiredEntityStats } from '../../src/utils/catalogSynopsisPolicy.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

export function slugifyCatalogName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getEntityCollectionCode(entity) {
  return String(entity?.collectionCode || entity?.collection_code || entity?.collection_id || entity?.collectionId || '').trim().toUpperCase();
}

export function buildMediaLookup(mediaIndex = []) {
  const byEntityKey = new Map(); const byFilenameKey = new Map();
  for (const record of mediaIndex || []) {
    if (!record || record.status === 'deleted') continue;
    const url = record.downloadURL || record.download_url || record.image_url || '';
    if (record.entityKey && url) byEntityKey.set(String(record.entityKey), url);
    if (record.collection_id && record.entity_type && record.slug && url) byFilenameKey.set(`${record.collection_id}|${record.entity_type}|${record.slug}`, url);
  }
  return { byEntityKey, byFilenameKey };
}

export function resolveIndexedImage(entity, entityType, mediaLookup) {
  if (!entity) return '';
  const direct = entity.image_url || entity.imageUrl || entity.cover_url || entity.coverUrl || '';
  if (direct) return direct;
  if (!mediaLookup) return '';
  if (entity.entityKey && mediaLookup.byEntityKey.has(String(entity.entityKey))) return mediaLookup.byEntityKey.get(String(entity.entityKey));
  const collectionCode = getEntityCollectionCode(entity);
  const slug = entityType === 'collection' ? 'cover' : String(entity.slug || slugifyCatalogName(entity.name || entity.title));
  return mediaLookup.byFilenameKey.get(`${collectionCode}|${entityType}|${slug}`) || '';
}

export async function loadCatalogSnapshot() {
  const catalog = await loadPublicCatalog();
  const collections = (catalog.collections || []).map((entry) => ({
    id: entry.id, code: entry.id, collectionCode: entry.id, name: entry.name,
    synopsis: entry.synopsis || '', description: entry.description || '', category: entry.category,
    image_url: entry.coverUrl, cover_url: entry.coverUrl,
  }));

  const formsByCard = new Map();
  for (const form of catalog.forms || []) {
    if (!form.cardId) continue;
    const list = formsByCard.get(String(form.cardId)) || [];
    list.push({
      id: form.id, formId: form.id, name: form.name, rarity: form.rarity,
      image_url: form.imageUrl, imageUrl: form.imageUrl,
      synopsis: form.synopsis || '', description: form.description || '', order: form.order,
      collectionCode: form.collectionId, baseName: form.baseName, baseEntityType: form.baseEntityType || 'character',
    });
    formsByCard.set(String(form.cardId), list);
  }

  const cards = (catalog.cards || []).map((entry) => stripRetiredEntityStats({
    id: entry.id, card_id: entry.id, name: entry.name, entity_type: entry.entityType,
    collection_id: entry.collectionId, collectionCode: entry.collectionId,
    collection: entry.collectionName, series: entry.collectionName,
    rarity: entry.rarity, rarityReviewed: entry.rarityReviewed, role: entry.role,
    image_url: entry.imageUrl, imageUrl: entry.imageUrl,
    synopsis: entry.synopsis || '', lore: entry.description || '', description: entry.description || '',
    forms: formsByCard.get(String(entry.id)) || [],
  }));

  return {
    collections,
    characters: cards.filter((entry) => entry.entity_type === 'character'),
    items: cards.filter((entry) => entry.entity_type === 'item'),
    bosses: cards.filter((entry) => entry.entity_type === 'boss'),
    forms: catalog.forms || [], mediaIndex: [], source: catalog.source,
  };
}

export function collectionMatches(entity, collection) {
  if (!entity || !collection) return false;
  const refs = [entity.collectionCode, entity.collection_code, entity.collection_id, entity.collectionId, entity.collection, entity.series].filter(Boolean).map(normalize);
  const candidates = [collection.code, collection.id, collection.name, collection.slug].filter(Boolean).map(normalize);
  return candidates.some((candidate) => refs.includes(candidate));
}

export default { loadCatalogSnapshot, buildMediaLookup, resolveIndexedImage, slugifyCatalogName, getEntityCollectionCode, collectionMatches };
