import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('App.jsx');
const navbar = read('Navbar.jsx');
const bottomNav = read('BottomNav.jsx');
const commandPalette = read('CommandPalette.jsx');

const requiredRoutes = ['/', '/collections', '/characters', '/items', '/bosses', '/my-collection', '/card/:id', '/admin', '/adm'];
const primaryPublicRoutes = ['/', '/collections', '/characters', '/items', '/bosses', '/my-collection'];
const legacyPrimaryRoutes = ['/arena', '/gacha', '/market', '/guilds', '/battles', '/ranking', '/synergy', '/upgrade'];

const routePattern = /<Route\s+path="([^"]+)"/g;
const routes = new Set([...app.matchAll(routePattern)].map((match) => match[1]));

const navTargets = new Set();
for (const source of [navbar, bottomNav, commandPalette]) {
  for (const match of source.matchAll(/(?:to:|to=)\s*["']([^"']+)["']/g)) navTargets.add(match[1]);
}

const failures = [];

for (const route of requiredRoutes) {
  if (!routes.has(route)) failures.push(`Missing required route: ${route}`);
}

for (const target of navTargets) {
  if (target.includes(':') || target.includes('?') || target.includes('${')) continue;
  if (!routes.has(target)) failures.push(`Navigation target has no matching route: ${target}`);
}

for (const route of primaryPublicRoutes) {
  const foundInNavigation = [navbar, bottomNav, commandPalette].some((source) => source.includes(route));
  if (!foundInNavigation) failures.push(`Core route is not reachable from navigation/search UI: ${route}`);
}

for (const route of legacyPrimaryRoutes) {
  for (const [name, source] of [['Navbar', navbar], ['BottomNav', bottomNav], ['CommandPalette', commandPalette]]) {
    if (source.includes(`to: \"${route}\"`) || source.includes(`to=\"${route}\"`) || source.includes(`to: '${route}'`) || source.includes(`to='${route}'`)) {
      failures.push(`Legacy route leaked into primary ${name}: ${route}`);
    }
  }
}

if (!app.includes('<AdminRouteGuard><Admin /></AdminRouteGuard>')) failures.push('Admin route is not protected by AdminRouteGuard.');
if (!app.includes('<Navigate to="/admin" replace />')) failures.push('/adm does not redirect to canonical /admin.');
if (!app.includes('isActiveAdmin && <AdminTerminal />')) failures.push('Admin terminal is not isolated from public runtime.');
if (!app.includes('isActiveAdmin && <CRTTerminalOverlay />')) failures.push('CRT overlay is not isolated from public runtime.');

if (failures.length) {
  console.error('DeckVerse product-route certification FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('DeckVerse product-route certification PASSED');
console.log(`Routes verified: ${requiredRoutes.length}`);
console.log(`Navigation targets verified: ${navTargets.size}`);
console.log('Admin isolation and legacy-route visibility verified.');
