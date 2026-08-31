import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✕ ${name}`);
    throw error;
  }
}

const pkg = json('package.json');
const app = read('App.jsx');
const auth = read('AuthContext.jsx');
const client = read('services/supabase/client.js');
const profileService = read('services/supabase/profileService.js');
const gameService = read('services/supabase/gameService.js');
const bootstrap = read('supabase/bootstrap.sql');
const botSql = read('supabase/discord_bot.sql');
const seed = read('scripts/seedSupabaseLegacy.mjs');
const discordApi = read('api/discord/interactions.js');
const mediaSql = read('supabase/media_storage.sql');
const publicUi = ['Catalog.jsx', 'CollectionsHub.jsx', 'FormsCatalog.jsx', 'CardDetail.jsx', 'Navbar.jsx', 'MyCollection.jsx'].map(read).join('\n');

console.log('\nDeckVerse v11 — Supabase architecture certification\n');

test('Supabase JS is pinned and Firebase runtime dependency is removed', () => {
  assert.equal(pkg.dependencies['@supabase/supabase-js'], '2.112.4');
  assert.equal(pkg.dependencies.firebase, undefined);
  assert.match(pkg.engines.node, /22/);
});

test('Browser client uses only publishable/anon credentials', () => {
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /SERVICE_ROLE_KEY/);
});

test('Discord OAuth is the product login path', () => {
  assert.match(auth, /provider:\s*['"]discord['"]/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /\/auth\/callback/);
  assert.doesNotMatch(auth, /signInWithEmailAndPassword|createUserWithEmailAndPassword/);
});

test('Admin route is protected by Supabase profile role', () => {
  assert.match(app, /AdminRouteGuard/);
  assert.match(app, /isAdmin/);
  assert.match(app, /<AdminRouteGuard><AdminSupabase \/><\/AdminRouteGuard>/);
});

test('Legacy floating console and old product routes are absent from runtime', () => {
  for (const legacy of ['AdminTerminal', 'CRTTerminalOverlay', 'BackgroundSyncIndicator', 'FandomImporter', 'Arena', 'Market', 'Guilds']) assert.doesNotMatch(app, new RegExp(legacy));
});

test('Public UI does not render technical COL prefixes', () => {
  assert.doesNotMatch(publicUi, />\s*\{?[^\n]*COL-/i);
  assert.doesNotMatch(publicUi, /label=['"]ID['"]/i);
});

test('All exposed game tables have RLS enabled', () => {
  const tables = ['collections','cards','card_forms','profiles','rosters','game_settings','economy_ledger','gacha_rolls','admin_audit_log','support_entries'];
  for (const table of tables) assert.match(bootstrap, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
});

test('Migration is non-destructive for catalog structure', () => {
  assert.doesNotMatch(bootstrap, /drop\s+table/i);
  assert.doesNotMatch(bootstrap, /truncate\s+table/i);
  assert.match(bootstrap, /update public\.collections\s+set is_active = false/i);
  assert.match(bootstrap, /upper\(id\) like 'COL-05%'/i);
  assert.match(bootstrap, /upper\(id\) like 'COL-06%'/i);
});

test('Admin authorization is based on profiles.role, never editable auth metadata', () => {
  const adminFn = bootstrap.match(/create or replace function app_private\.is_admin\(\)[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(adminFn, /public\.profiles/);
  assert.match(adminFn, /p\.role = 'admin'/);
  assert.doesNotMatch(adminFn, /raw_user_meta_data|user_metadata/);
  assert.match(profileService, /update\(\{ display_name: value/);
  assert.doesNotMatch(profileService, /role\s*:/);
});

test('Economy and roster writes use protected RPCs', () => {
  assert.match(gameService, /rpc\('roll_gacha'/);
  assert.match(gameService, /rpc\('set_equipped_card'/);
  assert.match(gameService, /rpc\('admin_adjust_balance'/);
  assert.match(bootstrap, /revoke insert, update, delete on public\.rosters from authenticated/i);
  assert.match(bootstrap, /revoke insert, update, delete on public\.economy_ledger from authenticated/i);
});

test('Legacy seed is idempotent and does not overwrite existing rows', () => {
  assert.match(seed, /upsert\(chunk, \{ onConflict: 'id', ignoreDuplicates: true \}\)/);
  assert.match(seed, /buildCollectionResolver/);
  assert.doesNotMatch(seed, /delete\(|truncate|drop table/i);
});

test('Data API privileges are explicit and separate from RLS', () => {
  assert.match(bootstrap, /grant select on public\.collections/);
  assert.match(bootstrap, /grant select on public\.profiles/);
  assert.match(bootstrap, /create policy collections_public_read/);
});

test('Discord endpoint verifies signatures before instantiating service-role Supabase', () => {
  const verifyIndex = discordApi.indexOf('verifyKey(');
  const clientInvocationIndex = discordApi.indexOf('const supabase = adminClient()');
  assert.ok(verifyIndex > 0);
  assert.ok(clientInvocationIndex > verifyIndex);
  assert.match(discordApi, /DISCORD_PUBLIC_KEY/);
  assert.match(discordApi, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(discordApi, /InteractionType\.MESSAGE_COMPONENT/);
});

test('Service role is restricted to server-side migration/bot surfaces', () => {
  for (const browserFile of ['AuthContext.jsx','Login.jsx','Profile.jsx','Gacha.jsx','AdminSupabase.jsx','services/supabase/client.js','services/supabase/gameService.js','services/supabase/catalogService.js','services/supabase/profileService.js','services/supabase/adminService.js']) {
    assert.doesNotMatch(read(browserFile), /SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.match(seed, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(discordApi, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('Discord bot roll RPC cannot be executed by browser roles', () => {
  assert.match(botSql, /revoke all on function public\.bot_roll_gacha\([^;]+from public, anon, authenticated/i);
  assert.match(botSql, /grant execute on function public\.bot_roll_gacha\([^;]+to service_role/i);
});

test('Canonical artwork bucket is cards and restricted to image types', () => {
  assert.match(mediaSql, /values \('cards', 'cards', true/);
  assert.match(mediaSql, /image\/jpeg/);
  assert.match(mediaSql, /image\/png/);
  assert.match(mediaSql, /image\/webp/);
  assert.doesNotMatch(mediaSql, /deckverse-media/);
});

console.log(`\nDeckVerse Supabase certification: ${passed} checks passed.\n`);
