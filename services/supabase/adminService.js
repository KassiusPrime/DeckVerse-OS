import { getSupabaseBrowserClient } from './client.js';

export async function searchProfiles(query) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_search_profiles', { p_query: String(query || '').trim() });
  if (error) throw error;
  return data || [];
}

export async function searchAdminPlayers(query = '') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_search_players', { p_query: String(query || '').trim() });
  if (error) throw error;
  return data || [];
}

export async function updatePlayerStatus(profileId, status) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_player_status', { p_profile_id: profileId, p_status: status });
  if (error) throw error;
  return data;
}

export async function getPlayerInventory(profileId) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('rosters').select('id, profile_id, card_id, copies, acquired_at, cards(name, rarity, entity_type, image_url, synopsis, collections(name))').eq('profile_id', profileId).order('acquired_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function grantCard(profileId, cardId, copies = 1, reason = 'Concessão administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_grant_card', { p_profile_id: profileId, p_card_id: cardId, p_copies: Math.max(1, Math.trunc(Number(copies) || 1)), p_reason: reason });
  if (error) throw error;
  return data;
}

export async function removeCard(profileId, cardId, copies = 1, reason = 'Remoção administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_remove_card', { p_profile_id: profileId, p_card_id: cardId, p_copies: Math.max(1, Math.trunc(Number(copies) || 1)), p_reason: reason });
  if (error) throw error;
  return data;
}

export async function transferCard(fromProfileId, toProfileId, cardId, copies = 1, reason = 'Transferência administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_transfer_card', { p_from_profile_id: fromProfileId, p_to_profile_id: toProfileId, p_card_id: cardId, p_copies: Math.max(1, Math.trunc(Number(copies) || 1)), p_reason: reason });
  if (error) throw error;
  return data;
}

export async function getAdminLedger(limit = 100) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('admin_audit_log').select('id, actor_profile_id, action, target_profile_id, payload, created_at').order('created_at', { ascending: false }).limit(Math.min(500, Math.max(1, Number(limit) || 100)));
  if (error) throw error;
  return data || [];
}

function cleanNeedle(query) { return String(query || '').trim().replace(/[%_,]/g, ''); }

const mapCatalogRow = (row) => ({
  scope: row.scope,
  entityType: row.entity_type,
  id: row.id,
  name: row.name,
  synopsis: row.synopsis || '',
  description: row.description || '',
  imageUrl: row.image_url || '',
  collectionId: row.collection_id || '',
  collectionName: row.collection_name || '',
  baseName: row.base_name || '',
  rarity: row.rarity || '',
  isActive: row.is_active,
});

export async function searchAdminCatalog({ query = '', kind = 'all', collectionId = null, rarity = null, letter = null, limit = 300 } = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_search_catalog', {
    p_query: cleanNeedle(query), p_kind: kind || 'all', p_collection_id: collectionId, p_rarity: rarity, p_letter: letter,
    p_limit: Math.min(300, Math.max(20, Number(limit) || 300)),
  });
  if (error) throw error;
  return (data || []).map(mapCatalogRow);
}

export async function searchSynopsisTargets(query = '', kind = 'all', limit = 120) { return searchAdminCatalog({ query, kind, limit }); }

export async function updateSynopsis(scope, id, synopsis) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_synopsis', { p_scope: scope, p_id: id, p_synopsis: String(synopsis || '').trim() });
  if (error) throw error;
  return data;
}

export async function updateCollectionContent(id, payload = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_collection_content', { p_id: id, p_synopsis: payload.synopsis ?? null, p_is_active: payload.is_active ?? null, p_cover_url: payload.cover_url ?? null, p_clear_image: payload.clear_image === true });
  if (error) throw error;
  return data;
}

export async function updateCardContent(id, payload = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_card_content', { p_id: id, p_synopsis: payload.synopsis ?? null, p_is_active: payload.is_active ?? null, p_image_url: payload.image_url ?? null, p_clear_image: payload.clear_image === true });
  if (error) throw error;
  return data;
}

export async function updateFormContent(id, payload = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_form_content', { p_id: id, p_synopsis: payload.synopsis ?? null, p_is_active: payload.is_active ?? null, p_image_url: payload.image_url ?? null, p_clear_image: payload.clear_image === true });
  if (error) throw error;
  return data;
}

export async function importImageFromUrl(entity, url, entityType) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke('deckverse-admin-import-image', {
    body: { url, entity_type: entityType, collection_id: entity.collectionId || (entityType === 'collection' ? entity.id : 'MULTIVERSE'), name: entity.name },
  });
  if (error) throw error;
  if (!data?.image_url) throw new Error('IMAGE_IMPORT_FAILED');
  return data.image_url;
}

export async function bulkUpdateCatalog({ scope, ids, synopsis, isActive, imageUrl, rarity }) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_bulk_update_catalog', { p_scope: scope, p_ids: ids, p_synopsis: synopsis ?? null, p_is_active: typeof isActive === 'boolean' ? isActive : null, p_image_url: imageUrl ?? null, p_rarity: rarity ?? null });
  if (error) throw error;
  return data;
}

export default { searchProfiles, searchAdminPlayers, updatePlayerStatus, getPlayerInventory, grantCard, removeCard, transferCard, getAdminLedger, searchAdminCatalog, searchSynopsisTargets, updateSynopsis, updateCollectionContent, updateCardContent, updateFormContent, importImageFromUrl, bulkUpdateCatalog };
