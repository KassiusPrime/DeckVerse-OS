export const PackAuditService = Object.freeze({
  summarize(result) {
    return {
      transactionId: result?.transaction_id || null,
      count: Number(result?.roll_count || 0),
      cardsGenerated: Array.isArray(result?.pulls) ? result.pulls.length : 0,
      currency: result?.currency || 'deck_credits',
      cost: Number(result?.cost || 0),
      idempotent: Boolean(result?.idempotent),
    };
  },
});

export default PackAuditService;
