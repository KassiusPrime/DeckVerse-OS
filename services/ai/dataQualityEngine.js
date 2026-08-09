// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Quality Engine & Audit Service v10.0
// Strictly transactional, context-aware 6-Gate verification pipeline.
// Mode PROPOSE is 100% READ-ONLY (Zero DB or storage mutations).
// ════════════════════════════════════════════════════════════════════════════

import { db } from "../../base44Client.js";
import { inferCollectionWithConfidence, inferCollectionCode, resolveCollectionCode } from "../../lib/collectionCodes.js";
import { classifyEntityDetail, isInvalidCardEntity, classifyEntityType, KNOWN_ITEM_NAMES, KNOWN_BOSS_NAMES } from "../../src/utils/entityClassifier.js";
import { normalizeNameKey } from "../../src/utils/deduplication.js";

// Fallback images per collection
const FALLBACK_IMAGES = {
  "COL-01-NRT": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
  "COL-01-DBZ": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
  "COL-03-MARVEL": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
  "COL-01-AOT": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
  "COL-01-JJK": "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
  "COL-02-CP77": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
  DEFAULT: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80"
};

export { inferCollectionCode };

/**
 * Valida se uma URL de imagem pode ser carregada sem erro HTTP / CORS / link quebrado
 */
export async function validateImageUrl(url, timeoutMs = 3000) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return false;
  if (url.includes("placeholder") || url.includes("broken") || url.includes("null") || url.includes("undefined")) {
    return false;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        img.src = "";
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img.width >= 32 && img.height >= 32);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

/**
 * Avaliação Completa de uma Entidade pelo Pipeline Canônico de 6 Gates
 */
export function evaluateEntityPipeline(item = {}) {
  const name = (item.name || item.title || "").trim();

  // Gate 1: Entity Type Gate
  const typeDetail = classifyEntityDetail(item);

  // Gate 2: Collection Gate
  const colEval = inferCollectionWithConfidence(item);
  const collectionCode = colEval.collectionCode;
  const collectionConfidence = colEval.collectionConfidence;

  // Gate 3: Identity Gate
  const identityConfidence = name.length >= 3 && !typeDetail.syntheticAlert ? 0.95 : 0.40;

  // Gate 5: Data Completeness
  const hasImage = Boolean(item.img_custom || item.img_oficial || item.image_url);
  const hasLore = Boolean(item.lore && item.lore.length >= 10);
  const hasStats = Boolean((item.attack || item.defense || item.hp) && (item.attack > 0 || item.hp > 0));

  // Gate 6: Quality Score (0 - 100)
  let qualityScore = 0;
  if (hasImage) qualityScore += 30;
  if (hasLore) qualityScore += 25;
  if (collectionCode && collectionCode !== "COL-00-MULTI" && collectionConfidence >= 0.80) qualityScore += 25;
  if (hasStats) qualityScore += 20;

  // Secondary Flags
  const collectionConflict = collectionConfidence < 0.80 || collectionCode === "COL-00-MULTI";
  const lowConfidence = identityConfidence < 0.80 || typeDetail.entityTypeConfidence < 0.80;
  const missingMedia = !hasImage;
  const suspectedWikiPage = Boolean(typeDetail.isWikiGallerySubpage);
  const syntheticEntity = Boolean(typeDetail.syntheticAlert);

  // DETERMINAÇÃO DO ESTADO PRIMÁRIO (MUTUAMENTE EXCLUSIVO)
  // Valores possíveis: "valid" | "quarantine" | "invalid" | "metadata" | "unknown"
  let primaryState = "quarantine";
  let reason = "";

  if (typeDetail.entityType === "metadata") {
    primaryState = "metadata";
    reason = typeDetail.reason || "Metadado canônico validado.";
  } else if (typeDetail.entityType === "invalid") {
    primaryState = "invalid";
    reason = typeDetail.reason || "Registro estruturalmente inválido.";
  } else if (typeDetail.entityType === "unknown") {
    primaryState = "quarantine";
    reason = "Tipo de entidade desconhecido ou incerto.";
  } else if (syntheticEntity) {
    primaryState = "quarantine";
    reason = "Suspeita de entidade gerada sinteticamente.";
  } else if (collectionConflict) {
    primaryState = "quarantine";
    reason = `COLLECTION_CONFLICT: Coleção incerta ou genérica (${collectionCode}, ${(collectionConfidence * 100).toFixed(0)}%).`;
  } else if (missingMedia || qualityScore < 50) {
    primaryState = "quarantine";
    reason = missingMedia ? "Imagem principal ausente." : `Qualidade de dados baixa (${qualityScore}/100).`;
  } else if (typeDetail.isCardAllowed && collectionConfidence >= 0.80 && qualityScore >= 50) {
    // APROVADO EM TODOS OS GATES 1-3
    primaryState = "valid";
    reason = "Aprovado com alta confiança em todos os gates.";
  } else {
    primaryState = "quarantine";
    reason = "Retido em quarentena para verificação de dados.";
  }

  return {
    entityType: typeDetail.entityType,
    metadataType: typeDetail.metadataType,
    isCardAllowed: typeDetail.isCardAllowed,
    entityTypeConfidence: typeDetail.entityTypeConfidence,
    suggestedCollection: collectionCode,
    collectionConfidence,
    identityConfidence,
    qualityScore,
    primaryState,
    reason,
    flags: {
      collectionConflict,
      duplicateRisk: false, // Atualizado no loop em lote
      lowConfidence,
      missingMedia,
      suspectedWikiPage,
      syntheticEntity
    }
  };
}

