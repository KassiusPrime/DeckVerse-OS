export function createEconomyHandler(economyService){return async event=>{if(!economyService)return null;return {type:event.type,transactionId:event.payload?.transactionId||null};};}
