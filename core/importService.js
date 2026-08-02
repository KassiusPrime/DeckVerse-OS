// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Import Service
// Unified card and collection import pipeline with automatic deduplication
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "./entityRepository.js";
import { validateCard, validateCollection, normalizeCode } from "../lib/importSchemas.js";

class ImportService {
  /**
   * Import a single card with normalization and deduplication
   */
  async importSingleCard(cardData, options = { overwrite: true }) {
    const existingCards = await entityRepository.getAllCards();
    const normalizedCollection = normalizeCode(cardData.collection_id || cardData.series || "MULTIVERSE");

    // Formats & Fallbacks
    const name = (cardData.name || "Carta Sem Nome").trim();
    const card_id = cardData.card_id || `${normalizedCollection}-${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${Math.floor(Math.random() * 899 + 100)}`;

    const duplicate = existingCards.find(c =>
      c.card_id === card_id ||
      (c.name.toLowerCase() === name.toLowerCase() && normalizeCode(c.collection_id) === normalizedCollection)
    );

    if (duplicate && !options.overwrite) {
      return {
        status: "skipped",
        reason: "Carta já existente",
        card: duplicate
      };
    }

    const payload = {
      id: duplicate ? duplicate.id : `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      card_id,
      collection_id: normalizedCollection,
      series: cardData.series || cardData.collection_id || "Multiverse",
      rarity: cardData.rarity || "SR",
      role: cardData.role || "DPS",
      element: cardData.element || "Void",
      gender: cardData.gender || "Unknown",
      attack: Number(cardData.attack) || 100,
      defense: Number(cardData.defense) || 100,
      speed: Number(cardData.speed) || 100,
      hp: Number(cardData.hp) || 400,
      mag: Number(cardData.mag) || 100,
      image_url: cardData.image_url || cardData.img_oficial || "",
      img_oficial: cardData.img_oficial || cardData.image_url || "",
      img_custom: cardData.img_custom || "",
      lore: cardData.lore || cardData.bio || "Entidade importada no Multiverso.",
      skills: Array.isArray(cardData.skills) ? cardData.skills : [],
      tags: Array.isArray(cardData.tags) ? cardData.tags : [normalizedCollection],
      version: cardData.version || "Classic",
      evolution_stage: Number(cardData.evolution_stage) || 1,
      is_boss: Boolean(cardData.is_boss || cardData.rarity === "BOSS" || cardData.rarity === "ANOMALIA")
    };

    const validated = validateCard(payload);
    const savedCard = await entityRepository.saveCard(validated);

    return {
      status: duplicate ? "updated" : "created",
      card: savedCard
    };
  }

  /**
   * Import batch array of cards
   */
  async importCardBatch(cardsArray, options = { overwrite: true }) {
    if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: ["Nenhuma carta enviada."] };
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const results = [];

    for (let i = 0; i < cardsArray.length; i++) {
      try {
        const res = await this.importSingleCard(cardsArray[i], options);
        if (res.status === "skipped") {
          skipped++;
        } else {
          imported++;
        }
        results.push(res);
      } catch (err) {
        errors.push(`Item ${i + 1} (${cardsArray[i]?.name || "sem nome"}): ${err.message}`);
      }
    }

    return {
      total: cardsArray.length,
      imported,
      skipped,
      errors,
      results
    };
  }

  /**
   * Import or update collection metadata
   */
  async importCollection(collectionData) {
    const code = normalizeCode(collectionData.code || collectionData.name || "NEW");
    const payload = {
      name: collectionData.name || "Nova Coleção",
      code,
      description: collectionData.description || `Coleção ${code} importada no DeckVerse OS.`,
      image_url: collectionData.image_url || "",
      created_date: collectionData.created_date || new Date().toISOString()
    };

    const validated = validateCollection(payload);
    return await entityRepository.saveCollection(validated);
  }
}

export const importService = new ImportService();