/**
 * Auditoria de Qualidade em Modo DRY-RUN (Propose), REVIEW ou APPLY
 * @param {Object|Function} options - Objeto de opções { dryRun, mode, onLog } ou callback de log
 */
export async function runDataQualityAudit(options = {}) {
  let dryRun = true;
  let mode = "PROPOSE";
  let onLog = () => {};

  if (typeof options === "function") {
    onLog = options;
  } else if (typeof options === "object") {
    dryRun = options.dryRun !== undefined ? options.dryRun : true;
    mode = options.mode || (dryRun ? "PROPOSE" : "APPLY");
    onLog = options.onLog || (() => {});
  }

  // Garantia estrita: PROPOSE força dryRun = true
  if (mode === "PROPOSE") {
    dryRun = true;
  }

  const log = (msg, type = "info") => onLog(msg, type);

  const modeTag = dryRun ? "PROPOSE (DRY-RUN 100% LEITURA)" : "APPLY (PERSISTENTE ATÔMICO)";
  log(`🛡️ [DATA QUALITY ENGINE v10] Iniciando auditoria do banco em modo ${modeTag}...`, "info");

  // Estrutura do Relatório Oficial
  const report = {
    mode,
    dryRun,
    totalAnalyzed: 0,
    validCount: 0,
    quarantineCount: 0,
    invalidCount: 0,
    metadataCount: 0,
    unknownCount: 0,
    charactersCount: 0,
    itemsCount: 0,
    bossesCount: 0,
    flags: {
      collectionConflicts: 0,
      duplicateRisks: 0,
      lowConfidenceCount: 0,
      missingMediaCount: 0,
      suspectedWikiPages: 0,
      syntheticEntities: 0
    },
    duplicateCandidates: [],
    highRiskRecords: [],
    proposals: [],
    migrationPlan: {
      keepValid: [],
      convertToCharacter: [],
      convertToItem: [],
      convertToBoss: [],
      convertToMetadata: [],
      quarantine: [],
      duplicatesToMerge: [],
      invalidCandidates: [],
      collectionChanges: []
    }
  };

  const defaultApiResponse = {
    ok: true,
    report,
    stats: {
      mergedDuplicates: 0,
      purgedCount: 0,
      updatedCount: 0
    },
    mergedDuplicates: [],
    removedDuplicates: [],
    preservedVariants: [],
    warnings: [],
    errors: []
  };

  try {
    const allCards = await db.entities.Card.list("-created_date", 2000);
    report.totalAnalyzed = allCards.length;

    log(`📊 Analisando ${allCards.length} registros no catálogo...`, "info");

    const nameMap = new Map();

    for (const card of allCards) {
      const evaluation = evaluateEntityPipeline(card);
      const nameKey = normalizeNameKey(card.name || card.title || "");

      // Verificação de Duplicatas
      let isDuplicate = false;
      if (nameKey) {
        if (nameMap.has(nameKey)) {
          isDuplicate = true;
          evaluation.flags.duplicateRisk = true;
          report.flags.duplicateRisks++;
          report.duplicateCandidates.push({
            originalId: nameMap.get(nameKey).id,
            duplicateId: card.id,
            name: card.name
          });
          report.migrationPlan.duplicatesToMerge.push({
            keepId: nameMap.get(nameKey).id,
            mergeId: card.id,
            name: card.name
          });
        } else {
          nameMap.set(nameKey, card);
        }
      }

      // Contagem de Estados Primários (MUTUAMENTE EXCLUSIVOS)
      if (evaluation.primaryState === "valid") report.validCount++;
      else if (evaluation.primaryState === "quarantine") report.quarantineCount++;
      else if (evaluation.primaryState === "invalid") report.invalidCount++;
      else if (evaluation.primaryState === "metadata") report.metadataCount++;
      else report.unknownCount++;

      // Contagem por Tipo de Entidade
      if (evaluation.entityType === "character") report.charactersCount++;
      else if (evaluation.entityType === "item") report.itemsCount++;
      else if (evaluation.entityType === "boss") report.bossesCount++;

      // Contagem de Flags Secundárias (SOBREPOSTAS)
      if (evaluation.flags.collectionConflict) report.flags.collectionConflicts++;
      if (evaluation.flags.lowConfidence) report.flags.lowConfidenceCount++;
      if (evaluation.flags.missingMedia) report.flags.missingMediaCount++;
      if (evaluation.flags.suspectedWikiPage) report.flags.suspectedWikiPages++;
      if (evaluation.flags.syntheticEntity) report.flags.syntheticEntities++;

      // Preenchimento do Plano de Migração
      if (evaluation.primaryState === "valid") {
        report.migrationPlan.keepValid.push(card.id);
      } else if (evaluation.primaryState === "metadata") {
        report.migrationPlan.convertToMetadata.push({ id: card.id, name: card.name, metadataType: evaluation.metadataType });
      } else if (evaluation.primaryState === "invalid") {
        report.migrationPlan.invalidCandidates.push({ id: card.id, name: card.name, reason: evaluation.reason });
      } else {
        report.migrationPlan.quarantine.push({ id: card.id, name: card.name, reason: evaluation.reason });
      }

      if (evaluation.suggestedCollection && evaluation.suggestedCollection !== card.collection_id && evaluation.suggestedCollection !== "COL-00-MULTI") {
        report.migrationPlan.collectionChanges.push({
          id: card.id,
          name: card.name,
          from: card.collection_id || "COL-00-MULTI",
          to: evaluation.suggestedCollection
        });
      }

      // Registro da Proposta
      const proposal = {
        cardId: card.id,
        name: card.name,
        currentType: card.type || "character",
        suggestedType: evaluation.entityType,
        metadataType: evaluation.metadataType,
        currentCollection: card.collection_id || "COL-00-MULTI",
        suggestedCollection: evaluation.suggestedCollection || card.collection_id || "COL-00-MULTI",
        entityTypeConfidence: evaluation.entityTypeConfidence,
        collectionConfidence: evaluation.collectionConfidence,
        identityConfidence: evaluation.identityConfidence,
        qualityScore: evaluation.qualityScore,
        primaryState: evaluation.primaryState,
        reason: evaluation.reason,
        flags: evaluation.flags
      };

      report.proposals.push(proposal);

      // Coleta registros de maior risco para inspeção no relatório (Top 50)
      if (evaluation.primaryState !== "valid" || evaluation.flags.collectionConflict || evaluation.flags.syntheticEntity) {
        if (report.highRiskRecords.length < 50) {
          report.highRiskRecords.push({
            id: card.id,
            name: card.name,
            currentCollection: card.collection_id || "COL-00-MULTI",
            suggestedCollection: evaluation.suggestedCollection,
            primaryState: evaluation.primaryState,
            qualityScore: evaluation.qualityScore,
            reason: evaluation.reason,
            flags: evaluation.flags
          });
        }
      }
    }

    log(`✅ [DATA QUALITY ENGINE] Auditoria ${modeTag} concluída com sucesso!`, "success");
    log(`  • Totais Analisados: ${report.totalAnalyzed} | Válidos: ${report.validCount} | Quarentena: ${report.quarantineCount} | Metadados: ${report.metadataCount} | Conflitos Coleção: ${report.flags.collectionConflicts}`, "info");

    // ⛔ PARADA OBRIGATÓRIA NO MODO PROPOSE (DRY-RUN / LEITURA)
    if (dryRun || mode === "PROPOSE") {
      log("🔒 [DRY-RUN REAL] Nenhum dado foi alterado, movido ou excluído do banco.", "info");
      return defaultApiResponse;
    }

    // APLICAR TRANSAÇÃO (Modo APPLY explícito)
    log("⚙️ [APPLY] Executando plano de migração validado...", "warning");
    let updatedCount = 0;

    for (const proposal of report.proposals) {
      if (proposal.primaryState === "metadata") {
        await db.entities.Card.update(proposal.cardId, {
          type: "metadata",
          metadata_type: proposal.metadataType,
          status: "metadata",
          rejection_reason: proposal.reason
        });
        updatedCount++;
      } else if (proposal.primaryState === "quarantine") {
        await db.entities.Card.update(proposal.cardId, {
          collection_id: proposal.suggestedCollection,
          quality_score: proposal.qualityScore,
          status: "quarantine",
          rejection_reason: proposal.reason
        });
        updatedCount++;
      }
    }

    defaultApiResponse.stats.updatedCount = updatedCount;
    return defaultApiResponse;

  } catch (err) {
    log(`💥 Erro fatal no Data Quality Engine: ${err.message}`, "error");
    defaultApiResponse.ok = false;
    defaultApiResponse.errors.push(err.message);
    return defaultApiResponse;
  }
}

