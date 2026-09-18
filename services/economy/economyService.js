import walletRepository from '../repositories/walletRepository.js';
import {createGrantCurrencyUseCase} from '../useCases/GrantCurrencyUseCase.js';
import {createRemoveCurrencyUseCase} from '../useCases/RemoveCurrencyUseCase.js';
import {createTransferCurrencyUseCase} from '../useCases/TransferCurrencyUseCase.js';
import {eventBus} from '../../events/EventBus.js';
import {DeckCreditsGrantedEvent} from '../../events/DeckCreditsGrantedEvent.js';
import {DeckCreditsRemovedEvent} from '../../events/DeckCreditsRemovedEvent.js';
const grant=createGrantCurrencyUseCase(walletRepository), remove=createRemoveCurrencyUseCase(walletRepository), transfer=createTransferCurrencyUseCase(walletRepository);
const emit=(factory,result)=>result?.transaction_id?eventBus.emit(factory(result)):Promise.resolve(null);
export const economyService=Object.freeze({
 grantCurrency:async(...a)=>{const result=await grant.execute(...a);await emit(DeckCreditsGrantedEvent,result);return result;},
 removeCurrency:async(...a)=>{const result=await remove.execute(...a);await emit(DeckCreditsRemovedEvent,result);return result;},
 transferCurrency:async(...a)=>{const result=await transfer.execute(...a);await eventBus.emit({type:'CURRENCY_TRANSFERRED',occurredAt:new Date().toISOString(),payload:result});return result;}
});
export default economyService;
