// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Background Synchronization Engine
// Decoupled, Intelligent, Autonomous Background Sync & Discovery Architecture
// ════════════════════════════════════════════════════════════════════════════

import { db } from "@/base44Client";
import { dataQualityEngine } from "../ai/dataQualityEngine";
import { enrichmentService } from "../ai/enrichmentService";
import { fandomClient } from "../fandom/fandomClient";
import { pushCRTLog } from "@/CRTTerminalOverlay";
import { importService } from "@/core/importService";

// ─── 1. Cache Service ───
export const CacheService = {
  get(key) {
    try {
      const item = localStorage.getItem(`dv_sync_cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },
  set(key, value, ttlMs = 86400000) { // 24h default TTL
    try {
      const payload = { value, expiry: Date.now() + ttlMs };
      localStorage.setItem(`dv_sync_cache_${key}`, JSON.stringify(payload));
    } catch (e) {
      // Ignore quota errors
    }
  },
  isValid(key) {
    const item = this.get(key);
    if (!item) return false;
    return item.expiry > Date.now();
  }
};

// ─── 2. Task Queue Service ───
export const TaskQueueService = {
  queue: [],
  enqueue(task) {
    this.queue.push(task);
    this.saveQueue();
  },
  dequeue() {
    const task = this.queue.shift();
    this.saveQueue();
    return task;
  },
  saveQueue() {
    try {
      localStorage.setItem("dv_pending_sync_tasks", JSON.stringify(this.queue));
    } catch (e) {}
  },
  loadQueue() {
    try {
      const stored = localStorage.getItem("dv_pending_sync_tasks");
      if (stored) this.queue = JSON.parse(stored);
    } catch (e) {
      this.queue = [];
    }
  }
};

// ─── 3. Quality Validation Service ───
export const QualityValidationService = {
  async validateAndAudit() {
    return await dataQualityEngine.runDataQualityAudit((msg, type) => {
      pushCRTLog(msg, (type || "info").toUpperCase());
    });
  }
};

// ─── 4. Image Sync Service ───
export const ImageSyncService = {
  async optimizeImage(card) {
    if (card.img_custom) return card.img_custom; // Preserve user custom upload

    const isCurrentOk = await dataQualityEngine.validateImageUrl(card.img_oficial || card.image_url, 2000);
    if (isCurrentOk) return card.img_oficial || card.image_url;

    const wikiSlug = fandomClient.resolveWikiSlug(card.collection_id || "NAR");
    try {
      const wikiImg = await fandomClient.fetchPageImages(card.name, wikiSlug);
      if (wikiImg && (await dataQualityEngine.validateImageUrl(wikiImg, 2000))) {
        return wikiImg;
      }
    } catch (e) {}

    return card.image_url || card.img_oficial;
  }
};

// ─── 5. Lore & Relationship Sync Service ───
export const LoreSyncService = {
  mergeLore(existingLore = "", newLore = "") {
    if (!existingLore) return newLore;
    if (!newLore) return existingLore;
    if (existingLore.includes(newLore.slice(0, 30))) return existingLore;
    return `${existingLore}\n\n[Atualização Canônica]: ${newLore}`;
  }
};

// ─── 6. Character & Card Sync Service ───
export const CharacterSyncService = {
  async discoverAndSyncCollectionCharacters(collectionCode, collectionName, onProgress = () => {}) {
    onProgress(`🔍 Buscando novos personagens para a coleção ${collectionName}...`);

    const wikiSlug = fandomClient.resolveWikiSlug(collectionCode);
    let wikiCandidates = [];

    try {
      const result = await fandomClient.searchCharacters(collectionName, wikiSlug);
      wikiCandidates = result.map(r => r.title);
    } catch (e) {
      wikiCandidates = [collectionName, `${collectionName} Hero`];
    }

    // Pega cartas existentes para evitar duplicatas
    const existingCards = await db.entities.Card.list("-created_date", 2000);
    const existingSlugs = new Set(existingCards.map(c => (c.name || "").trim().toLowerCase()));

    let addedCount = 0;

    for (const charName of wikiCandidates.slice(0, 3)) {
      const normName = charName.trim().toLowerCase();
      if (existingSlugs.has(normName)) continue; // Já existe, ignora para economizar chamadas

      onProgress(`⚡ Enriquecendo e criando carta canônica: ${charName}...`);

      try {
        const enriched = await enrichmentService.enrichCardFromWikiAndAI(charName, collectionCode);

        // Previne sobrescrever ou criar se inválido
        if (enriched && enriched.cardData && enriched.cardData.name) {
          await db.entities.Card.create({
            ...enriched.cardData,
            status: "valid",
            last_sync: new Date().toISOString(),
            last_validation: new Date().toISOString(),
            data_source: `Sincronização Automática Fandom (${wikiSlug})`
          });
          addedCount++;
          existingSlugs.add(normName);
        }
      } catch (err) {
        console.warn(`Erro ao sincronizar personagem ${charName}:`, err.message);
      }
    }

    return addedCount;
  }
};

// ─── 7. Collection & Boss Sync Service ───
export const CollectionSyncService = {
  async syncCollection(collection) {
    const lastSync = collection.last_sync ? new Date(collection.last_sync).getTime() : 0;
    const now = Date.now();

    // Se sincronizado nas últimas 12 horas, ignora para ser incremental
    if (now - lastSync < 12 * 3600 * 1000) {
      return { skipped: true };
    }

    pushCRTLog(`🔄 Sincronizando incrementalmente coleção: ${collection.name}`, "INFO");

    // Sincroniza novos personagens
    const addedCards = await CharacterSyncService.discoverAndSyncCollectionCharacters(
      collection.code,
      collection.name,
      (msg) => pushCRTLog(msg, "SYNC")
    );

    // Atualiza timestamp da coleção
    await db.entities.Collection.update(collection.id, {
      last_sync: new Date().toISOString(),
      character_count: (collection.character_count || 0) + addedCards
    });

    return { skipped: false, addedCards };
  }
};

// ─── 8. MAIN BACKGROUND SYNC ENGINE ───
class BackgroundSyncEngine {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.currentTask = "";
    this.progress = 0;
    this.online = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }

    TaskQueueService.loadQueue();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = {
      isSyncing: this.isSyncing,
      currentTask: this.currentTask,
      progress: this.progress,
      online: this.online
    };
    this.listeners.forEach((cb) => cb(state));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sync-status-changed", { detail: state }));
    }
  }

  handleOnline() {
    this.online = true;
    pushCRTLog("🌐 Conexão reestabelecida. Executando tarefas de sincronização pendentes...", "SUCCESS");
    this.notify();
    this.processPendingQueue();
  }

  handleOffline() {
    this.online = false;
    pushCRTLog("⚠️ Dispositivo offline. Sincronizações automáticas em segundo plano pausadas.", "WARN");
    this.notify();
  }

  async processPendingQueue() {
    if (!this.online || this.isSyncing) return;
    while (TaskQueueService.queue.length > 0) {
      const task = TaskQueueService.dequeue();
      try {
        pushCRTLog(`⚙️ Processando tarefa da fila: ${task.type}...`, "INFO");
        if (task.type === "SYNC_COLLECTION") {
          const col = await db.entities.Collection.get(task.collectionId);
          if (col) await CollectionSyncService.syncCollection(col);
        }
      } catch (e) {
        console.warn("Erro ao processar tarefa da fila:", e);
      }
    }
  }

  /**
   * Executa a sincronização completa em segundo plano sem travar a interface
   */
  async startBackgroundSync(triggerReason = "BOOT") {
    if (this.isSyncing) return;
    if (!this.online) {
      pushCRTLog("⚠️ Sincronização cancelada: Dispositivo offline.", "WARN");
      return;
    }

    this.isSyncing = true;
    this.progress = 5;
    this.currentTask = "Iniciando verificação de integridade...";
    this.notify();

    pushCRTLog(`🚀 [BACKGROUND SYNC ENGINE] Sincronização iniciada (${triggerReason})...`, "INFO");

    try {
      // 1. Auditoria e Validação de Qualidade Inicial
      this.currentTask = "Auditoria de Qualidade dos Dados...";
      this.progress = 20;
      this.notify();
      await QualityValidationService.validateAndAudit();

      // 2. Busca Coleções por Ordem de Prioridade
      this.currentTask = "Verificando coleções desatualizadas...";
      this.progress = 40;
      this.notify();

      const collections = await db.entities.Collection.list("-created_date", 100);

      // Prioriza coleções com menos sincronização
      const sortedCols = [...collections].sort((a, b) => {
        const tA = a.last_sync ? new Date(a.last_sync).getTime() : 0;
        const tB = b.last_sync ? new Date(b.last_sync).getTime() : 0;
        return tA - tB; // Mais antigas primeiro
      });

      let step = 0;
      const totalToSync = Math.min(sortedCols.length, 3); // Sincroniza top 3 mais antigas por ciclo

      for (const col of sortedCols.slice(0, totalToSync)) {
        step++;
        this.currentTask = `Sincronizando Coleção: ${col.name}...`;
        this.progress = 40 + Math.round((step / totalToSync) * 40);
        this.notify();

        await CollectionSyncService.syncCollection(col);
      }

      // 3. Sincroniza cartas importadas e banco direto para a coleção do jogador
      this.currentTask = "Sincronizando acervo importado para a coleção...";
      this.progress = 85;
      this.notify();
      const rosterRes = await importService.syncCardsToRoster().catch(() => ({ addedToRoster: 0 }));
      if (rosterRes.addedToRoster > 0) {
        pushCRTLog(`📦 [BACKGROUND SYNC ENGINE] ${rosterRes.addedToRoster} nova(s) carta(s) importada(s) adicionada(s) à Coleção!`, "SUCCESS");
      }

      // 4. Auditoria de Qualidade Pós-Sincronização
      this.currentTask = "Finalizando sanitização dos registros...";
      this.progress = 95;
      this.notify();
      await QualityValidationService.validateAndAudit();

      this.progress = 100;
      this.currentTask = "Sincronização concluída com sucesso!";
      pushCRTLog("🎉 [BACKGROUND SYNC ENGINE] Ciclo de sincronização concluído com sucesso!", "SUCCESS");
    } catch (err) {
      pushCRTLog(`💥 Erro na sincronização em segundo plano: ${err.message}`, "ERROR");
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
        this.currentTask = "";
        this.progress = 0;
        this.notify();
      }, 3000);
    }
  }
}

export const backgroundSyncService = new BackgroundSyncEngine();
export default backgroundSyncService;
