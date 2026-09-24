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

export async function importCollection(payload = {}) {
  return rpc('admin_import_acervo_collection', {
    p_collection: payload.collection || {},
    p_entries: Array.isArray(payload.entries) ? payload.entries : [],
  });
}

export async function recordImportedMedia(payload = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('media_assets').upsert({
    collection_id: payload.collectionId || null,
    card_id: payload.cardId || null,
    form_id: payload.formId || null,
    entity_type: payload.entityType,
    storage_path: payload.storagePath,
    original_filename: payload.originalFilename,
    sha256: payload.sha256,
    mime_type: payload.mimeType || null,
    byte_size: payload.byteSize || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'storage_path', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCollectionImage(collectionId, imageUrl) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('collections')
    .update({ cover_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', collectionId);
  if (error) throw error;
  return { ok: true };
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

export async function createAcervoImportJob(payload = {}) {
  return rpc('admin_create_acervo_import_job', {
    p_collection_id: payload.collectionId,
    p_total_entries: Number(payload.totalEntries) || 0,
    p_images: Array.isArray(payload.images) ? payload.images : [],
  });
}

export async function listAcervoImportJobs(limit = 20) {
  const data = await rpc('admin_list_acervo_import_jobs', { p_limit: limit });
  return Array.isArray(data) ? data : [];
}

export async function getAcervoImportJob(jobId) {
  return rpc('admin_get_acervo_import_job', { p_job_id: jobId });
}

export async function claimAcervoImportItem(jobId, itemId) {
  return rpc('admin_claim_acervo_import_item', { p_job_id: jobId, p_item_id: itemId });
}

export async function finalizeAcervoImportJob(jobId) {
  return rpc('admin_finalize_acervo_import_job', { p_job_id: jobId });
}

export async function finishAcervoImportItem(jobId, itemId, status, errorMessage = null, checksum = null) {
  return rpc('admin_finish_acervo_import_item', {
    p_job_id: jobId,
    p_item_id: itemId,
    p_status: status,
    p_error: errorMessage,
    p_checksum: checksum,
  });
}
