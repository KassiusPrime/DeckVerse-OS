import { getAcervoEntries } from '../acervoService.js';
export default async function getCollectionEntries({ collectionId, kind = 'all', query = '', rarity = null, letter = null } = {}) {
  return getAcervoEntries({ collectionId, kind, query, rarity, letter, limit: 300 });
}
