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

function formatCollection(c) {
  const id = c.code || c.collection_code || c.id;
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

function formatCard(c, entityType = 'character') {
  const collectionId = c.collection_id || c.collection_code || c.collectionCode || c.collection || null;
  return {
    id: String(c.id || c.card_id || c.item_id || c.boss_id),
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
  return {
    id: String(f.id || f.form_id),
    card_id: String(f.card_id || f.base_card_id || f.character_id),
    name: f.name || f.title || 'Forma',
    rarity: f.rarity ? normalizeRarity(f.rarity) : null,
    image_url: f.image_url || null,
    description: f.description || f.lore || null,
    order_index: cleanInt(f.order_index || f.order || 1) || 1,
    is_active: f.is_active !== false,
  };
}

async function insertChunks(table, rows, chunkSize = 300) {
  const clean = rows.filter((row) => row?.id && (table !== 'card_forms' || row.card_id));
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
  const collections = legacy.collections.map(formatCollection);
  const cards = [
    ...legacy.cards.map((row) => formatCard(row, 'character')),
    ...legacy.items.map((row) => formatCard(row, 'item')),
    ...legacy.bosses.map((row) => formatCard(row, 'boss')),
  ];
  const forms = legacy.forms.map(formatForm);

  const collectionIds = new Set(collections.map((row) => row.id));
  const orphanRefs = [...new Set(cards.map((row) => row.collection_id).filter((id) => id && !collectionIds.has(id)))];
  if (orphanRefs.length) {
    console.warn(`Warning: ${orphanRefs.length} collection references are not present in the legacy collection seed. They will be skipped to preserve FK integrity.`);
  }
  const safeCards = cards.filter((row) => !row.collection_id || collectionIds.has(row.collection_id));

  const totals = {};
  totals.collections = await insertChunks('collections', collections);
  totals.cards = await insertChunks('cards', safeCards);
  if (forms.length) totals.forms = await insertChunks('card_forms', forms);
  else totals.forms = 0;

  console.log('Seed completed without overwrite.');
  console.log(JSON.stringify({ ...totals, skippedOrphanCards: cards.length - safeCards.length, retiredCollections: collections.filter((row) => !row.is_active).length }, null, 2));
}

main().catch((error) => {
  console.error('Migration aborted safely:', error.message);
  process.exit(1);
});
