// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Job Queue Engine
// Background job queue for data audit, backfill, AI enrichment & image repairs
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "./entityRepository.js";
import { qualityService } from "./qualityService.js";
import { dataQualityEngine } from "../services/ai/dataQualityEngine.js";

class JobQueue {
  constructor() {
    this.jobs = [];
    this.isProcessing = false;
    this.history = [];
    this.loadQueueFromStorage();
  }

  loadQueueFromStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedJobs = localStorage.getItem("deckverse_job_queue");
        if (storedJobs) {
          this.jobs = JSON.parse(storedJobs);
        }
        const storedHistory = localStorage.getItem("deckverse_job_history");
        if (storedHistory) {
          this.history = JSON.parse(storedHistory);
        }
      } catch (e) {
        this.jobs = [];
        this.history = [];
      }
    }
  }

  saveQueueToStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("deckverse_job_queue", JSON.stringify(this.jobs.slice(0, 50)));
        localStorage.setItem("deckverse_job_history", JSON.stringify(this.history.slice(0, 100)));
      } catch (e) {}
    }
  }

  /**
   * Add a new job to the queue
   */
  addJob(type, payload = {}, title = "") {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const job = {
      id,
      type, // 'audit', 'backfill', 'image_repair', 'roster_sync', 'enrichment'
      title: title || `Tarefa: ${type.toUpperCase()}`,
      payload,
      status: "pending", // 'pending', 'running', 'completed', 'failed'
      progress: 0, // 0 to 100
      retries: 0,
      maxRetries: 3,
      logs: [`[${new Date().toLocaleTimeString()}] Tarefa criada e adicionada à fila.`],
      created_at: new Date().toISOString()
    };

    this.jobs.push(job);
    this.saveQueueToStorage();
    this.processNext();
    return job;
  }

  getJobs() {
    return [...this.jobs];
  }

  getHistory() {
    return [...this.history];
  }

  /**
   * Process jobs sequentially
   */
  async processNext() {
    if (this.isProcessing) return;

    const pendingJob = this.jobs.find(j => j.status === "pending");
    if (!pendingJob) return;

    this.isProcessing = true;
    pendingJob.status = "running";
    pendingJob.started_at = new Date().toISOString();
    pendingJob.logs.push(`[${new Date().toLocaleTimeString()}] Iniciando execução...`);
    this.saveQueueToStorage();

    try {
      await this.executeJobLogic(pendingJob);
      pendingJob.status = "completed";
      pendingJob.progress = 100;
      pendingJob.completed_at = new Date().toISOString();
      pendingJob.logs.push(`[${new Date().toLocaleTimeString()}] Tarefa concluída com sucesso.`);
    } catch (err) {
      pendingJob.retries++;
      if (pendingJob.retries < pendingJob.maxRetries) {
        pendingJob.status = "pending";
        pendingJob.logs.push(`[${new Date().toLocaleTimeString()}] Erro (${err.message}). Tentativa ${pendingJob.retries}/${pendingJob.maxRetries}. Reiniciando em breve...`);
      } else {
        pendingJob.status = "failed";
        pendingJob.failed_at = new Date().toISOString();
        pendingJob.logs.push(`[${new Date().toLocaleTimeString()}] FALHA DEFINITIVA: ${err.message}`);
      }
    } finally {
      // Archive job if finished
      if (pendingJob.status === "completed" || pendingJob.status === "failed") {
        this.jobs = this.jobs.filter(j => j.id !== pendingJob.id);
        this.history.unshift(pendingJob);
      }
      this.isProcessing = false;
      this.saveQueueToStorage();

      // Trigger next job in line
      setTimeout(() => this.processNext(), 200);
    }
  }

  /**
   * Job execution routing
   */
  async executeJobLogic(job) {
    switch (job.type) {
      case "audit": {
        job.logs.push("Executando auditoria global de qualidade de dados...");
        job.progress = 30;
        const auditRes = await qualityService.runFullDatabaseAudit();
        job.progress = 80;
        job.logs.push(`Auditoria finalizada. Score de Qualidade Global: ${auditRes.globalScore}/100.`);
        job.logs.push(`Cartas em Quarentena: ${auditRes.quarantinedCount}. Incompletas: ${auditRes.incompleteCardsCount}.`);
        break;
      }

      case "image_repair": {
        job.logs.push("Executando motor de auto-reparo e verificação de imagens...");
        job.progress = 20;
        const repairRes = await dataQualityEngine.runDataAuditAndAutoRepair();
        job.progress = 90;
        job.logs.push(`Auto-reparo finalizado. Imagens recuperadas: ${repairRes.repairedImages}. Cartas auditadas: ${repairRes.totalAudited}.`);
        break;
      }

      case "backfill": {
        job.logs.push("Executando preenchimento retroativo de atributos ausentes...");
        const cards = await entityRepository.getAllCards();
        let fixed = 0;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          let updated = false;
          if (!c.tags || c.tags.length === 0) {
            c.tags = [c.collection_id || "Multiverse"];
            updated = true;
          }
          if (!c.skills || c.skills.length === 0) {
            c.skills = [{ name: "Ataque Básico", description: "Causa dano proporcional ao ATK.", type: "Active" }];
            updated = true;
          }
          if (updated) {
            await entityRepository.saveCard(c);
            fixed++;
          }
          job.progress = Math.floor(((i + 1) / cards.length) * 100);
        }
        job.logs.push(`Preenchimento finalizado. ${fixed} cartas foram atualizadas com atributos padrão.`);
        break;
      }

      default: {
        job.progress = 100;
        job.logs.push(`Processador para ${job.type} executado.`);
      }
    }
  }

  clearQueueAndHistory() {
    this.jobs = [];
    this.history = [];
    this.saveQueueToStorage();
  }
}

export const jobQueue = new JobQueue();
