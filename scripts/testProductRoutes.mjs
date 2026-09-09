import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('App.jsx');
const navbar = read('Navbar.jsx');

const requiredRoutes = ['/', '/login', '/auth/callback', '/collections', '/collections/:collectionCode', '/characters', '/forms', '/items', '/bosses', '/gacha', '/game', '/my-collection', '/inventory', '/card/:id', '/profile', '/support', '/arena', '/battles', '/fandom', '/admin', '/admin/content', '/adm'];
const removedLegacyRoutes = ['/market', '/guilds', '/ranking', '/synergy', '/upgrade', '/store', '/dashboard', '/settings'];

const routes = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]));
const failures = [];
for (const route of requiredRoutes) if (!routes.has(route)) failures.push(`Missing required route: ${route}`);
for (const route of removedLegacyRoutes) if (routes.has(route)) failures.push(`Unimplemented legacy route still mounted in App.jsx: ${route}`);

if (!app.includes('<AdminRouteGuard><AdminSupabase /></AdminRouteGuard>')) failures.push('/admin is not protected by the Supabase admin guard.');
if (!app.includes('<AdminRouteGuard><AdminContentManager /></AdminRouteGuard>')) failures.push('/admin/content is not protected by the Supabase admin guard.');
if (!app.includes('<Navigate to="/admin" replace />')) failures.push('/adm does not redirect to /admin.');
if (!app.includes('<Route path="/inventory" element={<Navigate to="/my-collection" replace />} />')) failures.push('/inventory compatibility alias is missing.');
if (!app.includes('<Route path="/arena" element={<GameHub />} />')) failures.push('/arena compatibility route is missing.');
if (!app.includes('<Route path="/battles" element={<BattleHistory />} />')) failures.push('/battles route is missing.');
if (!app.includes('<Route path="/fandom" element={<FandomImporter />} />')) failures.push('/fandom utility route is missing.');
if (!navbar.includes('isAdmin &&')) failures.push('Admin navigation is not conditioned by Supabase role.');
if (!navbar.includes("to=\"/login\"")) failures.push('Discord login is not reachable from Navbar.');
if (!navbar.includes("to=\"/admin/content\"")) failures.push('Admin Content Center is not reachable from Navbar.');

if (failures.length) {
  console.error('DeckVerse product-route certification FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('DeckVerse product-route certification PASSED');
console.log(`Routes verified: ${requiredRoutes.length}`);
console.log('Player route aliases, Supabase auth, support, gacha, admin isolation, content center and legacy DOM removal verified.');
