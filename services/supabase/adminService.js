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
    .select('id, profile_id, card_id, copies, acquired_at, cards(name, rarity, entity_type, image_url, synopsis, collections(name))')
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
    .select('id, name, rarity, entity_type, image_url, synopsis, collections(name)')
    .ilike('name', `%${needle.replace(/[%_]/g, '')}%`)
    .limit(30);
  if (error) throw error;
  return data || [];
}

function cleanNeedle(query) {
  return String(query || '').trim().replace(/[%_]/g, '');
}

export async function searchSynopsisTargets(query = '', kind = 'all', limit = 80) {
  const supabase = getSupabaseBrowserClient();
  const needle = cleanNeedle(query);
  const safeLimit = Math.min(150, Math.max(10, Number(limit) || 80));
  const wantsCollections = kind === 'all' || kind === 'collection';
  const wantsForms = kind === 'all' || kind === 'form';
  const wantsCards = ['all', 'character', 'boss', 'item'].includes(kind);

  const jobs = [];
  if (wantsCollections) {
    let q = supabase.from('collections').select('id, name, synopsis, description, cover_url, category, is_active').order('name').limit(safeLimit);
    if (needle) q = q.ilike('name', `%${needle}%`);
    jobs.push(q.then(({ data, error }) => {
      if (error) throw error;
      return (data || []).map((row) => ({
        scope: 'collection', entityType: 'collection', id: row.id, name: row.name,
        synopsis: row.synopsis || '', description: row.description || '', imageUrl: row.cover_url || '',
        collectionName: row.name, category: row.category || '', isActive: row.is_active,
      }));
    }));
  }

  if (wantsCards) {
    let q = supabase.from('cards').select('id, name, synopsis, description, entity_type, image_url, rarity, collection_id, is_active, collections(name)').order('name').limit(safeLimit);
    if (kind !== 'all') q = q.eq('entity_type', kind);
    if (needle) q = q.ilike('name', `%${needle}%`);
    jobs.push(q.then(({ data, error }) => {
      if (error) throw error;
      return (data || []).map((row) => ({
        scope: 'card', entityType: row.entity_type, id: row.id, name: row.name,
        synopsis: row.synopsis || '', description: row.description || '', imageUrl: row.image_url || '',
        collectionId: row.collection_id, collectionName: row.collections?.name || '', rarity: row.rarity || '', isActive: row.is_active,
      }));
    }));
  }

  if (wantsForms) {
    let q = supabase.from('card_forms').select('id, card_id, name, synopsis, description, image_url, rarity, is_active, cards(name, collection_id, collections(name))').order('name').limit(safeLimit);
    if (needle) q = q.ilike('name', `%${needle}%`);
    jobs.push(q.then(({ data, error }) => {
      if (error) throw error;
      return (data || []).map((row) => ({
        scope: 'form', entityType: 'form', id: row.id, cardId: row.card_id, name: row.name,
        synopsis: row.synopsis || '', description: row.description || '', imageUrl: row.image_url || '',
        baseName: row.cards?.name || '', collectionId: row.cards?.collection_id || '',
        collectionName: row.cards?.collections?.name || '', rarity: row.rarity || '', isActive: row.is_active,
      }));
    }));
  }

  const groups = await Promise.all(jobs);
  return groups.flat().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
}

export async function updateSynopsis(scope, id, synopsis) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_update_synopsis', {
    p_scope: scope,
    p_id: id,
    p_synopsis: String(synopsis || '').trim(),
  });
  if (error) throw error;
  return data;
}

export default {
  searchProfiles,
  getPlayerInventory,
  grantCard,
  removeCard,
  transferCard,
  getAdminLedger,
  searchCards,
  searchSynopsisTargets,
  updateSynopsis,
};
