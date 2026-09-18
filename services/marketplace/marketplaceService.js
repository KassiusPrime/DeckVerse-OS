import { marketplaceRepository } from '../repositories/marketplaceRepository.js';
import { createPurchaseMarketListingUseCase } from '../useCases/purchaseMarketListing.js';
import { createCreateMarketListingUseCase } from '../useCases/createMarketListing.js';
import { createCancelMarketListingUseCase } from '../useCases/cancelMarketListing.js';
import { eventBus } from '../../events/EventBus.js';
import { CardPurchasedEvent } from '../../events/CardPurchasedEvent.js';
const purchase=createPurchaseMarketListingUseCase(marketplaceRepository);
const create=createCreateMarketListingUseCase(marketplaceRepository);
const cancel=createCancelMarketListingUseCase(marketplaceRepository);
export const marketplaceService=Object.freeze({
  getCurrentProfile: marketplaceRepository.getCurrentProfile,
  browse: marketplaceRepository.browse,
  getOwnedCards: marketplaceRepository.getOwnedCards,
  purchase:async(listingId,transactionId)=>{const result=await purchase.execute(listingId,transactionId);await eventBus.emit(CardPurchasedEvent(result));return result;},
  createListing:(cardId,quantity,priceDc)=>create.execute(cardId,quantity,priceDc),
  cancelListing:(listingId)=>cancel.execute(listingId),
});
export default marketplaceService;
