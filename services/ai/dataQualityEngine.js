// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Quality Engine & Audit Service
// Maintains 0-100 Quality Score, Status (valid/quarantine/rejected), Image Validation & Auto-Repair Pipeline
// ════════════════════════════════════════════════════════════════════════════

import { db } from "@/base44Client";
import { validateCollection, validateCard, normalizeCode } from "@/lib/importSchemas";
import { normalizeNameKey, deduplicateCollections } from "@/src/utils/deduplication";
import { fandomClient } from "../fandom/fandomClient";
import { enrichmentService } from "./enrichmentService";

// Fallback images per collection if primary image fails
const FALLBACK_IMAGES = {
  NAR: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
  DBZ: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
  MVC: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
  AOT: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
  JJK: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
  CYB: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
  DEFAULT: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80"
};

/**
 * Infere o código da coleção correta a partir do universo/série/propriedades da carta
 */
export function inferCollectionCode(card = {}) {
  if (card.collection_id && card.collection_id !== "MULTIVERSE" && card.collection_id !== "GENERIC") {
    return normalizeCode(card.collection_id);
  }
  const univ = (card.universe || card.series || card.franchise || card.collection || "").toLowerCase();
  if (univ.includes("naruto") || univ.includes("boruto")) return "NAR";
  if (univ.includes("dragon") || univ.includes("ball") || univ.includes("dbz")) return "DBZ";
  if (univ.includes("attack") || univ.includes("titan") || univ.includes("aot") || univ.includes("shingeki")) return "AOT";
  if (univ.includes("jujutsu") || univ.includes("jjk") || univ.includes("kaisen")) return "JJK";
  if (univ.includes("cyberpunk") || univ.includes("cyb") || univ.includes("edgerunners")) return "CYB";
  if (univ.includes("marvel") || univ.includes("capcom") || univ.includes("mvc")) return "MVC";
  if (univ.includes("one piece") || univ.includes("opc") || univ.includes("luffy")) return "OPC";
  if (univ.includes("bleach") || univ.includes("blc") || univ.includes("ichigo")) return "BLC";
  if (univ.includes("hunter") || univ.includes("hxh") || univ.includes("gon")) return "HXH";
  if (univ.includes("solo leveling") || univ.includes("slv") || univ.includes("sung")) return "SLV";
  if (univ.includes("jojo") || univ.includes("jjba") || univ.includes("bizarre")) return "JJBA";
  if (univ.includes("berserk") || univ.includes("bsk") || univ.includes("guts")) return "BSK";
  return card.collection_id || "MULTIVERSE";
}

/**
 * Valida se uma URL de imagem pode ser carregada sem erro HTTP / CORS / link quebrado
 */
