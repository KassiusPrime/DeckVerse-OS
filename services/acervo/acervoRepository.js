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
  const data = await rpc('admin_search_catalog_paginated', {
    p_query: String(filters.query || ''),
    p_kind: String(filters.kind || 'all'),
    p_collection_id: filters.collectionId ?? null,
    p_rarity: filters.rarity ?? null,
    p_letter: filters.letter ?? null,
    p_is_active: filters.isActive ?? null,
    p_limit: Math.min(100, Math.max(1, Number(filters.limit) || 48)),
    p_offset: Math.max(0, Number(filters.offset) || 0),
  });
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: Number(data?.total || 0),
  };
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

export async function createCard(payload = {}) {
  return rpc('admin_create_acervo_card', {
    p_collection_id: String(payload.collectionId || ''),
    p_name: String(payload.name || '').trim(),
    p_entity_type: payload.entityType || 'character',
    p_rarity: payload.rarity || 'Comum',
    p_role: payload.role || 'DPS',
    p_synopsis: payload.synopsis || null,
    p_description: payload.description || null,
    p_image_url: payload.imageUrl || null,
    p_is_active: payload.isActive !== false,
    p_is_gacha_enabled: payload.isGachaEnabled !== false,
  });
}
