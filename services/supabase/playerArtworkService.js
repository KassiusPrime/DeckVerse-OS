import { getSupabaseBrowserClient } from './client.js';

export const PLAYER_ARTWORK_BUCKET = 'player-card-artwork';
const SIGNED_URL_TTL = 60 * 60;

function slugify(value) {
  return String(value || 'card')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';
}

async function getCurrentUserId() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('AUTH_REQUIRED');
  return data.user.id;
}

export async function getMyCardOwnership(cardId) {
  const normalizedCardId = String(cardId || '').trim();
  if (!normalizedCardId) return false;
  const supabase = getSupabaseBrowserClient();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('rosters')
    .select('card_id')
    .eq('profile_id', userId)
    .eq('card_id', normalizedCardId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getMyCardArtwork(cardIds = []) {
  const ids = [...new Set(cardIds.filter(Boolean).map(String))];
  if (!ids.length) return [];

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('player_card_artwork')
    .select('id, user_id, card_id, artwork_url, artwork_source_type, artwork_storage_path, artwork_original_url, created_at, updated_at')
    .in('card_id', ids);

  if (error) throw error;

  const rows = data || [];
  const storagePaths = rows
    .filter((row) => row.artwork_source_type === 'storage' && row.artwork_storage_path)
    .map((row) => row.artwork_storage_path);

  let signedByPath = {};
  if (storagePaths.length) {
    const { data: signed, error: signedError } = await supabase
      .storage
      .from(PLAYER_ARTWORK_BUCKET)
      .createSignedUrls(storagePaths, SIGNED_URL_TTL);
    if (signedError) throw signedError;
    signedByPath = Object.fromEntries((signed || []).map((item) => [item.path, item.signedUrl]));
  }

  return rows.map((row) => ({
    ...row,
    effective_url: row.artwork_source_type === 'storage'
      ? signedByPath[row.artwork_storage_path] || ''
      : row.artwork_url
  }));
}

export async function getMyRosterWithArtwork() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('rosters')
    .select('id, card_id, copies, acquired_at, cards(name, rarity, entity_type, image_url, collection_id, synopsis, collections(name))')
    .order('acquired_at', { ascending: false });
  if (error) throw error;

  const roster = data || [];
  const overrides = await getMyCardArtwork(roster.map((entry) => entry.card_id));
  const byCardId = new Map(overrides.map((row) => [row.card_id, row]));

  return roster.map((entry) => ({
    ...entry,
    player_artwork: byCardId.get(entry.card_id) || null,
    effective_image_url: byCardId.get(entry.card_id)?.effective_url || entry.cards?.image_url || ''
  }));
}

export async function savePlayerCardArtwork({ cardId, file = null, externalUrl = '', sourceType = null }) {
  const supabase = getSupabaseBrowserClient();
  const userId = await getCurrentUserId();
  const normalizedCardId = String(cardId || '').trim();
  if (!normalizedCardId) throw new Error('CARD_ID_REQUIRED');

  const { data: owned, error: ownershipError } = await supabase
    .from('rosters')
    .select('card_id')
    .eq('profile_id', userId)
    .eq('card_id', normalizedCardId)
    .maybeSingle();
  if (ownershipError) throw ownershipError;
  if (!owned) throw new Error('CARD_NOT_OWNED');

  let payload;

  if (file) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.type)) throw new Error('IMAGE_TYPE_NOT_SUPPORTED');
    if (file.size > 10 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
    const path = `${userId}/${normalizedCardId}/${slugify(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PLAYER_ARTWORK_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true
      });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from(PLAYER_ARTWORK_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signedError) throw signedError;

    payload = {
      user_id: userId,
      card_id: normalizedCardId,
      artwork_url: signed.signedUrl,
      artwork_source_type: 'storage',
      artwork_storage_path: path,
      artwork_original_url: null,
      updated_at: new Date().toISOString()
    };
  } else {
    const value = String(externalUrl || '').trim();
    if (!/^https?:\/\//i.test(value)) throw new Error('INVALID_EXTERNAL_URL');
    payload = {
      user_id: userId,
      card_id: normalizedCardId,
      artwork_url: value,
      artwork_source_type: sourceType || 'external',
      artwork_storage_path: null,
      artwork_original_url: value,
      updated_at: new Date().toISOString()
    };
  }

  const { data, error } = await supabase
    .from('player_card_artwork')
    .upsert(payload, { onConflict: 'user_id,card_id' })
    .select('id, user_id, card_id, artwork_url, artwork_source_type, artwork_storage_path, artwork_original_url, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function clearPlayerCardArtwork(cardId) {
  const supabase = getSupabaseBrowserClient();
  const userId = await getCurrentUserId();
  const normalizedCardId = String(cardId || '').trim();
  if (!normalizedCardId) throw new Error('CARD_ID_REQUIRED');

  const { data: row, error: readError } = await supabase
    .from('player_card_artwork')
    .select('artwork_storage_path')
    .eq('user_id', userId)
    .eq('card_id', normalizedCardId)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase
    .from('player_card_artwork')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', normalizedCardId);
  if (error) throw error;

  if (row?.artwork_storage_path) {
    await supabase.storage.from(PLAYER_ARTWORK_BUCKET).remove([row.artwork_storage_path]);
  }
}

export default {
  getMyCardOwnership,
  getMyCardArtwork,
  getMyRosterWithArtwork,
  savePlayerCardArtwork,
  clearPlayerCardArtwork
};