export async function validateImageUrl(url, timeoutMs = 4000) {
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
        // Garante resolução mínima
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
 * Calcula o Índice de Qualidade (0 a 100) de uma carta
 */
export function calculateCardQualityScore(card = {}) {
  let score = 0;

  // 1. Imagem válida (20 pts)
  const hasImage = Boolean(card.img_custom || card.img_oficial || card.image_url);
  if (hasImage) score += 20;

  // 2. Lore Canônica existente (15 pts)
  if (card.lore && card.lore.length >= 30) score += 15;
  else if (card.lore) score += 7;

  // 3. Descrição / Versão (10 pts)
  if (card.version) score += 10;

  // 4. Coleção Válida (15 pts)
  if (card.collection_id && card.collection_id !== "MULTIVERSE") score += 15;
  else if (card.collection_id) score += 8;

  // 5. Universo Válido (10 pts)
  if (card.universe) score += 10;
  else score += 5;

  // 6. Poderes / Habilidades (10 pts)
  if (Array.isArray(card.skills) && card.skills.length >= 2) score += 10;
  else if (Array.isArray(card.skills) && card.skills.length > 0) score += 5;

  // 7. Tags / Arquétipos (10 pts)
  if (Array.isArray(card.tags) && card.tags.length >= 1) score += 10;

  // 8. Atributos Completos (10 pts)
  if (card.attack && card.defense && card.hp && card.speed && card.mag) score += 10;

  return Math.min(100, score);
}

/**
 * Determina o status ('valid' | 'quarantine' | 'rejected') com base no score e requisitos mínimos
 */
export function determineCardStatus(card = {}, qualityScore = 0) {
  if (!card.name || !card.name.trim()) {
    return { status: "rejected", reason: "Nome do personagem ausente." };
  }

  const hasAnyImg = Boolean(card.img_custom || card.img_oficial || card.image_url);
  if (!hasAnyImg) {
    return { status: "quarantine", reason: "Imagem ausente ou inacessível." };
  }

  if (qualityScore < 50) {
    return { status: "quarantine", reason: `Pontuação de qualidade muito baixa (${qualityScore}/100).` };
  }

  return { status: "valid", reason: "Aprovado pelos critérios de qualidade canônica." };
}

/**
 * Pipeline Completo de Qualidade dos Dados (Descobrir -> Validar -> Corrigir -> Enriquecer -> Mesclar -> Salvar)
 */
export async function runDataQualityAudit(onLog = () => {}) {
  const log = (msg, type = "info") => onLog(msg, type);

  log("🛡️ [DATA QUALITY ENGINE] Iniciando auditoria completa do banco de dados...", "info");

  const stats = {
    totalCards: 0,
    validCards: 0,
    quarantinedCards: 0,
    rejectedCards: 0,
    repairedImages: 0,
    mergedDuplicates: 0,
    auditDate: new Date().toISOString()
  };

  try {
    const allCards = await db.entities.Card.list("-created_date", 2000);
    stats.totalCards = allCards.length;

    log(`📊 Processando ${allCards.length} cartas registradas...`, "info");

    const canonicalMap = new Map();
    const duplicatesToDelete = [];

    // Passo 1: Auditoria e Deduplicação Inteligente (Multi-Idioma)
    for (const card of allCards) {
      const nameKey = normalizeNameKey(card.name || card.title || "");
      const key = nameKey ? `card_${nameKey}` : `card_${card.id}`;

      const score = calculateCardQualityScore(card);

      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, { ...card, _score: score });
      } else {
        const existing = canonicalMap.get(key);
        // Se a atual for superior, substitui e mescla
        if (score > existing._score) {
          duplicatesToDelete.push(existing.id);
          canonicalMap.set(key, {
            ...card,
            _score: score,
            img_custom: card.img_custom || existing.img_custom || "",
            lore: card.lore || existing.lore || "",
            skills: (card.skills && card.skills.length > 0) ? card.skills : (existing.skills || [])
          });
        } else {
          duplicatesToDelete.push(card.id);
          // Preserva imagem customizada se existia na carta excluída
          if (card.img_custom && !existing.img_custom) {
            existing.img_custom = card.img_custom;
          }
        }
      }
    }

    // Exclui duplicatas limpas
    for (const dupId of duplicatesToDelete) {
      await db.entities.Card.delete(dupId);
      stats.mergedDuplicates++;
    }
    if (duplicatesToDelete.length > 0) {
      log(`✓ ${duplicatesToDelete.length} cartas duplicadas mescladas e removidas.`, "success");
    }

    // Passo 2: Validação de Imagem, Quarentena e Sanitização dos Registros Únicos
    const uniqueCards = Array.from(canonicalMap.values());

    for (const card of uniqueCards) {
      let isChanged = false;
      const updates = {};

      // 1. Validação de Imagem
      let primaryImage = card.img_custom || card.img_oficial || card.image_url || "";
      let isImgOk = await validateImageUrl(primaryImage, 2500);

      if (!isImgOk) {
        // Tenta buscar imagem oficial na Fandom Wiki se não houver custom
        if (!card.img_custom) {
          const wikiSlug = fandomClient.resolveWikiSlug(card.collection_id || "NAR");
          try {
            const wikiImg = await fandomClient.fetchPageImages(card.name, wikiSlug);
            if (wikiImg && (await validateImageUrl(wikiImg, 2500))) {
              updates.img_oficial = wikiImg;
              updates.image_url = wikiImg;
              primaryImage = wikiImg;
              isImgOk = true;
              stats.repairedImages++;
              isChanged = true;
              log(`  🖼️ Imagem de ${card.name} recuperada via Fandom Wiki (${wikiSlug}).`, "success");
            }
          } catch (e) {
            // Segue para fallback
          }
        }

        // Se ainda falhar, aplica fallback por franquia
        if (!isImgOk) {
          const colCode = normalizeCode(card.collection_id || "DEFAULT");
          const fallbackImg = FALLBACK_IMAGES[colCode] || FALLBACK_IMAGES.DEFAULT;
          updates.image_url = fallbackImg;
          updates.img_oficial = fallbackImg;
          primaryImage = fallbackImg;
          stats.repairedImages++;
          isChanged = true;
          log(`  ⚠️ Imagem quebrada em ${card.name} substituída por imagem de segurança.`, "warning");
        }
      }

      // 2. Recalcula Score e Status de Qualidade
      const collectionCode = inferCollectionCode(card);
      const cardEvaluated = { ...card, ...updates, collection_id: collectionCode, image_url: primaryImage };
      const qualityScore = calculateCardQualityScore(cardEvaluated);
      const statusEval = determineCardStatus(cardEvaluated, qualityScore);

      updates.collection_id = collectionCode;
      updates.quality_score = qualityScore;

      // Regra Canônica: Se a carta for VÁLIDA -> Vai para a sua Coleção e vira carta ativa
      // Se for INVÁLIDA (rejeitada/corrompida/sem nome) -> É expurgada (deletada)
      if (statusEval.status === "valid" || qualityScore >= 50) {
        updates.status = "valid";
        updates.rejection_reason = "";
        updates.last_validation = new Date().toISOString();
        updates.last_sync = card.last_sync || new Date().toISOString();
        updates.data_source = card.data_source || "Fandom + Gemini IA (DataQualityEngine)";
        stats.validCards++;

        await db.entities.Card.update(card.id, updates);
        log(`  ✨ Carta "${card.name}" validada e direcionada para a coleção [${collectionCode}].`, "success");
      } else if (statusEval.status === "rejected" || !card.name || !card.name.trim()) {
        // Expulsa e purga do sistema
        await db.entities.Card.delete(card.id);
        stats.rejectedCards++;
        log(`  🗑️ Carta inválida "${card.name || card.id}" foi purgada com sucesso.`, "warning");
      } else {
        // Caso limiar (Quarentena com chance de reparo)
        updates.status = "quarantine";
        updates.rejection_reason = statusEval.reason;
        updates.last_validation = new Date().toISOString();
        stats.quarantinedCards++;

        await db.entities.Card.update(card.id, updates);
      }
    }

    log(`✅ [DATA QUALITY ENGINE] Auditoria concluída! Válidas nas coleções: ${stats.validCards} | Quarentena: ${stats.quarantinedCards} | Purgadas: ${stats.rejectedCards}`, "success");
    return { ok: true, stats };
  } catch (err) {
    log(`💥 Erro fatal no Data Quality Engine: ${err.message}`, "error");
    throw err;
  }
}

