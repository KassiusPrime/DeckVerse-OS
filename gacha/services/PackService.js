import OpenPackUseCase from '../useCases/OpenPackUseCase.js';
import { eventBus } from '../../events/EventBus.js';
import { PackOpenedEvent } from '../events/PackOpenedEvent.js';
import PackAuditService from './PackAuditService.js';

export const PackService = Object.freeze({
  async openPack(count = 1) {
    const result = await OpenPackUseCase.execute({ count });
    await eventBus.emit(PackOpenedEvent({ ...result, audit: PackAuditService.summarize(result) }));
    return result;
  },
});

export default PackService;
