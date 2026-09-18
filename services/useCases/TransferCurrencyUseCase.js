import { createTransactionId } from '../economy/transactionId.js';

const invalid=(code)=>Object.assign(new Error(code),{code});
export function createTransferCurrencyUseCase(repository){return Object.freeze({execute:async(from,to,amount,referenceType=null,referenceId=null,reason,transactionId=createTransactionId())=>{if(!from||!to)throw invalid('PLAYER_REQUIRED');if(from===to)throw invalid('SAME_PLAYER_TRANSFER');const n=Math.trunc(Number(amount));if(!Number.isSafeInteger(n)||n<1)throw invalid('INVALID_AMOUNT');return repository.transfer(from,to,n,referenceType,referenceId,reason||'Currency transfer',transactionId);}})}
