export function CardPurchasedEvent(payload){return Object.freeze({type:'CARD_PURCHASED',occurredAt:new Date().toISOString(),payload:Object.freeze({...payload})});}
