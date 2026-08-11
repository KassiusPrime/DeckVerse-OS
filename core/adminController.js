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
import { resolveCollectionCode } from "../lib/collectionCodes.js";

class AdminController {
  /**
   * Auth Override
   */
  verifyAdminKey(key) {
    const envKey = typeof process !== "undefined" && process.env ? process.env.ADMIN_PASSWORD : null;
    if (envKey) return key === envKey;
    return Boolean(key && key.trim().length >= 8);
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

  async deleteBoss(id) {
    return await entityRepository.deleteBoss(id);
  }

  /**
   * Item Operations
   */
  async getAllItems() {
    return await entityRepository.getAllItems();
  }

  async getItemById(id) {
    return await entityRepository.getItemById(id);
  }

  async saveItem(itemData) {
    return await entityRepository.saveItem(itemData);
  }

  async deleteItem(id) {
    return await entityRepository.deleteItem(id);
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
  /**
   * System Maintenance & Acervo Tools
   */
  async seedAcervo62() {
    return await importService.seedAcervo62();
  }

  async mergeDuplicateCollections() {
    return await importService.mergeDuplicateCollections();
  }

  async reclassifyCards() {
    return await importService.reclassifyCards();
  }

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

  /**
   * Search across all catalog entities (Collections, Characters, Items, Bosses)
   */
  async searchCatalog(query = "") {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { collections: [], characters: [], items: [], bosses: [] };
    }

    const [collections, cards, items, bosses] = await Promise.all([
      this.getAllCollections(),
      this.getAllCards(),
      this.getAllItems(),
      this.getAllBosses()
    ]);

    const matchedCollections = collections.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q)
    );

    const matchedCharacters = cards.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.card_id || "").toLowerCase().includes(q) ||
      (c.collection_id || "").toLowerCase().includes(q)
    );

    const matchedItems = items.filter(i =>
      (i.name || "").toLowerCase().includes(q) ||
      (i.item_id || "").toLowerCase().includes(q) ||
      (i.code || "").toLowerCase().includes(q) ||
      (i.collection_id || "").toLowerCase().includes(q)
    );

    const matchedBosses = bosses.filter(b =>
      (b.name || "").toLowerCase().includes(q) ||
      (b.title || "").toLowerCase().includes(q) ||
      (b.collection_id || "").toLowerCase().includes(q)
    );

    return {
      collections: matchedCollections,
      characters: matchedCharacters,
      items: matchedItems,
      bosses: matchedBosses
    };
  }

  /**
   * Get all entities belonging to a specific collection
   */
  async getCollectionEntities(collectionCode) {
    const canonCode = resolveCollectionCode(collectionCode) || collectionCode;
    const [cards, items, bosses] = await Promise.all([
      this.getAllCards(),
      this.getAllItems(),
      this.getAllBosses()
    ]);

    return {
      characters: cards.filter(c => resolveCollectionCode(c.collection_id || c.collection_code) === canonCode),
      items: items.filter(i => resolveCollectionCode(i.collection_id || i.collection_code) === canonCode),
      bosses: bosses.filter(b => resolveCollectionCode(b.collection_id || b.collection_code) === canonCode)
    };
  }

  /**
   * Create an entity prefilled from unmapped media file info
   */
  async createEntityFromMedia(fileInfo) {
    const parsed = fileInfo?.parsed || {};
    const colCode = parsed.collectionCodeCanonical || "COL-00-MULTI";
    const type = parsed.entityType || "character";
    const slug = parsed.targetSlug || "nova_entidade";

    const formattedName = slug
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());

    if (type === "collection") {
      return await this.saveCollection({
        code: colCode,
        name: formattedName
      });
    } else if (type === "item") {
      return await this.saveItem({
        name: formattedName,
        collection_id: colCode,
        type: "item"
      });
    } else if (type === "boss") {
      return await this.saveBoss({
        name: formattedName,
        collection_id: colCode,
        type: "boss"
      });
    } else {
      return await this.saveCard({
        name: formattedName,
        collection_id: colCode,
        rarity: "SR",
        role: "DPS"
      });
    }
  }
}

export const adminController = new AdminController();
