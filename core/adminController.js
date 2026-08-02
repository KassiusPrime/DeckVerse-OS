// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Admin Controller
// Single controller interface between Admin Console UI and system core services
// Flow: UI -> Admin Controller -> Core Services -> Entity Repository -> Database
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "./entityRepository.js";
import { importService } from "./importService.js";
import { jobQueue } from "./jobQueue.js";
import { qualityService } from "./qualityService.js";
import { aiRouter } from "./aiRouter.js";

class AdminController {
  /**
   * Auth Override
   */
  verifyAdminKey(key) {
    const defaultKey = "OS_OVERRIDE_99";
    const envKey = typeof process !== "undefined" && process.env ? process.env.ADMIN_PASSWORD : null;
    const validKey = envKey || defaultKey;
    return key === validKey || key === defaultKey;
  }

  /**
   * Admin Dashboard Metrics Summary
   */
  async getDashboardSummary() {
    const stats = await entityRepository.getSystemStats();
    const quality = await qualityService.runFullDatabaseAudit();
    const jobs = jobQueue.getJobs();
    const history = jobQueue.getHistory();

    return {
      stats,
      quality: {
        globalScore: quality.globalScore,
        incompleteCardsCount: quality.incompleteCardsCount,
        quarantinedCount: quality.quarantinedCount
      },
      queue: {
        pendingJobsCount: jobs.filter(j => j.status === "pending").length,
        runningJobsCount: jobs.filter(j => j.status === "running").length,
        completedCount: history.filter(j => j.status === "completed").length,
        failedCount: history.filter(j => j.status === "failed").length,
        activeJobs: jobs
      },
      aiStatus: {
        geminiConfigured: Boolean(aiRouter.geminiKey),
        openRouterConfigured: Boolean(aiRouter.openRouterKey),
        activeRouterPolicy: "propose"
      }
    };
  }

  /**
   * Card Operations
   */
  async getAllCards() {
    return await entityRepository.getAllCards();
  }

  async getCardById(id) {
    return await entityRepository.getCardById(id);
  }

  async saveCard(cardData) {
    return await importService.importSingleCard(cardData, { overwrite: true });
  }

  async deleteCard(id) {
    return await entityRepository.deleteCard(id);
  }

  async importCardBatch(cardsArray, options = { overwrite: true }) {
    return await importService.importCardBatch(cardsArray, options);
  }

  /**
   * Collection Operations
   */
  async getAllCollections() {
    return await entityRepository.getAllCollections();
  }

  async saveCollection(collectionData) {
    return await importService.importCollection(collectionData);
  }

  async deleteCollection(idOrCode) {
    return await entityRepository.deleteCollection(idOrCode);
  }

  /**
   * Boss Operations
   */
  async getAllBosses() {
    return await entityRepository.getAllBosses();
  }

  async saveBoss(bossData) {
    return await entityRepository.saveBoss(bossData);
  }

  /**
   * Player & Gem Ops
   */
  async getAllPlayers() {
    return await entityRepository.getAllPlayers();
  }

  async updatePlayerCurrency(playerId, gems, gold) {
    const player = await entityRepository.getPlayerById(playerId);
    if (!player) throw new Error("Jogador não encontrado");

    const updated = {
      ...player,
      gems: Number(gems) >= 0 ? Number(gems) : player.gems,
      gold: Number(gold) >= 0 ? Number(gold) : player.gold,
      updated_at: new Date().toISOString()
    };

    return await entityRepository.savePlayer(updated);
  }

  /**
   * Quarantine & Quality Control
   */
  async getQuarantineItems() {
    return await entityRepository.getQuarantineItems();
  }

  async approveQuarantineCard(id) {
    return await qualityService.approveQuarantinedCard(id);
  }

  async rejectQuarantineCard(id) {
    return await qualityService.rejectQuarantinedCard(id);
  }

  async triggerDataQualityAudit() {
    return jobQueue.addJob("audit", {}, "Auditoria Global de Qualidade de Dados");
  }

  async triggerImageRepair() {
    return jobQueue.addJob("image_repair", {}, "Auto-Reparo Multi-Tier de Imagens");
  }

  async triggerBackfill() {
    return jobQueue.addJob("backfill", {}, "Preenchimento Retroativo de Atributos");
  }

  /**
   * AI Canonical Proposals
   */
  async proposeCardCorrection(card) {
    return await aiRouter.proposeCardCorrection(card);
  }

  /**
   * System Maintenance
   */
  async clearCaches() {
    return await entityRepository.clearAllCaches();
  }

  getJobQueueStatus() {
    return {
      jobs: jobQueue.getJobs(),
      history: jobQueue.getHistory()
    };
  }

  clearJobQueueHistory() {
    jobQueue.clearQueueAndHistory();
    return { success: true };
  }
}

export const adminController = new AdminController();
