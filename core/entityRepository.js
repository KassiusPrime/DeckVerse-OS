// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Entity Repository
// Single doorway for reading and writing persistence entities (localStorage/db)
// ════════════════════════════════════════════════════════════════════════════

import { db } from "../base44Client.js";
import { deduplicateCards, deduplicateCollections, normalizeNameKey } from "../src/utils/deduplication.js";

class EntityRepository {
  /**
   * Cards
   */
  async getAllCards() {
    const rawCards = (await db.entities.Card.list()) || [];
    return deduplicateCards(rawCards);
  }

  async getCardById(id) {
    const cards = await this.getAllCards();
    return cards.find(c => c.id === id || c.card_id === id) || null;
  }

  async saveCard(cardData) {
    if (!cardData) {
      throw new Error("Dados da carta são obrigatórios");
    }
    const data = cardData.data || cardData;
    const name = (data.name || data.title || "Carta Sem Nome").trim();
    const nameKey = normalizeNameKey(name);

    const cards = await this.getAllCards();
    const existing = cards.find(c =>
      (data.id && c.id === data.id) ||
      (data.card_id && c.card_id === data.card_id) ||
      (nameKey && normalizeNameKey(c.name) === nameKey)
    );

    if (existing) {
      return await db.entities.Card.update(existing.id, {
        ...existing,
        ...data,
        name: data.name || existing.name,
        updated_at: new Date().toISOString()
      });
    } else {
      const id = data.id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const card_id = data.card_id || `${data.collection_id || 'CUS'}-${Date.now().toString().slice(-6)}`;
      return await db.entities.Card.create({
        ...data,
        name,
        id,
        card_id,
        created_date: data.created_date || new Date().toISOString()
      });
    }
  }

