/**
 * Transaction boundary for the browser architecture.
 *
 * Supabase browser clients do not expose BEGIN/COMMIT/ROLLBACK. Therefore a
 * true transaction must live inside one Postgres RPC/function. This adapter
 * deliberately does not pretend to provide client-side transactions.
 */
export function createUnitOfWork(repository) {
  if (!repository || typeof repository.transaction !== 'function') {
    throw new TypeError('UNIT_OF_WORK_REPOSITORY_REQUIRED');
  }
  return Object.freeze({ execute: (operation) => repository.transaction(operation) });
}

export class UnitOfWorkRequiredError extends Error {
  constructor() {
    super('ATOMIC_OPERATION_REQUIRES_SERVER_TRANSACTION');
    this.name = 'UnitOfWorkRequiredError';
    this.code = 'ATOMIC_OPERATION_REQUIRES_SERVER_TRANSACTION';
  }
}
