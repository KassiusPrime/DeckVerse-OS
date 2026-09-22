export function PackOpenedEvent(payload) {
  return Object.freeze({
    type: 'PACK_OPENED',
    occurredAt: new Date().toISOString(),
    payload: Object.freeze({ ...payload }),
  });
}

export default PackOpenedEvent;
