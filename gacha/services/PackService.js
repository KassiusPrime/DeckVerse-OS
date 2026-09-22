import OpenPackUseCase from '../useCases/OpenPackUseCase.js';
import { eventBus } from '../../events/EventBus.js';
import { PackOpenedEvent } from '../events/PackOpenedEvent.js';

export const PackService = Object.freeze({
  async openPack(count = 1) {
    const result = await OpenPackUseCase.execute({ count });
    await eventBus.emit(PackOpenedEvent(result));
    return result;
  },
});

export default PackService;
