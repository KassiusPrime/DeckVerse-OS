import { createClient } from '@supabase/supabase-js';

// These are public project coordinates, not secrets. Keeping safe defaults avoids
// a broken production build when Vercel's public VITE_* variables are absent.
const DEFAULT_SUPABASE_URL = 'https://rrujnjraonckjdtpsfol.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NRJVDNSi3raoHNaN3fcG8Q_cBlw5ZXn';
const DEFAULT_PUBLIC_SITE_URL = 'https://deck-verse-os.vercel.app';

const readEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) return import.meta.env[key];
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) return process.env[key];
  return '';
};

export function getSupabaseUrl() {
  return readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || readEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

export function isSupabaseConfigured() {
  const explicitUrl = readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL');
  const explicitKey = readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || readEnv('VITE_SUPABASE_ANON_KEY');
  if (explicitUrl?.includes('example.supabase.co') || explicitKey?.includes('test_only')) return false;
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

let browserClient = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'deckverse-auth-v11',
    },
    global: {
      headers: { 'X-Client-Info': 'deckverse-web/11' },
    },
  });
  return browserClient;
}

function normalizeSiteUrl(value) {
  const explicit = String(value || '').trim();
  if (!explicit) return '';
  return (explicit.startsWith('http') ? explicit : `https://${explicit}`).replace(/\/$/, '');
}

export function getPublicSiteUrl() {
  const configured = normalizeSiteUrl(
    readEnv('VITE_SITE_URL') || readEnv('SITE_URL') || readEnv('VERCEL_PROJECT_PRODUCTION_URL')
  );
  if (configured) return configured;

  if (typeof window !== 'undefined' && window.location?.origin) {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
    // OAuth started from a Vercel preview/branch URL should always return to the
    // stable production domain, avoiding preview auth protection and stale builds.
    if (hostname.endsWith('.vercel.app')) return DEFAULT_PUBLIC_SITE_URL;
    return origin;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

export default getSupabaseBrowserClient;
