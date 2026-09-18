export function createTransactionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  throw Object.assign(new Error('TRANSACTION_ID_GENERATION_UNAVAILABLE'), { code: 'TRANSACTION_ID_GENERATION_UNAVAILABLE' });
}

export function requireTransactionId(value) {
  const id = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw Object.assign(new Error('INVALID_TRANSACTION_ID'), { code: 'INVALID_TRANSACTION_ID' });
  }
  return id;
}
