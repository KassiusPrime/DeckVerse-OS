import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const client = read('services/supabase/client.js');
const authCallback = read('AuthCallback.jsx');
const sw = read('public/sw.js');
const html = read('index.html');
const rls = read('supabase/public_catalog_rls.sql');
const catalog = read('services/supabase/catalogService.js');
const collections = read('CollectionsHub.jsx');

assert.match(client, /DEFAULT_PUBLIC_SITE_URL = 'https:\/\/deck-verse-os\.vercel\.app'/);
assert.match(client, /hostname\.endsWith\('\.vercel\.app'\)/);
assert.match(authCallback, /exchangeCodeForSession/);
assert.match(authCallback, /getSession\(\)/);
assert.match(authCallback, /navigate\('\/profile'/);

assert.match(sw, /deckverse-os-v11/);
assert.match(sw, /event\.request\.mode === 'navigate'/);
assert.match(sw, /cache: 'no-store'/);
assert.doesNotMatch(sw, /cached \|\| fetch\(event\.request\)\.catch\(\(\) => caches\.match\("\/"\)\)/);
assert.match(html, /updateViaCache: 'none'/);
assert.match(html, /controllerchange/);

assert.match(rls, /collections_public_active_read/);
assert.match(rls, /cards_public_active_read/);
assert.match(rls, /forms_public_active_read/);
assert.match(rls, /collections_admin_read_all/);
assert.match(rls, /cards_admin_read_all/);
assert.match(rls, /forms_admin_read_all/);
assert.doesNotMatch(rls, /is_active\s+or\s+app_private\.is_admin\(\)/i);

assert.match(catalog, /\.eq\('is_active', true\)/);
assert.match(catalog, /collections!inner\(name, is_active\)/);
assert.match(catalog, /\.eq\('collections\.is_active', true\)/);
assert.match(collections, /collection\.image_url \|\| collection\.cover_url/);
assert.match(collections, /entity\.image_url \|\| entity\.imageUrl/);

console.log('OAuth/public catalog certification: OK');
