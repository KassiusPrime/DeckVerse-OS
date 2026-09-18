import economyRepository from '../repositories/economyRepository.js';

export const economyAuditService=Object.freeze({
  snapshot:()=>economyRepository.auditSnapshot(),
  recordCardGenerated:(transactionId,cardId,playerId,quantity=1,metadata={})=>economyRepository.recordCardAudit(transactionId,'CARD_GENERATED',cardId,playerId,quantity,metadata),
  recordCardDestroyed:(transactionId,cardId,playerId,quantity=1,metadata={})=>economyRepository.recordCardAudit(transactionId,'CARD_DESTROYED',cardId,playerId,quantity,metadata),
});
export default economyAuditService;
