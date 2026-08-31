import assert from 'node:assert/strict';
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, generateExpandedCards } from '../src/data/megaCollectionsData.js';

const collectionAliases = new Set();
for (const collection of MEGA_COLLECTIONS || []) {
  for (const value of [collection.id, collection.code, collection.collection_code, collection.collection_id, collection.slug, ...(Array.isArray(collection.aliases) ? collection.aliases : [])]) {
    if (value) collectionAliases.add(String(value).trim().toLowerCase());
  }
}

const rows = [
  ...generateExpandedCards().map((row) => ({ ...row, _source: 'character' })),
  ...(MEGA_ITEMS || []).map((row) => ({ ...row, _source: 'item' })),
  ...(MEGA_BOSSES || []).map((row) => ({ ...row, _source: 'boss' })),
];

const ids = new Map();
const technicalCodes = new Map();
for (const row of rows) {
  const id = String(row.id ?? row.card_id ?? row.item_id ?? row.boss_id ?? '').trim();
  const name = String(row.name ?? row.title ?? '').trim();
  assert.ok(id, `${row._source} without primary ID: ${name || '<unnamed>'}`);
  assert.ok(name, `${row._source} ${id} has no name`);
  const previous = ids.get(id);
  assert.equal(previous, undefined, `Duplicate catalog ID ${id}: ${previous?.name || 'unknown'} (${previous?.source || '?'}) vs ${name} (${row._source})`);
  ids.set(id, { name, source: row._source });

  const collection = row.collection_id ?? row.collection_code ?? row.collectionCode ?? row.collection;
  if (collection) assert.ok(collectionAliases.has(String(collection).trim().toLowerCase()), `Unknown collection reference ${collection} on ${id}`);

  for (const field of ['item_code', 'boss_code', 'card_code']) {
    if (!row[field]) continue;
    const key = `${field}:${String(row[field]).trim().toUpperCase()}`;
    const prior = technicalCodes.get(key);
    assert.equal(prior, undefined, `Duplicate ${field} ${row[field]}: ${prior || 'unknown'} vs ${id}`);
    technicalCodes.set(key, id);
  }
}

console.log(`Catalog identity certification PASSED: ${rows.length} rows / ${ids.size} unique IDs.`);
