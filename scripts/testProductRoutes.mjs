import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('App.jsx');
const navbar = read('Navbar.jsx');
const bottomNav = read('BottomNav.jsx');
const commandPalette = read('CommandPalette.jsx');

const requiredRoutes = ['/', '/login', '/collections', '/collections/:collectionCode', '/characters', '/forms', '/items', '/bosses', '/my-collection', '/card/:id', '/owner', '/owner/advanced', '/admin', '/adm'];
const primaryPublicRoutes = ['/', '/collections', '/characters', '/forms', '/items', '/my-collection'];
const hiddenCompatibilityRoutes = ['/bosses'];
const legacyPrimaryRoutes = ['/arena', '/gacha', '/market', '/guilds', '/battles', '/ranking', '/synergy', '/upgrade'];

const routePattern = /<Route\s+path="([^"]+)"/g;
const routes = new Set([...app.matchAll(routePattern)].map((match) => match[1]));
const navTargets = new Set();
for (const source of [navbar, bottomNav, commandPalette]) {
  for (const match of source.matchAll(/(?:to:|to=)\s*["']([^"']+)["']/g)) navTargets.add(match[1]);
}

const failures = [];
for (const route of requiredRoutes) if (!routes.has(route)) failures.push(`Missing required route: ${route}`);
for (const target of navTargets) {
  if (target.includes(':') || target.includes('?') || target.includes('${')) continue;
  if (!routes.has(target)) failures.push(`Navigation target has no matching route: ${target}`);
}
for (const route of primaryPublicRoutes) {
  if (![navbar, bottomNav, commandPalette].some((source) => source.includes(route))) failures.push(`Core route is not reachable from navigation/search UI: ${route}`);
}
for (const route of [...legacyPrimaryRoutes, ...hiddenCompatibilityRoutes]) {
  for (const [name, source] of [['Navbar', navbar], ['BottomNav', bottomNav], ['CommandPalette', commandPalette]]) {
    if (source.includes(`to: \"${route}\"`) || source.includes(`to=\"${route}\"`) || source.includes(`to: '${route}'`) || source.includes(`to='${route}'`)) failures.push(`Compatibility/legacy route leaked into primary ${name}: ${route}`);
  }
}

if (!app.includes('<Route path="/bosses" element={<Navigate to="/forms" replace />} />')) failures.push('/bosses does not redirect to canonical /forms.');
if (!app.includes('<OwnerRouteGuard><OwnerConsole /></OwnerRouteGuard>')) failures.push('/owner is not protected by OwnerRouteGuard.');
if (!app.includes('<OwnerRouteGuard returnTo="/owner/advanced"><Admin /></OwnerRouteGuard>')) failures.push('Advanced admin is not owner-only.');
if (!app.includes('<Route path="/admin" element={<Navigate to="/owner" replace />} />')) failures.push('/admin does not redirect to owner console.');
if (app.includes('AdminTerminal') || app.includes('CRTTerminalOverlay') || app.includes('BackgroundSyncIndicator')) failures.push('Floating console/runtime admin controls must not be mounted from App.jsx.');
if (!navbar.includes('isOwner &&') || !navbar.includes('to="/owner"')) failures.push('Owner navigation is not conditionally restricted to isOwner.');
if (!navbar.includes('to="/login"')) failures.push('Firebase login is not reachable from Navbar.');

if (failures.length) {
  console.error('DeckVerse product-route certification FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('DeckVerse product-route certification PASSED');
console.log(`Routes verified: ${requiredRoutes.length}`);
console.log(`Navigation targets verified: ${navTargets.size}`);
console.log('Owner-only console, Firebase login, forms-first navigation and SPA routes verified.');
