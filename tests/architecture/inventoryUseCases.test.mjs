import assert from 'node:assert/strict';
import {
  createGrantCardUseCase,
  createRemoveCardUseCase,
  createTransferCardUseCase,
  createEquipItemUseCase,
  createUnequipItemUseCase,
} from '../../services/useCases/inventoryUseCases.js';

const calls = [];
const repo = {
  adminGrantCard: async (...args) => { calls.push(['grant', ...args]); return { ok: true }; },
  adminRemoveCard: async (...args) => { calls.push(['remove', ...args]); return { ok: true }; },
  adminTransferCard: async (...args) => { calls.push(['transfer', ...args]); return { ok: true }; },
  equipItem: async (...args) => { calls.push(['equip', ...args]); return { ok: true }; },
  unequipItem: async (...args) => { calls.push(['unequip', ...args]); return { ok: true }; },
};

await createGrantCardUseCase(repo).execute('p1', 'c1', '2', '');
await createRemoveCardUseCase(repo).execute('p1', 'c1', 1, 'remove');
await createTransferCardUseCase(repo).execute('p1', 'p2', 'c1', 3, 'transfer');
await createEquipItemUseCase(repo).execute('c1', 2, 'item1');
await createUnequipItemUseCase(repo).execute('c1', 1);

assert.deepEqual(calls, [
  ['grant', 'p1', 'c1', 2, 'Ajuste administrativo'],
  ['remove', 'p1', 'c1', 1, 'remove'],
  ['transfer', 'p1', 'p2', 'c1', 3, 'transfer'],
  ['equip', 'c1', 2, 'item1'],
  ['unequip', 'c1', 1],
]);

await assert.rejects(() => createGrantCardUseCase(repo).execute('p1', 'c1', 0), /INVALID_COPIES/);
await assert.rejects(() => createTransferCardUseCase(repo).execute('p1', 'p1', 'c1', 1), /SAME_PROFILE_TRANSFER/);
await assert.rejects(() => createEquipItemUseCase(repo).execute('c1', 3, 'item1'), /INVALID_EQUIPMENT_SLOT/);

console.log('inventory use cases: ok');
