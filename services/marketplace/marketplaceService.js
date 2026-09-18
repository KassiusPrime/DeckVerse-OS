import { marketplaceRepository } from '../repositories/marketplaceRepository.js';
import { createPurchaseMarketListingUseCase } from '../useCases/purchaseMarketListing.js';
import { createCreateMarketListingUseCase } from '../useCases/createMarketListing.js';
import { createCancelMarketListingUseCase } from '../useCases/cancelMarketListing.js';

const purchase=createPurchaseMarketListingUseCase(marketplaceRepository);
const create=createCreateMarketListingUseCase(marketplaceRepository);
const cancel=createCancelMarketListingUseCase(marketplaceRepository);
export const marketplaceService=Object.freeze({
  getCurrentProfile: marketplaceRepository.getCurrentProfile,
  browse: marketplaceRepository.browse,
  getOwnedCards: marketplaceRepository.getOwnedCards,
  purchase:(listingId)=>purchase.execute(listingId),
  createListing:(cardId,quantity,priceDc)=>create.execute(cardId,quantity,priceDc),
  cancelListing:(listingId)=>cancel.execute(listingId),
});
export default marketplaceService;
