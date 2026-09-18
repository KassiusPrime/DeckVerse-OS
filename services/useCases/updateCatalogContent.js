import { PERMISSIONS, requirePermission } from '../architecture/permissionService.js';

export function createUpdateCatalogContentUseCase(repository) {
  return Object.freeze({
    async execute(actor, target, payload) {
      requirePermission(actor, PERMISSIONS.MANAGE_CATALOG);
      if (!target?.id || !['collection', 'card', 'form'].includes(target.entityType)) {
        const error = new Error('INVALID_CATALOG_TARGET');
        error.code = 'INVALID_CATALOG_TARGET';
        throw error;
      }
      if (typeof payload?.synopsis === 'string') payload.synopsis = payload.synopsis.trim();
      if (target.entityType === 'collection') return repository.updateCollection(target.id, payload);
      if (target.entityType === 'form') return repository.updateForm(target.id, payload);
      return repository.updateCard(target.id, payload);
    },
  });
}
