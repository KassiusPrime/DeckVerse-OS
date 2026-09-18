export function RewardGrantedEvent(payload){return Object.freeze({type:'REWARD_GRANTED',occurredAt:new Date().toISOString(),payload:Object.freeze({...payload})});}
