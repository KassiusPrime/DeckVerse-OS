import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const sql = read('supabase/publication_readiness.sql');
const entitySql = read('supabase/entity_publication_readiness.sql');
const catalog = read('services/supabase/catalogService.js');
const botSql = read('supabase/discord_bot.sql');

const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
  console.log(`✓ ${name}`);
}

console.log('\nDeckVerse — publication readiness certification\n');

test('planned collections are parked non-destructively when canonical media is absent', () => {
  assert.match(sql, /update\s+public\.collections[\s\S]*set[\s\S]*is_active\s*=\s*false/i);
  assert.match(sql, /not\s+exists[\s\S]*public\.media_assets/i);
  assert.doesNotMatch(sql, /delete\s+from|drop\s+table|truncate\s+/i);
});

test('entities without canonical base artwork are parked and removed from gacha', () => {
  assert.match(entitySql, /update\s+public\.cards/i);
  assert.match(entitySql, /is_active\s*=\s*false/i);
  assert.match(entitySql, /is_gacha_enabled\s*=\s*false/i);
  assert.match(entitySql, /media\.card_id\s*=\s*card\.id/i);
  assert.match(entitySql, /media\.entity_type\s+in\s*\('character',\s*'item',\s*'boss'\)/i);
  assert.doesNotMatch(entitySql, /delete\s+from|drop\s+table|truncate\s+/i);
});

test('entity gate only targets cards whose parent collection is currently published', () => {
  assert.match(entitySql, /collection\.id\s*=\s*card\.collection_id/i);
  assert.match(entitySql, /collection\.is_active\s*=\s*true/i);
});

test('public cards require an active parent collection', () => {
  assert.match(catalog, /collections!inner\(name, is_active\)/);
  assert.match(catalog, /\.eq\('collections\.is_active', true\)/);
});

test('public forms require both active base entity and active parent collection', () => {
  assert.match(catalog, /cards!inner\(name, entity_type, collection_id, is_active, collections!inner\(is_active\)\)/);
  assert.match(catalog, /\.eq\('cards\.is_active', true\)/);
  assert.match(catalog, /\.eq\('cards\.collections\.is_active', true\)/);
});

test('gacha never selects cards from parked collections', () => {
  assert.match(botSql, /collection_id\s+in\s*\(select id from public\.collections where is_active\)/i);
  assert.match(botSql, /where is_active and is_gacha_enabled/i);
});

console.log(`\nPublication readiness certification: ${checks.length} checks passed.\n`);
