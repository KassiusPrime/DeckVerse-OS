import { deleteEntry, listCollections, searchEntries, updateEntry } from './acervoRepository.js';

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