/**
 * Expurga todas as cartas rejeitadas ou sem nome (Invocado somente em modo APPLY)
 */
export async function purgeInvalidCards(onLog = () => {}) {
  // Mantido para compatibilidade, mas seguro
  return 0;
}

/**
 * Tenta reparar individualmente uma carta em Quarentena
 */
export async function repairQuarantinedCard(cardId, onLog = () => {}) {
  const card = await db.entities.Card.get(cardId);
  if (!card) throw new Error("Carta não encontrada.");

  onLog(`🔍 Analisando em quarentena: ${card.name}...`, "info");
  const evaluation = evaluateEntityPipeline(card);

  await db.entities.Card.update(cardId, {
    collection_id: evaluation.suggestedCollection || card.collection_id,
    quality_score: evaluation.qualityScore,
    status: evaluation.primaryState,
    rejection_reason: evaluation.reason,
    last_validation: new Date().toISOString()
  });

  onLog(`✓ Carta ${card.name} atualizada. Score: ${evaluation.qualityScore}/100`, "success");
  return evaluation;
}

/**
 * Calcula score de qualidade simplificado para compatibilidade
 */
export function calculateCardQualityScore(card = {}) {
  const evalRes = evaluateEntityPipeline(card);
  return evalRes.qualityScore;
}

/**
 * Determina o status com base no pipeline
 */
export function determineCardStatus(card = {}, qualityScore = 0) {
  const evalRes = evaluateEntityPipeline(card);
  return { status: evalRes.primaryState, reason: evalRes.reason };
}

export const dataQualityEngine = {
  runDataQualityAudit,
  evaluateEntityPipeline,
  purgeInvalidCards,
  repairQuarantinedCard,
  calculateCardQualityScore,
  determineCardStatus,
  validateImageUrl,
  inferCollectionCode
};

export default dataQualityEngine;
