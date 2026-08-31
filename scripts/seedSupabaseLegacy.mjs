import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, generateExpandedCards } from '../src/data/megaCollectionsData.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const retired = (code = '') => /^COL-(05|06)(-|$)/i.test(String(code));
const cleanInt = (value) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
const cleanId = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim());
  return found === undefined ? null : String(found).trim();
};
const normalizeKey = (value) => String(value || '').trim().toLowerCase();
const rarityMap = new Map([
  ['COMMON', 'R'], ['COMUM', 'R'], ['UNCOMMON', 'SR'], ['INCOMUM', 'SR'], ['RARE', 'SR'], ['RARO', 'SR'],
  ['EPIC', 'SSR'], ['EPICO', 'SSR'], ['ÉPICO', 'SSR'], ['LEGENDARY', 'UR'], ['LENDARIO', 'UR'], ['LENDÁRIO', 'UR'],
]);
const normalizeRarity = (value) => rarityMap.get(String(value || '').toUpperCase()) || String(value || 'R').toUpperCase();

async function loadLegacy() {
  const path = process.env.LEGACY_JSON_PATH || '';
  if (path) {
    const parsed = JSON.parse(await fs.readFile(path, 'utf8'));
    return {
      collections: parsed.collections || [], cards: parsed.cards || parsed.characters || [],
      items: parsed.items || [], bosses: parsed.bosses || [], forms: parsed.forms || [],
    };
  }
  return {
    collections: MEGA_COLLECTIONS || [],
    cards: generateExpandedCards(),
    items: MEGA_ITEMS || [],
    bosses: MEGA_BOSSES || [],
    forms: [],
  };
}

function buildCollectionResolver(rawCollections) {
  const map = new Map();
  for (const collection of rawCollections) {
    const canonical = cleanId(collection.code, collection.collection_code, collection.id);
    if (!canonical) continue;
    const candidates = [
      canonical,
      collection.id,
      collection.code,
      collection.collection_code,
      collection.collection_id,
      collection.slug,
      ...(Array.isArray(collection.aliases) ? collection.aliases : []),
    ];
    for (const candidate of candidates.filter(Boolean)) map.set(normalizeKey(candidate), canonical);
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
  const rawCollection = cleanId(c.collection_id, c.collection_code, c.collectionCode, c.collection);
  const collectionId = resolveCollection(rawCollection);
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
    image_url: c.image_url || c.img_custom || c.img_oficial || c.img_art || null,
    description: c.description || c.lore || null,
    is_active: !retired(collectionId),
    is_gacha_enabled: !retired(collectionId),
  };
}

function formatForm(f) {
  const id = cleanId(f.id, f.form_id);
  const cardId = cleanId(f.card_id, f.base_card_id, f.character_id);
  if (!id || !cardId) return null;
  return {
    id,
    card_id: cardId,
    name: f.name || f.title || 'Forma',
    rarity: f.rarity ? normalizeRarity(f.rarity) : null,
    image_url: f.image_url || null,
    description: f.description || f.lore || null,
    order_index: cleanInt(f.order_index || f.order || 1) || 1,
    is_active: f.is_active !== false,
  };
}

async function insertChunks(table, rows, chunkSize = 300) {
  const clean = rows.filter(Boolean);
  let inserted = 0;
  for (let start = 0; start < clean.length; start += chunkSize) {
    const chunk = clean.slice(start, start + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += chunk.length;
    console.log(`${table}: ${inserted}/${clean.length}`);
  }
  return clean.length;
}

async function main() {
  console.log('DeckVerse → Supabase: non-destructive seed starting.');
  const legacy = await loadLegacy();
  const resolveCollection = buildCollectionResolver(legacy.collections);
  const collections = legacy.collections.map(formatCollection).filter(Boolean);
  const cards = [
    ...legacy.cards.map((row) => formatCard(row, 'character', resolveCollection)),
    ...legacy.items.map((row) => formatCard(row, 'item', resolveCollection)),
    ...legacy.bosses.map((row) => formatCard(row, 'boss', resolveCollection)),
  ].filter(Boolean);
  const forms = legacy.forms.map(formatForm).filter(Boolean);

  const collectionIds = new Set(collections.map((row) => row.id));
  const orphanRefs = [...new Set(cards.map((row) => row.collection_id).filter((id) => id && !collectionIds.has(id)))];
  if (orphanRefs.length) console.warn(`Warning: unresolved collection references: ${orphanRefs.join(', ')}`);
  const safeCards = cards.filter((row) => !row.collection_id || collectionIds.has(row.collection_id));
  const cardIds = new Set(safeCards.map((row) => row.id));
  const safeForms = forms.filter((row) => cardIds.has(row.card_id));

  const totals = {};
  totals.collections = await insertChunks('collections', collections);
  totals.cards = await insertChunks('cards', safeCards);
  totals.forms = await insertChunks('card_forms', safeForms);

  console.log('Seed completed without overwrite.');
  console.log(JSON.stringify({
    ...totals,
    skippedOrphanCards: cards.length - safeCards.length,
    skippedOrphanForms: forms.length - safeForms.length,
    retiredCollections: collections.filter((row) => !row.is_active).length,
  }, null, 2));
}

main().catch((error) => {
  console.error('Migration aborted safely:', error.message);
  process.exit(1);
});
