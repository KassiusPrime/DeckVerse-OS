import { getSupabaseBrowserClient } from './client.js';

function normalizePreferences(data) {
  return {
    disabledCollections: Array.isArray(data?.disabled_collections) ? data.disabled_collections : [],
    wishedCollections: Array.isArray(data?.wished_collections) ? data.wished_collections : [],
    wishedCards: Array.isArray(data?.wished_cards) ? data.wished_cards : [],
  };
}

export async function getMyGachaPreferences() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_my_gacha_preferences');
  if (error) throw error;
  return normalizePreferences(data);
}

export async function setCollectionGachaPreference(collectionId, { disabled = false, wished = false } = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('set_collection_gacha_preference', {
    p_collection_id: String(collectionId || '').trim(),
    p_disabled: Boolean(disabled),
    p_wished: Boolean(wished),
  });
  if (error) throw error;
  return normalizePreferences(data);
}

export async function setCardWish(cardId, wished = true) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('set_card_wish', {
    p_card_id: String(cardId || '').trim(),
    p_wished: Boolean(wished),
  });
  if (error) throw error;
  return normalizePreferences(data);
}

export async function clearGachaDisablelist() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('clear_gacha_disablelist');
  if (error) throw error;
  return normalizePreferences(data);
}

export default {
  getMyGachaPreferences,
  setCollectionGachaPreference,
  setCardWish,
  clearGachaDisablelist,
};
