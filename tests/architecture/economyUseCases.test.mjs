import assert from 'node:assert/strict';
import {createGrantCurrencyUseCase} from '../../services/useCases/GrantCurrencyUseCase.js';
import {createRemoveCurrencyUseCase} from '../../services/useCases/RemoveCurrencyUseCase.js';
import {createTransferCurrencyUseCase} from '../../services/useCases/TransferCurrencyUseCase.js';
const calls=[];const r={grant:async(...a)=>{calls.push(['g',...a]);return 1},remove:async(...a)=>{calls.push(['r',...a]);return 1},transfer:async(...a)=>{calls.push(['t',...a]);return 1}};
await createGrantCurrencyUseCase(r).execute('p',10);await createRemoveCurrencyUseCase(r).execute('p',5);await createTransferCurrencyUseCase(r,'a','b',2);
assert.deepEqual(calls,[['g','p',10,'ADMIN_GRANT',null,null,'Currency grant'],['r','p',5,'ADMIN_REMOVE',null,null,'Currency removal'],['t','a','b',2,null,null,'Currency transfer']]);
await assert.rejects(()=>createGrantCurrencyUseCase(r).execute('p',0),/INVALID_AMOUNT/);await assert.rejects(()=>createTransferCurrencyUseCase(r).execute('a','a',1),/SAME_PLAYER_TRANSFER/);console.log('economy use cases: ok');
