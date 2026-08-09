// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Data Quality Service (DQE v10 Unified Read-Only Wrapper)
// Delegation wrapper pointing to Data Quality Engine v10 as single authority.
// ════════════════════════════════════════════════════════════════════════════

import { evaluateEntityPipeline, runDataQualityAudit } from "../services/ai/dataQualityEngine.js";
import { entityRepository } from "./entityRepository.js";

class QualityService {
  /**
   * Evaluate a single card quality by delegating to Data Quality Engine v10
   */
  evaluateCardQuality(card) {
    const pipelineRes = evaluateEntityPipeline(card);

    return {
      card_id: card.card_id || card.id,
      card_name: card.name || card.title || "Sem Nome",
      score: pipelineRes.qualityScore,
      defects: pipelineRes.defects || [],
      isQuarantined: pipelineRes.primaryState === "quarantine",
      primaryState: pipelineRes.primaryState,
      status: pipelineRes.qualityScore >= 80 ? "excelente" : pipelineRes.qualityScore >= 50 ? "regular" : "critico",
      reason: pipelineRes.reason
    };
  }

  /**
   * Run full database quality audit in READ-ONLY mode (PROPOSE/DRY-RUN)
   * NO automatic mutations or writes to QuarantineCard store on audit load.
   */
  async runFullDatabaseAudit() {
    const auditReport = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });

    return {
      globalScore: auditReport.qualityScoreAverage || 85,
      totalCards: auditReport.totalAnalyzed,
      incompleteCardsCount: auditReport.quarantineCount + auditReport.invalidCount,
      quarantinedCount: auditReport.quarantineCount,
      evaluations: (auditReport?.proposals || []).map(p => ({
        card_id: p.cardId,
        card_name: p.name,
        score: p.qualityScore,
        defects: p.defects || [],
        isQuarantined: p.primaryState === "quarantine",
        primaryState: p.primaryState,
        status: p.qualityScore >= 80 ? "excelente" : p.qualityScore >= 50 ? "regular" : "critico",
        reason: p.reason
      })),
      auditReport
    };
  }

  /**
   * Approve a quarantined card (removes from quarantine and restores to DB)
   */
  async approveQuarantinedCard(id) {
    const quarantineItems = await entityRepository.getQuarantineItems();
    const item = quarantineItems.find(q => q.id === id || q.card_id === id);

    if (item && item.rawCard) {
      await entityRepository.saveCard(item.rawCard);
      await entityRepository.deleteQuarantineItem(item.id);
      return { success: true, card: item.rawCard };
    }
    return { success: false, reason: "Item não encontrado na quarentena" };
  }

  /**
   * Reject & purge a quarantined card
   */
  async rejectQuarantinedCard(id) {
    const quarantineItems = await entityRepository.getQuarantineItems();
    const item = quarantineItems.find(q => q.id === id || q.card_id === id);

    if (item) {
      if (item.id) {
        await entityRepository.deleteCard(item.id);
      }
      await entityRepository.deleteQuarantineItem(item.id);
      return { success: true };
    }
    return { success: false };
  }
}

export const qualityService = new QualityService();
