import inventoryRepository from '../repositories/inventoryRepository.js';
import {createGrantCardUseCase,createRemoveCardUseCase,createTransferCardUseCase,createEquipItemUseCase,createUnequipItemUseCase} from '../useCases/inventoryUseCases.js';
import {eventBus} from '../../events/EventBus.js';
import {InventoryTransferredEvent} from '../../events/InventoryTransferredEvent.js';
const grant=createGrantCardUseCase(inventoryRepository), remove=createRemoveCardUseCase(inventoryRepository), transfer=createTransferCardUseCase(inventoryRepository), equip=createEquipItemUseCase(inventoryRepository), unequip=createUnequipItemUseCase(inventoryRepository);
export const inventoryService=Object.freeze({
 getMyRosterWithArtwork:inventoryRepository.getMyRosterWithArtwork,getMyCardArtwork:inventoryRepository.getMyCardArtwork,getMyCardOwnership:inventoryRepository.getMyCardOwnership,savePlayerCardArtwork:inventoryRepository.savePlayerCardArtwork,clearPlayerCardArtwork:inventoryRepository.clearPlayerCardArtwork,
 grantCard:(...a)=>grant.execute(...a),removeCard:(...a)=>remove.execute(...a),
 transferCard:async(...a)=>{const result=await transfer.execute(...a);await eventBus.emit(InventoryTransferredEvent(result));return result;},
 equipItem:(...a)=>equip.execute(...a),unequipItem:(...a)=>unequip.execute(...a),
});
export default inventoryService;
