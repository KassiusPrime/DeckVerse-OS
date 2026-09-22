import { deactivateAcervoEntry as deactivate } from '../acervoService.js';

export default async function deactivateAcervoEntry({ scope, id }) {
  return deactivate(scope, id);
}
