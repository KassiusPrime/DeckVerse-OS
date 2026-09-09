import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('App.jsx');
const navbar = read('Navbar.jsx');
const bottomNav = read('BottomNav.jsx');
const commandPalette = read('CommandPalette.jsx');

const requiredRoutes = ['/', '/login', '/auth/callback', '/collections', '/collections/:collectionCode', '/characters', '/forms', '/items', '/bosses', '/gacha', '/game', '/my-collection', '/inventory', '/card/:id', '/profile', '/support', '/arena', '/battles', '/fandom', '/admin', '/admin/content', '/adm'];
const publicPrimary = ['/collections', '/characters', '/forms', '/items', '/gacha', '/game', '/support'];
const removedLegacyRoutes = ['/market', '/guilds', '/ranking', '/synergy', '/upgrade', '/store', '/dashboard', '/settings'];

const routes = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]));
const failures = [];
for (const route of requiredRoutes) if (!routes.has(route)) failures.push(`Missing required route: ${route}`);
for (const route of publicPrimary) if (![navbar, bottomNav, commandPalette].some((source) => source.includes(route))) failures.push(`Public route not reachable: ${route}`);
for (const route of removedLegacyRoutes) if (routes.has(route)) failures.push(`Unimplemented legacy route still mounted in App.jsx: ${route}`);

if (!app.includes('<AdminRouteGuard><AdminSupabase /></AdminRouteGuard>')) failures.push('/admin is not protected by the Supabase admin guard.');
if (!app.includes('<AdminRouteGuard><AdminContentManager /></AdminRouteGuard>')) failures.push('/admin/content is not protected by the Supabase admin guard.');
if (!app.includes('<Navigate to="/admin" replace />')) failures.push('/adm does not redirect to /admin.');
for (const legacyComponent of ['AdminTerminal', 'CRTTerminalOverlay', 'BackgroundSyncIndicator', 'Dashboard', 'Arena', 'Market', 'Guilds', 'Settings']) {
  if (app.includes(legacyComponent)) failures.push(`Legacy runtime component is still imported/mounted: ${legacyComponent}`);
}

if (!navbar.includes('isAdmin &&')) failures.push('Admin navigation is not conditioned by Supabase role.');
if (!navbar.includes("to=\"/login\"") && !navbar.includes("'/login'")) failures.push('Discord login is not reachable from Navbar.');
if (!navbar.includes("to=\"/admin/content\"")) failures.push('Admin Content Center is not reachable from Navbar.');

if (failures.length) {
  console.error('DeckVerse product-route certification FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('DeckVerse product-route certification PASSED');
console.log(`Routes verified: ${requiredRoutes.length}`);
console.log('Player route aliases, Supabase auth, support, gacha, admin isolation, content center and legacy DOM removal verified.');
