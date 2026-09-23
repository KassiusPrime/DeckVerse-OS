import { deleteEntry, listCollections, searchEntries, updateEntry } from './acervoRepository.js';
import { getSupabaseBrowserClient } from '../supabase/client.js';

const normalizeRow = (row) => ({
  scope: row.scope,
  id: row.id,
  entityType: row.entity_type,
  name: row.name,
  synopsis: row.synopsis || '',
  description: row.description || '',
  imageUrl: row.image_url || '',
  collectionId: row.collection_id || '',
  collectionName: row.collection_name || '',
  baseName: row.base_name || '',
  rarity: row.rarity || '',
  isActive: row.is_active !== false,
});

export async function getAcervoCollections() {
  return listCollections();
}

export async function getAcervoEntries(filters = {}) {
  const rows = await searchEntries(filters);
  return rows.map(normalizeRow);
}

export async function saveAcervoEntry(scope, id, payload) {
  return updateEntry(scope, id, payload);
}

export async function bulkUpdateAcervoEntries(entries, patch) {
  const items = Array.isArray(entries) ? entries : [];
  if (!items.length) return [];
  const results = [];
  for (const entry of items) {
    results.push(await updateEntry(entry.scope, entry.id, patch));
  }
  return results;
}

export async function deactivateAcervoEntry(scope, id) {
  return deleteEntry(scope, id, false);
}

export async function permanentlyDeleteAcervoEntry(scope, id) {
  const result = await deleteEntry(scope, id, true);
  if (result?.mode === 'blocked') {
    const detail = (result.dependencies || []).map((item) => `${item.table}: ${item.count}`).join(', ');
    throw new Error(`EXCLUSÃO BLOQUEADA. Dependências: ${detail}`);
  }
  return result;
}

export async function uploadAcervoImage(file, collectionId) {
  if (!file) throw new Error('Selecione uma imagem.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2 MB.');

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
  if (!allowed.has(file.type)) throw new Error('Formato não suportado. Use JPG, PNG, WEBP, GIF ou AVIF.');

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const safeCollection = String(collectionId || 'uncategorized').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${safeCollection}/${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.storage.from('cards-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  const { data } = supabase.storage.from('cards-images').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('O upload terminou, mas a URL pública não foi gerada.');
  return data.publicUrl;
}
