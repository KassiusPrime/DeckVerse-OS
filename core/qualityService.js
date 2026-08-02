// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Data Quality Service
// Calculates quality scores (0-100), identifies incomplete cards, and manages quarantine
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "./entityRepository.js";

class QualityService {
  /**
   * Calculate a quality score (0-100) and defect list for a single card
   */
  evaluateCardQuality(card) {
    let score = 100;
    const defects = [];

    // 1. Primary Image Check (-30 if missing or placeholder)
    const img = card.image_url || card.img_oficial || card.img_custom || "";
    if (!img || img.trim() === "") {
      score -= 35;
      defects.push("Sem imagem oficial/principal definida");
    } else if (img.includes("placeholder") || img.includes("avatar")) {
      score -= 10;
      defects.push("Usando imagem provisória/avatar genérico");
    }

    // 2. Stats Check (-20 if all stats are zero or missing)
    const atk = Number(card.attack) || 0;
    const def = Number(card.defense) || 0;
    const spd = Number(card.speed) || 0;
    const hp = Number(card.hp) || 0;

    if (atk === 0 && def === 0 && spd === 0 && hp === 0) {
      score -= 25;
      defects.push("Atributos de combate zerados ou ausentes (ATK/DEF/SPD/HP)");
    }

    // 3. Lore / Bio Check (-15 if missing or short)
    const lore = (card.lore || card.bio || "").trim();
    if (!lore) {
      score -= 15;
      defects.push("Sem história ou descrição do personagem");
    } else if (lore.length < 20) {
      score -= 5;
      defects.push("Descrição do personagem muito curta");
    }

    // 4. Skills Check (-15 if empty)
    if (!card.skills || !Array.isArray(card.skills) || card.skills.length === 0) {
      score -= 15;
      defects.push("Nenhuma habilidade/skill cadastrada");
    }

    // 5. Tags Check (-10 if empty)
    if (!card.tags || !Array.isArray(card.tags) || card.tags.length === 0) {
      score -= 10;
      defects.push("Sem tags ou afiliações mapeadas");
    }

    const finalScore = Math.max(0, score);
    const isQuarantined = finalScore < 45 || defects.includes("Sem imagem oficial/principal definida");

    return {
      card_id: card.card_id || card.id,
      card_name: card.name,
      score: finalScore,
      defects,
      isQuarantined,
      status: finalScore >= 80 ? "excelente" : finalScore >= 50 ? "regular" : "critico"
    };
  }

  /**
   * Run full database quality audit
   */
  async runFullDatabaseAudit() {
    const cards = await entityRepository.getAllCards();
    if (!cards || cards.length === 0) {
      return {
        globalScore: 100,
        totalCards: 0,
        incompleteCardsCount: 0,
        quarantinedCount: 0,
        evaluations: []
      };
    }

    const evaluations = [];
    let totalScore = 0;
    let incompleteCardsCount = 0;
    let quarantinedCount = 0;

    for (const card of cards) {
      const evalRes = this.evaluateCardQuality(card);
      evaluations.push(evalRes);
      totalScore += evalRes.score;

      if (evalRes.defects.length > 0) {
        incompleteCardsCount++;
      }

      if (evalRes.isQuarantined) {
        quarantinedCount++;
        // Automatically ensure item is in quarantine store
        await entityRepository.saveQuarantineItem({
          id: card.id,
          card_id: card.card_id,
          name: card.name,
          collection_id: card.collection_id,
          score: evalRes.score,
          defects: evalRes.defects,
          rawCard: card
        });
      }
    }

    const globalScore = Math.round(totalScore / cards.length);

    return {
      globalScore,
      totalCards: cards.length,
      incompleteCardsCount,
      quarantinedCount,
      evaluations
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
