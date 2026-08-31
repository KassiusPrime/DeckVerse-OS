import { getSupabaseBrowserClient } from './client.js';

export async function searchProfiles(query) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_search_profiles', { p_query: String(query || '').trim() });
  if (error) throw error;
  return data || [];
}

export async function getPlayerInventory(profileId) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('rosters')
    .select('id, profile_id, card_id, copies, is_equipped, acquired_at, cards(name, rarity, entity_type, image_url, collections(name))')
    .eq('profile_id', profileId)
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function grantCard(profileId, cardId, copies = 1, reason = 'Concessão administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_grant_card', {
    p_profile_id: profileId,
    p_card_id: cardId,
    p_copies: Math.max(1, Math.trunc(Number(copies) || 1)),
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function removeCard(profileId, cardId, copies = 1, reason = 'Remoção administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_remove_card', {
    p_profile_id: profileId,
    p_card_id: cardId,
    p_copies: Math.max(1, Math.trunc(Number(copies) || 1)),
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function transferCard(fromProfileId, toProfileId, cardId, copies = 1, reason = 'Transferência administrativa') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_transfer_card', {
    p_from_profile_id: fromProfileId,
    p_to_profile_id: toProfileId,
    p_card_id: cardId,
    p_copies: Math.max(1, Math.trunc(Number(copies) || 1)),
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function getAdminLedger(limit = 100) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, actor_profile_id, action, target_profile_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(500, Math.max(1, Number(limit) || 100)));
  if (error) throw error;
  return data || [];
}

export async function searchCards(query) {
  const supabase = getSupabaseBrowserClient();
  const needle = String(query || '').trim();
  if (!needle) return [];
  const { data, error } = await supabase
    .from('cards')
    .select('id, name, rarity, entity_type, image_url, collections(name)')
    .ilike('name', `%${needle.replace(/[%_]/g, '')}%`)
    .limit(30);
  if (error) throw error;
  return data || [];
}

export default { searchProfiles, getPlayerInventory, grantCard, removeCard, transferCard, getAdminLedger, searchCards };
