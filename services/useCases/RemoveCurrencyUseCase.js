import { createTransactionId } from '../economy/transactionId.js';

const invalid=(code)=>Object.assign(new Error(code),{code});
export function createRemoveCurrencyUseCase(repository){return Object.freeze({execute:async(playerId,amount,type='ADMIN_REMOVE',referenceType=null,referenceId=null,reason,transactionId=createTransactionId())=>{if(!playerId)throw invalid('PLAYER_REQUIRED');const n=Math.trunc(Number(amount));if(!Number.isSafeInteger(n)||n<1)throw invalid('INVALID_AMOUNT');return repository.remove(playerId,n,type,referenceType,referenceId,reason||'Currency removal',transactionId);}})}