  async deleteCard(id) {
    const card = await this.getCardById(id);
    if (card) {
      // 1. Remove from Roster
      try {
        const roster = await db.entities.Roster.list();
        const userCards = roster.filter(r => r.card_id === card.id || r.card_id === card.card_id);
        for (const uc of userCards) {
          if (uc.id) await db.entities.Roster.delete(uc.id);
        }
      } catch (e) {}

      // 2. Delete Card entity by id, card_id, and name
      if (card.id) await db.entities.Card.delete(card.id);
      if (card.card_id && card.card_id !== card.id) await db.entities.Card.delete(card.card_id);
      if (card.name) await db.entities.Card.delete(card.name);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("deckverse-card-deleted", { detail: { card } }));
      }
      return { success: true };
    }

    const res = await db.entities.Card.delete(id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("deckverse-card-deleted", { detail: { id } }));
    }
    return res;
  }

  async saveBatchCards(cardsArray) {
    const saved = [];
    for (const item of cardsArray) {
      const res = await this.saveCard(item);
      saved.push(res);
    }
    return saved;
  }

  /**
   * Collections
   */
  async getAllCollections() {
    const rawCols = (await db.entities.Collection.list()) || [];
    return deduplicateCollections(rawCols);
  }

  async getCollectionById(idOrCode) {
    const collections = await this.getAllCollections();
    const nameKey = normalizeNameKey(idOrCode);
    return collections.find(c => c.id === idOrCode || c.code === idOrCode || normalizeNameKey(c.name) === nameKey) || null;
  }

  async saveCollection(collectionData) {
    if (!collectionData) {
      throw new Error("Dados da coleção são obrigatórios");
    }
    const data = collectionData.data || collectionData;
    const name = (data.name || data.title || "").trim();
    const rawCode = data.code || data.id || data.collection_id || name;
    const code = rawCode ? rawCode.toString().toUpperCase().replace(/[^A-Z0-9_-]/g, "_") : "";

    if (!name || !code) {
      throw new Error("Nome e Código da coleção são obrigatórios");
    }

    const payload = {
      ...data,
      name,
      code
    };

    const nameKey = normalizeNameKey(name);
    const collections = await this.getAllCollections();
    const existing = collections.find(c =>
      (payload.id && c.id === payload.id) ||
      c.code === payload.code ||
      (nameKey && normalizeNameKey(c.name) === nameKey)
    );

    if (existing) {
      return await db.entities.Collection.update(existing.id, {
        ...existing,
        ...payload,
        updated_at: new Date().toISOString()
      });
    } else {
      const id = payload.id || `col_${Date.now()}`;
      return await db.entities.Collection.create({
        ...payload,
        id,
        created_date: payload.created_date || new Date().toISOString()
      });
    }
  }

  async deleteCollection(idOrCode) {
    const col = await this.getCollectionById(idOrCode);
    if (col) {
      if (col.id) await db.entities.Collection.delete(col.id);
      if (col.code && col.code !== col.id) await db.entities.Collection.delete(col.code);
      if (col.name) await db.entities.Collection.delete(col.name);
      return { success: true };
    }
    return await db.entities.Collection.delete(idOrCode);
  }

  /**
   * Bosses
   */
  async getAllBosses() {
    return (await db.entities.Boss.list()) || [];
  }

  async saveBoss(bossData) {
    const bosses = await this.getAllBosses();
    const existing = bosses.find(b => (bossData.id && b.id === bossData.id) || b.name === bossData.name);
    if (existing) {
      return await db.entities.Boss.update(existing.id, bossData);
    } else {
      return await db.entities.Boss.create({
        id: bossData.id || `boss_${Date.now()}`,
        ...bossData
      });
    }
  }

  async deleteBoss(id) {
    return await db.entities.Boss.delete(id);
  }

  /**
   * Players
   */
  async getAllPlayers() {
    return (await db.entities.Player.list()) || [];
  }

  async getPlayerById(id) {
    const players = await this.getAllPlayers();
    return players.find(p => p.id === id) || players[0] || null;
  }

  async savePlayer(playerData) {
    const players = await this.getAllPlayers();
    const existing = players.find(p => p.id === playerData.id);
    if (existing) {
      return await db.entities.Player.update(existing.id, playerData);
    } else {
      return await db.entities.Player.create(playerData);
    }
  }

  /**
   * Quarantine Store
   */
  async getQuarantineItems() {
    return (await db.entities.QuarantineCard.list()) || [];
  }

  async saveQuarantineItem(item) {
    const items = await this.getQuarantineItems();
    const existing = items.find(q => q.id === item.id || (q.card_id && q.card_id === item.card_id));
    if (existing) {
      return await db.entities.QuarantineCard.update(existing.id, {
        ...item,
        quarantined_at: new Date().toISOString()
      });
    } else {
      return await db.entities.QuarantineCard.create({
        id: item.id || `quar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        quarantined_at: new Date().toISOString(),
        ...item
      });
    }
  }

  async deleteQuarantineItem(id) {
    return await db.entities.QuarantineCard.delete(id);
  }

  /**
   * System Diagnostics / Cache
   */
  async getSystemStats() {
    const cards = await this.getAllCards();
    const collections = await this.getAllCollections();
    const bosses = await this.getAllBosses();
    const players = await this.getAllPlayers();
    const quarantine = await this.getQuarantineItems();

    let storageBytes = 0;
    if (typeof window !== "undefined" && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        storageBytes += (k.length + (localStorage.getItem(k) || "").length) * 2;
      }
    }

    return {
      totalCards: cards.length,
      totalCollections: collections.length,
      totalBosses: bosses.length,
      totalPlayers: players.length,
      quarantineCount: quarantine.length,
      storageUsedKB: (storageBytes / 1024).toFixed(2),
      environment: "Local First (localStorage + Base44 Mock)",
      timestamp: new Date().toISOString()
    };
  }

  async clearAllCaches() {
    if (typeof window !== "undefined" && window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("fandom_cache_") || k.startsWith("image_cache_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      return { clearedCount: keysToRemove.length };
    }
    return { clearedCount: 0 };
  }
}

export const entityRepository = new EntityRepository();
