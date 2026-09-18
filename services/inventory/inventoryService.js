import inventoryRepository from '../repositories/inventoryRepository.js';
import {
  createGrantCardUseCase,
  createRemoveCardUseCase,
  createTransferCardUseCase,
  createEquipItemUseCase,
  createUnequipItemUseCase,
} from '../useCases/inventoryUseCases.js';

const grant = createGrantCardUseCase(inventoryRepository);
const remove = createRemoveCardUseCase(inventoryRepository);
const transfer = createTransferCardUseCase(inventoryRepository);
const equip = createEquipItemUseCase(inventoryRepository);
const unequip = createUnequipItemUseCase(inventoryRepository);

export const inventoryService = Object.freeze({
  getMyRosterWithArtwork: inventoryRepository.getMyRosterWithArtwork,
  getMyCardArtwork: inventoryRepository.getMyCardArtwork,
  getMyCardOwnership: inventoryRepository.getMyCardOwnership,
  savePlayerCardArtwork: inventoryRepository.savePlayerCardArtwork,
  clearPlayerCardArtwork: inventoryRepository.clearPlayerCardArtwork,
  grantCard: (profileId, cardId, copies, reason) => grant.execute(profileId, cardId, copies, reason),
  removeCard: (profileId, cardId, copies, reason) => remove.execute(profileId, cardId, copies, reason),
  transferCard: (fromProfileId, toProfileId, cardId, copies, reason) =>
    transfer.execute(fromProfileId, toProfileId, cardId, copies, reason),
  equipItem: (characterCardId, slot, itemCardId) => equip.execute(characterCardId, slot, itemCardId),
  unequipItem: (characterCardId, slot) => unequip.execute(characterCardId, slot),
});

export default inventoryService;
