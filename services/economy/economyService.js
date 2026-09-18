import walletRepository from '../repositories/walletRepository.js';
import {createGrantCurrencyUseCase} from '../useCases/GrantCurrencyUseCase.js';
import {createRemoveCurrencyUseCase} from '../useCases/RemoveCurrencyUseCase.js';
import {createTransferCurrencyUseCase} from '../useCases/TransferCurrencyUseCase.js';
const grant=createGrantCurrencyUseCase(walletRepository), remove=createRemoveCurrencyUseCase(walletRepository), transfer=createTransferCurrencyUseCase(walletRepository);
export const economyService=Object.freeze({grantCurrency:(...a)=>grant.execute(...a),removeCurrency:(...a)=>remove.execute(...a),transferCurrency:(...a)=>transfer.execute(...a)});
export default economyService;
