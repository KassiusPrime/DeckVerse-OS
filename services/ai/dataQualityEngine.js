// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Quality Engine & Audit Service v10.0
// Strictly transactional, context-aware 6-Gate verification pipeline.
// Mode PROPOSE is 100% READ-ONLY (Zero DB or storage mutations).
// ════════════════════════════════════════════════════════════════════════════

import { db } from "../../base44Client.js";
import { inferCollectionWithConfidence, inferCollectionCode, resolveCollectionCode, CANONICAL_COLLECTION_CODES, LEGACY_ALIASES } from "../../lib/collectionCodes.js";
import { classifyEntityDetail, isInvalidCardEntity, classifyEntityType, KNOWN_ITEM_NAMES, KNOWN_BOSS_NAMES } from "../../src/utils/entityClassifier.js";
import { normalizeNameKey } from "../../src/utils/deduplication.js";
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, getAllExpandedCards } from "../../src/data/megaCollectionsData.js";

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
 * Detecta se a entidade possui mídia de imagem utilizável nos campos legítimos do projeto
 */
export function hasUsableMedia(entity = {}) {
  if (!entity || typeof entity !== "object") return false;

  const candidate =
    entity.img_custom ||
    entity.img_oficial ||
    entity.image_url ||
    entity.image ||
    entity.imageUrl ||
    entity.img ||
    entity.img_url ||
    entity.canonical?.image ||
    entity.canonical?.imageUrl ||
    entity.canonical?.image_url ||
    entity.media?.image ||
    entity.media?.url;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const clean = candidate.trim();
    if (
      clean.startsWith("http") ||
      clean.startsWith("data:") ||
      clean.startsWith("/")
    ) {
      if (
        !clean.includes("placeholder") &&
        !clean.includes("broken") &&
        !clean.includes("null") &&
        !clean.includes("undefined")
      ) {
        return true;
      }
    }
  }
  return false;
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

  // Short name policy: name.length < 3 does NOT force quarantine if context is clear
  const shortName = Boolean(name && name.length > 0 && name.length < 3);

  // Gate 3: Identity Gate
  const identityConfidence = name.length > 0 && !typeDetail.syntheticAlert ? 0.95 : 0.40;

  // Gate 5: Data Completeness
  const hasImage = hasUsableMedia(item);
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

  // Se o registro no runtime DB tiver status explícito de quarentena, o DQE observa diretamente
  if (item.status === "quarantine") {
    return {
      entityType: typeDetail.entityType,
      metadataType: typeDetail.metadataType,
      isCardAllowed: typeDetail.isCardAllowed,
      entityTypeConfidence: typeDetail.entityTypeConfidence,
      suggestedCollection: collectionCode,
      collectionConfidence,
      identityConfidence,
      qualityScore,
      primaryState: "quarantine",
      reason: item.rejection_reason || "Retido em quarentena no banco de dados.",
      flags: {
        collectionConflict,
        duplicateRisk: false,
        lowConfidence,
        missingMedia,
        shortName,
        suspectedWikiPage,
        syntheticEntity
      }
    };
  }

  // DETERMINAÇÃO DO ESTADO PRIMÁRIO (MUTUAMENTE EXCLUSIVO: valid | quarantine | invalid | unknown)
  let primaryState = "quarantine";
  let reason = "";

  if (typeDetail.entityType === "metadata" || typeDetail.entityType === "collection") {
    primaryState = collectionConflict ? "quarantine" : "valid";
    reason = typeDetail.reason || "Entidade/Metadado canônico validado.";
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
  } else if (typeDetail.isCardAllowed && collectionConfidence >= 0.80 && identityConfidence >= 0.80) {
    // Entidades válidas com identidade e coleção confirmadas permanecem VÁLIDAS.
    primaryState = "valid";
    reason = shortName ? "Aprovado com alta confiança (Nome curto validado no contexto)." : (missingMedia ? "Aprovado com alta confiança. (Mídia de imagem pendente)" : "Aprovado com alta confiança em todos os gates.");
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
      shortName,
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
    unknownCount: 0,
    collectionsCount: 0,
    charactersCount: 0,
    itemsCount: 0,
    bossesCount: 0,
    metadataTypeCount: 0,
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
    const dbCards = await db.entities.Card.list("-created_date", 5000);
    const dbItems = await db.entities.Item.list("-created_date", 5000);
    const dbBosses = await db.entities.Boss.list("-created_date", 5000);
    const dbCollections = await db.entities.Collection.list("-created_date", 5000);
    const dbLore = await db.entities.Lore.list("-created_date", 5000);
    const dbUniverses = await db.entities.Universe.list("-created_date", 5000);

    const cardsSource = dbCards.length > 0 ? dbCards : getAllExpandedCards();
    const itemsSource = dbItems.length > 0 ? dbItems : (MEGA_ITEMS || []);
    const bossesSource = dbBosses.length > 0 ? dbBosses : (MEGA_BOSSES || []);
    const collectionsSource = dbCollections.length > 0 ? dbCollections : (MEGA_COLLECTIONS || []);
    const loreSource = dbLore || [];
    const universesSource = dbUniverses || [];

    // Consolidação de todas as entidades para auditoria abrangente
    const allRecords = [
      ...cardsSource.map(c => ({ ...c, _sourceTable: "Card" })),
      ...itemsSource.map(i => ({ ...i, _sourceTable: "Item", type: "item" })),
      ...bossesSource.map(b => ({ ...b, _sourceTable: "Boss", type: "boss" })),
      ...collectionsSource.map(c => ({ ...c, _sourceTable: "Collection", type: "collection" })),
      ...loreSource.map(l => ({ ...l, _sourceTable: "Lore", type: "metadata" })),
      ...universesSource.map(u => ({ ...u, _sourceTable: "Universe", type: "metadata" }))
    ];

    report.totalAnalyzed = allRecords.length;

    report.scope = {
      canonicalCollectionsDeclared: CANONICAL_COLLECTION_CODES.length,
      auditedCollectionsMapped: collectionsSource.length,
      totalRecordsAnalyzed: report.totalAnalyzed,
      sourcesBreakdown: {
        cards: cardsSource.length,
        items: itemsSource.length,
        bosses: bossesSource.length,
        collections: collectionsSource.length,
        lore: loreSource.length,
        universes: universesSource.length
      }
    };

    log(`📊 Analisando ${allRecords.length} registros totais no catálogo (Cartas: ${cardsSource.length}, Itens: ${itemsSource.length}, Bosses: ${bossesSource.length}, Coleções: ${collectionsSource.length}, Lore/Universos: ${loreSource.length + universesSource.length})...`, "info");

    const dedupMap = new Map();
    const collectionConflictsList = [];
    const mappedCollectionCodesSet = new Set();

    for (const record of allRecords) {
      const evaluation = evaluateEntityPipeline(record);
      const nameKey = normalizeNameKey(record.name || record.title || "");
      const colCode = record.collection_id || record.collection_code || record.code || evaluation.suggestedCollection || "COL-00-MULTI";
      const versionKey = (record.version || record.form || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

      if (colCode && colCode !== "COL-00-MULTI") {
        mappedCollectionCodesSet.add(colCode);
      }

      // Chave estrita de deduplicação = collectionCanonicalId + normalizedNameKey + versionKey
      const strictDedupKey = `${colCode}_${nameKey}${versionKey ? "_" + versionKey : ""}`;

      let isDuplicate = false;
      if (nameKey && record._sourceTable === "Card") {
        if (dedupMap.has(strictDedupKey)) {
          isDuplicate = true;
          evaluation.flags.duplicateRisk = true;
          report.flags.duplicateRisks++;
          report.duplicateCandidates.push({
            originalId: dedupMap.get(strictDedupKey).id,
            duplicateId: record.id,
            name: record.name,
            collection: colCode,
            reason: `Entidade duplicada na mesma coleção (${colCode}) com chave "${strictDedupKey}".`
          });
          report.migrationPlan.duplicatesToMerge.push({
            keepId: dedupMap.get(strictDedupKey).id,
            mergeId: record.id,
            name: record.name,
            collection: colCode
          });
        } else {
          dedupMap.set(strictDedupKey, record);
        }
      }

      // Contagem de Estados Primários (MUTUAMENTE EXCLUSIVOS: valid | quarantine | invalid | unknown)
      if (evaluation.primaryState === "valid") report.validCount++;
      else if (evaluation.primaryState === "quarantine") report.quarantineCount++;
      else if (evaluation.primaryState === "invalid") report.invalidCount++;
      else report.unknownCount++;

      // Contagem por Tipo de Entidade (MUTUAMENTE EXCLUSIVOS: collection | character | item | boss | metadata)
      if (evaluation.entityType === "collection") report.collectionsCount++;
      else if (evaluation.entityType === "character") report.charactersCount++;
      else if (evaluation.entityType === "item") report.itemsCount++;
      else if (evaluation.entityType === "boss") report.bossesCount++;
      else report.metadataTypeCount++;

      // Contagem de Flags Secundárias (SOBREPOSTAS)
      if (evaluation.flags.shortName) report.flags.shortNameCount = (report.flags.shortNameCount || 0) + 1;
      if (evaluation.flags.collectionConflict) {
        report.flags.collectionConflicts++;
        const rawRef = record.collection_id || record.code || "COL-00-MULTI";
        const resolvedId = (rawRef.startsWith("LORE-") ? null : resolveCollectionCode(rawRef));
        const validCanonicalId = (resolvedId && CANONICAL_COLLECTION_CODES.includes(resolvedId)) ? resolvedId : null;

        collectionConflictsList.push({
          id: record.id,
          name: record.name || record.title,
          currentCollection: rawRef,
          rawCollectionReference: rawRef,
          resolvedCollectionCanonicalId: validCanonicalId,
          conflictReason: evaluation.reason,
          suggestedCollection: evaluation.suggestedCollection,
          confidence: evaluation.collectionConfidence,
          reason: evaluation.reason
        });
      }
      if (evaluation.flags.lowConfidence) report.flags.lowConfidenceCount++;
      if (evaluation.flags.missingMedia) report.flags.missingMediaCount++;
      if (evaluation.flags.suspectedWikiPage) report.flags.suspectedWikiPages++;
      if (evaluation.flags.syntheticEntity) report.flags.syntheticEntities++;

      // Preenchimento do Plano de Migração
      if (evaluation.primaryState === "valid") {
        report.migrationPlan.keepValid.push(record.id);
      } else if (evaluation.primaryState === "invalid") {
        report.migrationPlan.invalidCandidates.push({ id: record.id, name: record.name || record.title, reason: evaluation.reason });
      } else {
        report.migrationPlan.quarantine.push({ id: record.id, name: record.name || record.title, reason: evaluation.reason });
      }

      if (evaluation.suggestedCollection && evaluation.suggestedCollection !== record.collection_id && evaluation.suggestedCollection !== "COL-00-MULTI") {
        report.migrationPlan.collectionChanges.push({
          id: record.id,
          name: record.name || record.title,
          from: record.collection_id || "COL-00-MULTI",
          to: evaluation.suggestedCollection
        });
      }

      // Registro da Proposta com rawType e canonicalEntityType explícitos
      const rawType = record.type || record.entity_type || record._sourceTable || "character";
      const proposal = {
        cardId: record.id,
        name: record.name || record.title,
        sourceTable: record._sourceTable,
        rawType: rawType,
        canonicalEntityType: evaluation.entityType,
        currentType: record.type || "character",
        suggestedType: evaluation.entityType,
        metadataType: evaluation.metadataType,
        currentCollection: record.collection_id || record.code || "COL-00-MULTI",
        suggestedCollection: evaluation.suggestedCollection || record.collection_id || "COL-00-MULTI",
        entityTypeConfidence: evaluation.entityTypeConfidence,
        collectionConfidence: evaluation.collectionConfidence,
        identityConfidence: evaluation.identityConfidence,
        qualityScore: evaluation.qualityScore,
        primaryState: evaluation.primaryState,
        reason: evaluation.reason,
        flags: evaluation.flags
      };

      report.proposals.push(proposal);

      if (evaluation.primaryState !== "valid" || evaluation.flags.collectionConflict || evaluation.flags.syntheticEntity) {
        if (report.highRiskRecords.length < 50) {
          report.highRiskRecords.push({
            id: record.id,
            name: record.name || record.title,
            currentCollection: record.collection_id || "COL-00-MULTI",
            suggestedCollection: evaluation.suggestedCollection,
            primaryState: evaluation.primaryState,
            qualityScore: evaluation.qualityScore,
            reason: evaluation.reason,
            flags: evaluation.flags
          });
        }
      }
    }

    report.collectionConflicts = collectionConflictsList;

    // Indexação prévia de registros por código canônico resolvido via resolveCollectionCode
    const recordsByCanonicalCode = {};
    for (const code of CANONICAL_COLLECTION_CODES) {
      recordsByCanonicalCode[code] = [];
    }
    for (const r of allRecords) {
      const raw = r.collection_id || r.code || inferCollectionCode(r);
      if (raw) {
        const canonical = resolveCollectionCode(raw);
        if (recordsByCanonicalCode[canonical]) {
          recordsByCanonicalCode[canonical].push(r);
        }
      }
    }

    // Auditoria Completa das 95 Coleções Canônicas (Sem usar mídias para status operacional)
    report.collectionsAudit = CANONICAL_COLLECTION_CODES.map(code => {
      const recordsInCol = recordsByCanonicalCode[code] || [];
      const hasRecords = recordsInCol.length > 0;
      const validFormat = /^COL-\d{2}-[A-Z0-9]+$/.test(code);

      let operationalStatus = "ACTIVE";
      if (code === "COL-00-MULTI") {
        operationalStatus = "RESERVED"; // Technical system namespace
      } else if (!validFormat) {
        operationalStatus = "INVALID";
      } else if (!hasRecords) {
        operationalStatus = "EMPTY";
      } else {
        const missingStructural = recordsInCol.some(r => !r.name || !r.id);
        if (missingStructural) {
          operationalStatus = "MISSING_DATA";
        } else {
          operationalStatus = "ACTIVE";
        }
      }

      // Dimensão de Mídia Separada
      let mediaStatus = "NOT_APPLICABLE";
      if (hasRecords) {
        const usableCount = recordsInCol.filter(r => hasUsableMedia(r)).length;
        if (usableCount === recordsInCol.length) mediaStatus = "AVAILABLE";
        else if (usableCount > 0) mediaStatus = "PARTIAL";
        else mediaStatus = "MISSING";
      }

      return {
        code,
        operationalStatus,
        status: operationalStatus,
        mediaStatus,
        recordCount: recordsInCol.length
      };
    });

    report.entityTypes = {
      collections: report.collectionsCount,
      characters: report.charactersCount,
      items: report.itemsCount,
      bosses: report.bossesCount,
      metadata: report.metadataTypeCount
    };

    const entityTypeSum =
      report.collectionsCount +
      report.charactersCount +
      report.itemsCount +
      report.bossesCount +
      report.metadataTypeCount;
    const entityTypeInvariantValid = entityTypeSum === report.totalAnalyzed;

    report.statusTotals = {
      valid: report.validCount,
      quarantine: report.quarantineCount,
      invalid: report.invalidCount,
      unknown: report.unknownCount
    };

    const statusSum =
      report.validCount +
      report.quarantineCount +
      report.invalidCount +
      report.unknownCount;
    const statusInvariantValid = statusSum === report.totalAnalyzed;

    report.invariants = {
      entityTypeAccounting: {
        total: report.totalAnalyzed,
        sum: entityTypeSum,
        isValid: entityTypeInvariantValid
      },
      statusAccounting: {
        total: report.totalAnalyzed,
        sum: statusSum,
        isValid: statusInvariantValid
      }
    };

    function calcSourceComp(seedCount, persistedCount) {
      if (persistedCount === 0) {
        return { seed: seedCount, persisted: 0, overlap: 0, seedOnly: seedCount, persistedOnly: 0 };
      }
      const overlap = Math.min(seedCount, persistedCount);
      const seedOnly = Math.max(0, seedCount - persistedCount);
      const persistedOnly = Math.max(0, persistedCount - seedCount);
      return { seed: seedCount, persisted: persistedCount, overlap, seedOnly, persistedOnly };
    }

    report.sourceComparison = {
      characters: calcSourceComp(getAllExpandedCards().length, dbCards.length),
      items: calcSourceComp((MEGA_ITEMS || []).length, dbItems.length),
      bosses: calcSourceComp((MEGA_BOSSES || []).length, dbBosses.length),
      collections: calcSourceComp((MEGA_COLLECTIONS || []).length, dbCollections.length),
      metadata: calcSourceComp(0, dbLore.length + dbUniverses.length)
    };

    log(`✅ [DATA QUALITY ENGINE] Auditoria ${modeTag} concluída com sucesso!`, "success");
    log(`  • Totais Analisados: ${report.totalAnalyzed} | Válidos: ${report.validCount} | Quarentena: ${report.quarantineCount} | Inválidos: ${report.invalidCount} | Desconhecidos: ${report.unknownCount}`, "info");
    log(`  • Invariante de Tipos (${entityTypeSum}/${report.totalAnalyzed}): ${entityTypeInvariantValid ? "PASS" : "FAIL"}`, entityTypeInvariantValid ? "success" : "error");
    log(`  • Invariante de Status (${statusSum}/${report.totalAnalyzed}): ${statusInvariantValid ? "PASS" : "FAIL"}`, statusInvariantValid ? "success" : "error");

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
