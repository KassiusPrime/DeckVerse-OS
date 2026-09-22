import test from 'node:test';
import assert from 'node:assert/strict';

async function load() {
  return import('../useCases/OpenPackUseCase.js');
}

test('OpenPackUseCase generates a transaction_id when omitted', async () => {
  const { createOpenPackUseCase } = await load();
  const calls = [];
  const useCase = createOpenPackUseCase({
    async open(transactionId, count) {
      calls.push({ transactionId, count });
      return { transaction_id: transactionId, roll_count: count };
    },
  });

  const result = await useCase.execute({ count: 3 });
  assert.match(result.transaction_id, /^[0-9a-f-]{36}$/i);
  assert.equal(calls[0].count, 3);
});

test('OpenPackUseCase preserves an explicit transaction_id for replay protection', async () => {
  const { createOpenPackUseCase } = await load();
  const useCase = createOpenPackUseCase({
    async open(transactionId, count) {
      return { transaction_id: transactionId, roll_count: count };
    },
  });

  const result = await useCase.execute({
    count: 1,
    transactionId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.transaction_id, '11111111-1111-4111-8111-111111111111');
});
