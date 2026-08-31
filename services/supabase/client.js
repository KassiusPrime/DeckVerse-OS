import { createClient } from '@supabase/supabase-js';

const readEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) return import.meta.env[key];
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) return process.env[key];
  return '';
};

export function getSupabaseUrl() {
  return readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL') || '';
}

export function getSupabasePublishableKey() {
  return readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || readEnv('VITE_SUPABASE_ANON_KEY') || '';
}

export function isSupabaseConfigured() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  return Boolean(url && key && !url.includes('example.supabase.co') && !key.includes('test_only'));
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

export function getPublicSiteUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const explicit = readEnv('VITE_SITE_URL') || readEnv('SITE_URL') || readEnv('VERCEL_PROJECT_PRODUCTION_URL') || '';
  if (!explicit) return 'http://localhost:3000';
  return explicit.startsWith('http') ? explicit.replace(/\/$/, '') : `https://${explicit.replace(/\/$/, '')}`;
}

export default getSupabaseBrowserClient;
