import { createClient } from '@supabase/supabase-js';
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, generateExpandedCards } from '../../src/data/megaCollectionsData.js';

const retired = (code = '') => /^COL-(05|06)(-|$)/i.test(String(code));
const cleanInt = (value) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
const cleanId = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim());
  return found === undefined ? null : String(found).trim();
};
const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const normalizeKey = (value) => String(value || '').trim().toLowerCase();
const rarityMap = new Map([
  ['COMMON', 'R'], ['COMUM', 'R'], ['UNCOMMON', 'SR'], ['INCOMUM', 'SR'], ['RARE', 'SR'], ['RARO', 'SR'],
  ['EPIC', 'SSR'], ['EPICO', 'SSR'], ['ÉPICO', 'SSR'], ['LEGENDARY', 'UR'], ['LENDARIO', 'UR'], ['LENDÁRIO', 'UR'],
]);
const normalizeRarity = (value) => rarityMap.get(String(value || '').toUpperCase()) || String(value || 'R').toUpperCase();

function buildCollectionResolver(rawCollections) {
  const map = new Map();
  for (const collection of rawCollections) {
    const canonical = cleanId(collection.code, collection.collection_code, collection.id);
    if (!canonical) continue;
    for (const candidate of [canonical, collection.id, collection.code, collection.collection_code, collection.collection_id, collection.slug, ...(Array.isArray(collection.aliases) ? collection.aliases : [])].filter(Boolean)) {
      map.set(normalizeKey(candidate), canonical);
    }
  }
  return (value) => {
    const raw = cleanId(value);
    if (!raw) return null;
    return map.get(normalizeKey(raw)) || raw;
  };
}

function formatCollection(c) {
  const id = cleanId(c.code, c.collection_code, c.id);
  if (!id) return null;
  return {
    id,
    name: c.name || c.title || id,
    description: c.description || null,
    category: c.category || c.type || null,
    publisher: c.publisher || null,
    cover_url: c.cover_url || c.image_url || null,
    is_active: !retired(id),
  };
}

function formatCard(c, entityType, resolveCollection) {
  const id = cleanId(c.id, c.card_id, c.item_id, c.boss_id);
  if (!id) return null;
  const collectionId = resolveCollection(cleanId(c.collection_id, c.collection_code, c.collectionCode, c.collection));
  return {
    id,
    collection_id: collectionId,
    name: c.name || c.title || 'Sem nome',
    entity_type: c.entity_type || entityType,
    rarity: normalizeRarity(c.rarity),
    role: c.role || null,
    atk: cleanInt(c.atk ?? c.attack),
    def: cleanInt(c.def ?? c.defense),
    mag: cleanInt(c.mag ?? c.magic),
    speed: cleanInt(c.speed),
    hp: cleanInt(c.hp),
    slug: c.slug || slugify(c.name || c.title || id),
    image_url: c.image_url || c.img_custom || c.img_oficial || c.img_art || null,
    description: c.description || c.lore || null,
    is_active: !retired(collectionId),
    is_gacha_enabled: !retired(collectionId),
  };
}

function nestedForms(cards, resolveCollection) {
  const output = [];
  for (const raw of cards) {
    const cardId = cleanId(raw.id, raw.card_id);
    if (!cardId || !Array.isArray(raw.forms)) continue;
    raw.forms.forEach((entry, index) => {
      const form = typeof entry === 'string' ? { name: entry } : (entry || {});
      const name = form.name || form.title || form.version_name || `Forma ${index + 1}`;
      const collectionId = resolveCollection(cleanId(raw.collection_id, raw.collection_code, raw.collectionCode, raw.collection));
      output.push({
        id: cleanId(form.id, form.form_id) || `form:${cardId}:${slugify(name)}`,
        card_id: cardId,
        name,
        rarity: form.rarity ? normalizeRarity(form.rarity) : null,
        slug: form.slug || slugify(name),
        image_url: form.image_url || null,
        description: form.description || form.lore || null,
        order_index: Number.isFinite(Number(form.order_index ?? form.order)) ? Math.max(1, Math.trunc(Number(form.order_index ?? form.order))) : index + 1,
        is_active: !retired(collectionId) && form.is_active !== false,
      });
    });
  }
  return output;
}

async function upsertChunks(supabase, table, rows, chunkSize = 250) {
  let written = 0;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    written += chunk.length;
  }
  return written;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (process.env.VERCEL_ENV === 'production') return res.status(403).json({ error: 'PREVIEW_ONLY' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'SUPABASE_SERVER_ENV_MISSING' });

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const rawCollections = MEGA_COLLECTIONS || [];
    const rawCards = generateExpandedCards();
    const resolveCollection = buildCollectionResolver(rawCollections);
    const collections = rawCollections.map(formatCollection).filter(Boolean);
    const cards = [
      ...rawCards.map((row) => formatCard(row, 'character', resolveCollection)),
      ...(MEGA_ITEMS || []).map((row) => formatCard(row, 'item', resolveCollection)),
      ...(MEGA_BOSSES || []).map((row) => formatCard(row, 'boss', resolveCollection)),
    ].filter(Boolean);
    const collectionIds = new Set(collections.map((row) => row.id));
    const safeCards = cards.filter((row) => !row.collection_id || collectionIds.has(row.collection_id));
    const cardIds = new Set(safeCards.map((row) => row.id));
    const forms = nestedForms(rawCards, resolveCollection).filter((row) => cardIds.has(row.card_id));

    const result = {
      collections: await upsertChunks(supabase, 'collections', collections),
      cards: await upsertChunks(supabase, 'cards', safeCards),
      forms: await upsertChunks(supabase, 'card_forms', forms),
      skippedCards: cards.length - safeCards.length,
      retiredCollections: collections.filter((row) => !row.is_active).length,
    };
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('[DeckVerse seed preview]', error);
    return res.status(500).json({ ok: false, error: error?.message || 'SEED_FAILED' });
  }
}
