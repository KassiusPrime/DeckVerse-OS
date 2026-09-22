import { saveAcervoEntry } from '../acervoService.js';
export default async function updateAcervoEntry({ scope, id, ...payload }) {
  return saveAcervoEntry(scope, id, payload);
}
