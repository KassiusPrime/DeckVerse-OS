import { permanentlyDeleteAcervoEntry } from '../acervoService.js';
export default async function permanentlyDeleteAcervoEntry({ scope, id }) {
  return permanentlyDeleteAcervoEntry(scope, id);
}