/**
 * Expurga todas as cartas rejeitadas ou sem nome do banco de dados
 */
export async function purgeInvalidCards(onLog = () => {}) {
  const allCards = await db.entities.Card.list("-created_date", 2000);
  let purgedCount = 0;

  for (const card of allCards) {
    const isInvalid = !card.name || !card.name.trim() || card.status === "rejected" || (card.quality_score && card.quality_score < 30);
    if (isInvalid) {
      await db.entities.Card.delete(card.id);
      purgedCount++;
      onLog(`🗑️ Carta "${card.name || card.id}" expurgada do sistema.`, "warning");
    }
  }

  return purgedCount;
}

/**
 * Tenta reparar individualmente uma carta em Quarentena via Fandom + Gemini IA
 */
export async function repairQuarantinedCard(cardId, onLog = () => {}) {
  const card = await db.entities.Card.get(cardId);
  if (!card) throw new Error("Carta não encontrada.");

  onLog(`🔍 Iniciando reparo inteligente em quarentena para ${card.name}...`, "info");

  const colCode = normalizeCode(card.collection_id || card.series || "MULTIVERSE");

  const enriched = await enrichmentService.enrichCardFromWikiAndAI(card.name, colCode, {
    rarity: card.rarity,
    role: card.role,
    isBoss: card.is_boss
  });

  const updatedPayload = enriched.cardData;

  // Preserva img_custom do admin
  if (card.img_custom) {
    updatedPayload.img_custom = card.img_custom;
  }

  // Recalcula score
  const newScore = calculateCardQualityScore(updatedPayload);
  const statusEval = determineCardStatus(updatedPayload, newScore);

  updatedPayload.quality_score = newScore;
  updatedPayload.status = statusEval.status;
  updatedPayload.rejection_reason = statusEval.reason;
  updatedPayload.last_validation = new Date().toISOString();
  updatedPayload.correction_count = (card.correction_count || 0) + 1;

  await db.entities.Card.update(cardId, updatedPayload);
  onLog(`✓ Carta ${card.name} reparada! Novo Score: ${newScore}/100 [Status: ${statusEval.status}]`, "success");
  return updatedPayload;
}

export const dataQualityEngine = {
  runDataQualityAudit,
  purgeInvalidCards,
  repairQuarantinedCard,
  calculateCardQualityScore,
  determineCardStatus,
  validateImageUrl,
  inferCollectionCode
};

export default dataQualityEngine;
