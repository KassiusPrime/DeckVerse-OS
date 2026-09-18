import assert from 'node:assert/strict';
import {createGrantCurrencyUseCase} from '../../services/useCases/GrantCurrencyUseCase.js';
import {createRemoveCurrencyUseCase} from '../../services/useCases/RemoveCurrencyUseCase.js';
import {createTransferCurrencyUseCase} from '../../services/useCases/TransferCurrencyUseCase.js';

const calls=[];
const r={grant:async(...a)=>{calls.push(['g',...a]);return 1},remove:async(...a)=>{calls.push(['r',...a]);return 1},transfer:async(...a)=>{calls.push(['t',...a]);return 1}};
const tx1='550e8400-e29b-41d4-a716-446655440000';
const tx2='550e8400-e29b-41d4-a716-446655440001';
const tx3='550e8400-e29b-41d4-a716-446655440002';
await createGrantCurrencyUseCase(r).execute('p',10,'ADMIN_GRANT',null,null,'Currency grant',tx1);
await createRemoveCurrencyUseCase(r).execute('p',5,'ADMIN_REMOVE',null,null,'Currency removal',tx2);
await createTransferCurrencyUseCase(r).execute('a','b',2,null,null,'Currency transfer',tx3);
assert.deepEqual(calls,[['g','p',10,'ADMIN_GRANT',null,null,'Currency grant',tx1],['r','p',5,'ADMIN_REMOVE',null,null,'Currency removal',tx2],['t','a','b',2,null,null,'Currency transfer',tx3]]);
assert.match(calls[0][7],/^[0-9a-f-]{36}$/);
await assert.rejects(()=>createGrantCurrencyUseCase(r).execute('p',0),/INVALID_AMOUNT/);
await assert.rejects(()=>createTransferCurrencyUseCase(r).execute('a','a',1),/SAME_PLAYER_TRANSFER/);
console.log('economy use cases: ok');
