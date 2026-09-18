export function InventoryTransferredEvent(payload){return Object.freeze({type:'INVENTORY_TRANSFERRED',occurredAt:new Date().toISOString(),payload:Object.freeze({...payload})});}
