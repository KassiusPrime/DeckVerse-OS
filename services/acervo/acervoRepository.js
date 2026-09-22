import { getSupabaseBrowserClient } from '../supabase/client.js';

const rpc = async (name, args) => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
};

export async function updateEntry(scope, id, payload = {}) {
  return rpc('admin_update_acervo_entry', {
    p_scope: scope,
    p_id: id,
    p_name: payload.name ?? null,
    p_rarity: payload.rarity ?? null,
    p_entity_type: payload.entityType ?? null,
    p_collection_id: payload.collectionId ?? null,
    p_synopsis: payload.synopsis ?? null,
    p_description: payload.description ?? null,
    p_image_url: payload.imageUrl ?? null,
    p_is_active: payload.isActive ?? null,
    p_clear_image: payload.clearImage === true,
  });
}

export async function deleteEntry(scope, id, hardDelete = false) {
  return rpc('admin_delete_acervo_entry', {
    p_scope: scope,
    p_id: id,
    p_hard_delete: hardDelete === true,
  });
}

export async function searchEntries(filters = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_search_catalog', {
    p_query: String(filters.query || ''),
    p_kind: String(filters.kind || 'all'),
    p_collection_id: filters.collectionId ?? null,
    p_rarity: filters.rarity ?? null,
    p_letter: filters.letter ?? null,
    p_limit: Math.min(300, Math.max(20, Number(filters.limit) || 300)),
  });
  if (error) throw error;
  return data || [];
}

export async function listCollections() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('collections')
    .select('id,name,description,synopsis,category,publisher,cover_url,is_active')
    .order('name')
    .order('id');
  if (error) throw error;
  return data || [];
}
