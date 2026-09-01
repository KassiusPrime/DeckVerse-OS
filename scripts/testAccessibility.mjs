import fs from 'node:fs';

const activeFiles = [
  'Home.jsx', 'Navbar.jsx', 'Catalog.jsx', 'CollectionsHub.jsx', 'FormsCatalog.jsx',
  'MyCollection.jsx', 'Profile.jsx', 'Login.jsx', 'AuthCallback.jsx', 'Support.jsx',
  'Gacha.jsx', 'AdminSupabase.jsx', 'CardDetail.jsx', 'CommandPalette.jsx', 'BottomNav.jsx'
];

const failures = [];
for (const file of activeFiles) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const selects = source.match(/<select\b[^>]*>/g) || [];
  selects.forEach((tag, index) => {
    if (!/aria-label=|aria-labelledby=/.test(tag)) failures.push(`${file}: select ${index + 1} lacks an accessible name`);
  });
}

const css = fs.readFileSync('index.css', 'utf8');
if (!css.includes('--primary: 252 100% 72%;')) failures.push('Primary token does not include the WCAG contrast margin');

const logo = fs.readFileSync('DeckVerseLogo.jsx', 'utf8');
if (!logo.includes('uppercase tracking-[0.2em] text-foreground/80')) failures.push('DeckVerse tagline contrast regression');

const collections = fs.readFileSync('CollectionsHub.jsx', 'utf8');
if (!collections.includes('function CollectionCover')) failures.push('Collection cover fallback component missing');
if (!collections.includes('/assets/brand/deckverse-mark.svg')) failures.push('Collection cover fallback must use the DeckVerse brand mark');
if (!collections.includes('Capa em preparação')) failures.push('Collection cover fallback must communicate non-canonical cover state');
if (!collections.includes('aria-label={`${name} — capa em preparação`}')) failures.push('Collection cover fallback lacks an accessible description');

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const routes = Array.isArray(vercel.routes) ? vercel.routes : [];
if (!routes.some((route) => route.handle === 'filesystem')) failures.push('vercel.json must preserve filesystem/API routes before SPA fallback');
if (!routes.some((route) => route.dest === '/index.html')) failures.push('vercel.json must preserve SPA fallback for /auth/callback and client routes');

const app = fs.readFileSync('App.jsx', 'utf8');
if (!app.includes('path="/auth/callback"')) failures.push('OAuth callback route missing');

const serviceWorker = fs.readFileSync('public/sw.js', 'utf8');
if (!serviceWorker.includes("deckverse-os-v11")) failures.push('Service worker cache namespace must be v11');
if (!serviceWorker.includes("event.request.mode === 'navigate'")) failures.push('Service worker must treat SPA navigations separately');
if (!serviceWorker.includes("fetch(event.request, { cache: 'no-store' })")) failures.push('SPA navigations must be network-first/no-store to prevent stale OAuth shells');
if (serviceWorker.includes('return cached || fetch(event.request).catch(() => caches.match("/"))')) failures.push('Legacy cache-first HTML fallback is forbidden');

const html = fs.readFileSync('index.html', 'utf8');
if (!html.includes("updateViaCache: 'none'")) failures.push('Service worker registration must bypass stale service-worker script cache');
if (!html.includes("navigator.serviceWorker.addEventListener('controllerchange'")) failures.push('Existing stale service workers must trigger one recovery reload');

if (failures.length) {
  console.error('Accessibility/OAuth routing certification failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Accessibility/OAuth routing certification: OK');
