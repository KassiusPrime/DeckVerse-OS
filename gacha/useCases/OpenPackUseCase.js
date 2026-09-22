import PackRepository from '../repositories/PackRepository.js';

export function createOpenPackUseCase(repository = PackRepository) {
  return Object.freeze({
    async execute({ count = 1, transactionId = globalThis.crypto?.randomUUID?.() || (() => { throw Object.assign(new Error('TRANSACTION_ID_GENERATION_FAILED'), { code: 'TRANSACTION_ID_GENERATION_FAILED' }); })() } = {}) {
      const normalizedCount = Math.max(1, Math.floor(Number(count) || 1));
      if (!transactionId) throw Object.assign(new Error('TRANSACTION_ID_REQUIRED'), { code: 'TRANSACTION_ID_REQUIRED' });
      return repository.open(transactionId, normalizedCount);
    },
  });
}

export const OpenPackUseCase = createOpenPackUseCase();
export default OpenPackUseCase;
