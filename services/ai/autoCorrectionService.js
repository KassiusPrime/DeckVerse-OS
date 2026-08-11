// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Permanent Auto-Correction & Deduplication Service
// ════════════════════════════════════════════════════════════════════════════

import { db } from "@/deckverseClient";
import { validateCollection, validateCard, validateItem, validateBoss, normalizeCode } from "@/lib/importSchemas";
import { inferCollectionCode, CANONICAL_SERIES_NAMES } from "@/lib/collectionCodes";
import { fandomClient } from "../fandom/fandomClient";

const DEFAULT_FALLBACK_IMAGES = {
  DEFAULT: "/assets/placeholders/entity.svg"
};

/**
 * Normaliza o nome canônico do personagem para deduplicação
 */
export function getCanonicalSlug(name = "") {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Serviço Principal de Correção Automática e Deduplicação Inteligente
 */
export async function runFullAutoCorrection(onLog = () => {}) {
  const log = (msg, type = "info") => onLog(msg, type);

  log("🚀 [AUTO-CORRECTION] Iniciando varredura completa do banco de dados...", "info");

  try {
    // 1. DEDUPLICAR E NORMALIZAR COLEÇÕES
    const collections = await db.entities.Collection.list("-created_date", 1000);
    log(`📋 Analisando ${collections.length} coleções registradas...`, "info");

    const collectionByCodeMap = new Map();
    const duplicateCols = [];

    for (const col of collections) {
      const validVal = validateCollection(col);
      if (!validVal.ok) {
        log(`  ⚠️ Coleção inválida detectada (${col.name || col.id}): ${validVal.errors.join(", ")}`, "warning");
        continue;
      }
      const normCol = validVal.data;
      const codeKey = normCol.code;

      if (!collectionByCodeMap.has(codeKey)) {
        collectionByCodeMap.set(codeKey, { id: col.id, ...normCol, raw: col });
      } else {
        const existing = collectionByCodeMap.get(codeKey);
        // Escolhe o registro mais completo
        const existingScore = (existing.image_url ? 10 : 0) + (existing.description ? 5 : 0) + (existing.name ? 5 : 0);
        const currentScore = (normCol.image_url ? 10 : 0) + (normCol.description ? 5 : 0) + (normCol.name ? 5 : 0);

        if (currentScore > existingScore) {
          duplicateCols.push(existing.id);
          collectionByCodeMap.set(codeKey, { id: col.id, ...normCol, raw: col });
        } else {
          duplicateCols.push(col.id);
        }
      }
    }

    // Deleta coleções duplicadas
    for (const dupId of duplicateCols) {
      await db.entities.Collection.delete(dupId);
      log(`  ✓ Removida coleção duplicada ID: ${dupId}`, "success");
    }

    // 2. DEDUPLICAR E NORMALIZAR CARTAS
    const cards = await db.entities.Card.list("-created_date", 2000);
    log(`🃏 Analisando ${cards.length} cartas para deduplicação e canonização...`, "info");

    const cardsMap = new Map();
    const duplicateCardIds = [];

    for (const card of cards) {
      const slug = getCanonicalSlug(card.name);
      const colCode = inferCollectionCode(card);
      const key = `${colCode}_${slug}`;

      if (!cardsMap.has(key)) {
        cardsMap.set(key, card);
      } else {
        const existing = cardsMap.get(key);
        // Critério de seleção do registro mais completo
        const existingScore =
          (existing.img_custom ? 100 : 0) +
          (existing.img_oficial ? 40 : 0) +
          (existing.image_url ? 20 : 0) +
          (existing.lore ? existing.lore.length : 0) +
          (existing.skills ? existing.skills.length * 10 : 0);

        const currentScore =
          (card.img_custom ? 100 : 0) +
          (card.img_oficial ? 40 : 0) +
          (card.image_url ? 20 : 0) +
          (card.lore ? card.lore.length : 0) +
          (card.skills ? card.skills.length * 10 : 0);

        if (currentScore > existingScore) {
          // Mescla dados úteis do antigo no novo
          const mergedLore = card.lore || existing.lore || `${card.name} é um lutador lendário.`;
          const mergedCustom = card.img_custom || existing.img_custom || "";
          const mergedSkills = (card.skills && card.skills.length > 0) ? card.skills : (existing.skills || []);

          cardsMap.set(key, {
            ...card,
            lore: mergedLore,
            img_custom: mergedCustom,
            skills: mergedSkills
          });
          duplicateCardIds.push(existing.id);
        } else {
          // Mantém existing, mas mescla custom img do card atual se tiver
          if (card.img_custom && !existing.img_custom) {
            existing.img_custom = card.img_custom;
            await db.entities.Card.update(existing.id, { img_custom: card.img_custom });
          }
          duplicateCardIds.push(card.id);
        }
      }
    }

    // Exclui cartas duplicadas
    for (const dupId of duplicateCardIds) {
      await db.entities.Card.delete(dupId);
      log(`  ✓ Removida carta duplicada ID: ${dupId}`, "success");
    }

    // 3. REPARAR IMAGENS QUEBRADAS, COLEÇÕES E ESTATÍSTICAS CANÔNICAS
    const uniqueCards = Array.from(cardsMap.values());
    log(`🔧 Verificando integridade visual, coleções e atributos de ${uniqueCards.length} cartas...`, "info");

    for (const card of uniqueCards) {
      let needsUpdate = false;
      const updates = {};

      // Corrigir atribuição de coleção e franquia se estiver em MULTIVERSE ou genérica
      const inferredColCode = inferCollectionCode(card);
      if (inferredColCode && inferredColCode !== "COL-00-MULTI") {
        if (card.collection_id !== inferredColCode || card.collection_id === "MULTIVERSE" || card.collection_id === "COL-00-MULTI" || !card.series || card.series === "Multiverse" || card.series === "Other") {
          const canonicalSeries = CANONICAL_SERIES_NAMES[inferredColCode] || card.series || "DeckVerse";
          updates.collection_id = inferredColCode;
          updates.series = canonicalSeries;
          needsUpdate = true;
          log(`  🏷️ Carta ${card.name} reatribuída para a coleção ${canonicalSeries} (${inferredColCode})`, "success");
        }
      }

      // Fallback de Imagem se vazia
      if (!card.image_url && !card.img_oficial && !card.img_custom) {
        const colCode = updates.collection_id || card.collection_id || "DEFAULT";
        const fallback = DEFAULT_FALLBACK_IMAGES[colCode] || DEFAULT_FALLBACK_IMAGES.DEFAULT;
        updates.image_url = fallback;
        updates.img_oficial = fallback;
        needsUpdate = true;
        log(`  🖼️ Imagem vinculada via fallback para ${card.name}`, "warning");
      }

      // Validação e sanitização de atributos
      if (!card.attack || card.attack < 10) { updates.attack = 75; needsUpdate = true; }
      if (!card.hp || card.hp < 50) { updates.hp = (updates.attack || card.attack) * 4; needsUpdate = true; }
      if (!card.defense || card.defense < 10) { updates.defense = 70; needsUpdate = true; }
      if (!card.speed || card.speed < 10) { updates.speed = 75; needsUpdate = true; }
      if (!card.mag || card.mag < 10) { updates.mag = 70; needsUpdate = true; }

      // Garante tags limpas
      if (!Array.isArray(card.tags)) {
        updates.tags = [updates.collection_id || card.collection_id || "COL-00-MULTI"];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.entities.Card.update(card.id, updates);
      }
    }

    // 4. VINCULAR BOSSES ESTRITAMENTE À SUA COLEÇÃO
    const bosses = await db.entities.Boss.list("-created_date", 500);
    log(`👑 Garantindo vínculo estrito de ${bosses.length} Bosses às suas coleções...`, "info");

    for (const boss of bosses) {
      const inferredBossCode = inferCollectionCode(boss);
      if (inferredBossCode && inferredBossCode !== "COL-00-MULTI") {
        if (!boss.collection_id || boss.collection_id === "MULTIVERSE" || boss.collection_id === "COL-00-MULTI") {
          const canonicalSeries = CANONICAL_SERIES_NAMES[inferredBossCode] || boss.series || "DeckVerse";
          await db.entities.Boss.update(boss.id, {
            collection_id: inferredBossCode,
            series: canonicalSeries
          });
          log(`  ✓ Boss ${boss.name} reatribuído à coleção ${canonicalSeries} (${inferredBossCode})`, "success");
        }
      }
    }

    log("🎉 [AUTO-CORRECTION] Correção e deduplicação do banco concluídas com sucesso!", "success");
    return { ok: true, cleanedCards: duplicateCardIds.length, cleanedCols: duplicateCols.length };
  } catch (err) {
    log(`💥 Erro na auto-correção: ${err.message}`, "error");
    throw err;
  }
}

export const autoCorrectionService = {
  runFullAutoCorrection,
  getCanonicalSlug
};

export default autoCorrectionService;
