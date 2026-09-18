import { catalogRepository } from '../repositories/catalogRepository.js';
import { createUpdateCatalogContentUseCase } from '../useCases/updateCatalogContent.js';

const updateCatalogContentUseCase = createUpdateCatalogContentUseCase(catalogRepository);

export async function updateCatalogContent(actor, target, payload) {
  return updateCatalogContentUseCase.execute(actor, target, payload);
}

export async function searchCatalog(filters = {}) {
  return catalogRepository.searchCatalog(filters);
}

export default Object.freeze({ searchCatalog, updateCatalogContent });
