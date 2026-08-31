import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const sql = read('supabase/publication_readiness.sql');
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
});

console.log(`\nPublication readiness certification: ${checks.length} checks passed.\n`);
