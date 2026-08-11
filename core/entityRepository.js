// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Entity Repository
// Single doorway for reading and writing persistence entities (localStorage/db)
// Enforces canonical entityKey protection for save/delete operations.
// ════════════════════════════════════════════════════════════════════════════

import { db } from "../deckverseClient.js";
import { deduplicateCards, deduplicateCollections } from "../src/utils/deduplication.js";
import { createEntityKey } from "../src/utils/entityIdentity.js";
import { resolveCollectionCode } from "../lib/collectionCodes.js";

class EntityRepository {
  /**
   * Cards
   */
  async getAllCards() {
    const rawCards = (await db.entities.Card.list(null, 5000)) || [];
    return deduplicateCards(rawCards);
  }

  async getCardById(idOrKey) {
    if (!idOrKey) return null;
    const cards = await this.getAllCards();

    // 1. Exact ID or card_id match
    const byId = cards.find(c => c.id === idOrKey || c.card_id === idOrKey);
    if (byId) return byId;

    // 2. Canonical entityKey match
    return cards.find(c => createEntityKey(c) === idOrKey) || null;
  }

  async saveCard(cardData) {
    if (!cardData) {
      throw new Error("Dados da carta são obrigatórios");
    }
    const data = cardData.data || cardData;
    const name = (data.name || data.title || "").trim();
    if (!name) {
      throw new Error("Nome da carta é obrigatório");
    }

    const typeLower = (data.entityType || data.type || "character").toString().toLowerCase();
    if (typeLower === "metadata" || typeLower === "lore") {
      throw new Error("Criação de metadados/lore através de formulário jogável não é permitida");
    }

    const targetKey = createEntityKey(data);
    const cards = await this.getAllCards();

    // Collision check: check if another card has the exact same entityKey
    const collision = cards.find(c =>
      targetKey &&
      createEntityKey(c) === targetKey &&
      (!data.id || c.id !== data.id) &&
      (!data.card_id || c.card_id !== data.card_id)
    );

    if (collision) {
      const err = new Error("Entidade já existente");
      err.isCollision = true;
      err.existingEntity = collision;
      err.entityKey = targetKey;
      throw err;
    }

    // STRICT IDENTITY SEARCH ORDER FOR UPDATES:
    const existing = cards.find(c =>
      (data.id && c.id === data.id) ||
      (data.card_id && c.card_id === data.card_id)
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
      const colCode = resolveCollectionCode(data.collection_id || data.collection_code) || "CUS";
      const card_id = data.card_id || `${colCode}-${Date.now().toString().slice(-6)}`;

      return await db.entities.Card.create({
        ...data,
        name,
        id,
        card_id,
        collection_id: colCode,
        created_date: data.created_date || new Date().toISOString()
      });
    }
  }

  async deleteCard(idOrKey) {
    if (!idOrKey) return { success: false, reason: "ID ou chave necessária" };

    const card = await this.getCardById(idOrKey);
    if (card) {
      // 1. Remove from Roster by card.id or card.card_id
      try {
        const roster = await db.entities.Roster.list(null, 5000);
        const userCards = roster.filter(r => r.card_id === card.id || r.card_id === card.card_id);
        for (const uc of userCards) {
          if (uc.id) await db.entities.Roster.delete(uc.id);
        }
      } catch (e) {}

      // 2. Delete Card entity ONLY by exact id or card_id (NEVER BY NAME ALONE!)
      if (card.id) await db.entities.Card.delete(card.id);
      if (card.card_id && card.card_id !== card.id) await db.entities.Card.delete(card.card_id);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("deckverse-card-deleted", { detail: { card } }));
      }
      return { success: true };
    }

    // Direct deletion by exact ID/key without card object
    const res = await db.entities.Card.delete(idOrKey);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("deckverse-card-deleted", { detail: { id: idOrKey } }));
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
    const rawCols = (await db.entities.Collection.list(null, 5000)) || [];
    return deduplicateCollections(rawCols);
  }

  async getCollectionById(idOrCode) {
    if (!idOrCode) return null;
    const collections = await this.getAllCollections();
    const canonCode = resolveCollectionCode(idOrCode);

    return collections.find(c =>
      c.id === idOrCode ||
      c.code === idOrCode ||
      c.code === canonCode
    ) || null;
  }

  async saveCollection(collectionData) {
    if (!collectionData) {
      throw new Error("Dados da coleção são obrigatórios");
    }
    const data = collectionData.data || collectionData;
    const name = (data.name || data.title || "").trim();
    const rawCode = data.code || data.id || data.collection_id || name;
    const code = resolveCollectionCode(rawCode) || (rawCode ? rawCode.toUpperCase().trim() : "");

    if (!name || !code) {
      throw new Error("Nome e Código da coleção são obrigatórios");
    }

    const payload = {
      ...data,
      name,
      code
    };

    const collections = await this.getAllCollections();
    const existing = collections.find(c =>
      (payload.id && c.id === payload.id) ||
      (c.code && c.code === payload.code)
    );

    if (existing) {
      // Check if trying to rename code to another existing collection
      if (!payload.id && existing.code === payload.code) {
        const err = new Error("Código de coleção já existente ou indisponível");
        err.isCollision = true;
        err.existingEntity = existing;
        throw err;
      }
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
    if (!col) return { success: false, reason: "Coleção não encontrada" };

    const canonCode = col.code || idOrCode;

    // Check linked entities before deleting
    const cards = await this.getAllCards();
    const items = await this.getAllItems();
    const bosses = await this.getAllBosses();

    const linkedCards = cards.filter(c => resolveCollectionCode(c.collection_id || c.collection_code) === canonCode);
    const linkedItems = items.filter(i => resolveCollectionCode(i.collection_id || i.collection_code) === canonCode);
    const linkedBosses = bosses.filter(b => resolveCollectionCode(b.collection_id || b.collection_code) === canonCode);

    const totalLinked = linkedCards.length + linkedItems.length + linkedBosses.length;
    if (totalLinked > 0) {
      throw new Error("Esta coleção contém entidades associadas.");
    }

    if (col.id) await db.entities.Collection.delete(col.id);
    if (col.code && col.code !== col.id) await db.entities.Collection.delete(col.code);
    return { success: true };
  }

  /**
   * Bosses
   */
  async getAllBosses() {
    return (await db.entities.Boss.list(null, 5000)) || [];
  }

  async saveBoss(bossData) {
    if (!bossData) throw new Error("Dados do boss são obrigatórios");
    const name = (bossData.name || bossData.title || "").trim();
    if (!name) throw new Error("Nome do boss é obrigatório");

    const typeLower = (bossData.entityType || bossData.type || "boss").toString().toLowerCase();
    if (typeLower === "metadata" || typeLower === "lore") {
      throw new Error("Criação de metadados/lore através de formulário jogável não é permitida");
    }

    const bosses = await this.getAllBosses();
    const targetKey = createEntityKey({ ...bossData, type: "boss", name });

    const collision = bosses.find(b =>
      targetKey &&
      createEntityKey({ ...b, type: "boss" }) === targetKey &&
      (!bossData.id || b.id !== bossData.id)
    );

    if (collision) {
      const err = new Error("Entidade já existente");
      err.isCollision = true;
      err.existingEntity = collision;
      err.entityKey = targetKey;
      throw err;
    }

    const existing = bosses.find(b => bossData.id && b.id === bossData.id);

    if (existing) {
      return await db.entities.Boss.update(existing.id, { ...existing, ...bossData, name });
    } else {
      return await db.entities.Boss.create({
        id: bossData.id || `boss_${Date.now()}`,
        ...bossData,
        name
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
    return (await db.entities.Player.list(null, 5000)) || [];
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
   * Items
   */
  async getAllItems() {
    return (await db.entities.Item.list(null, 5000)) || [];
  }

  async getItemById(id) {
    if (!id) return null;
    const items = await this.getAllItems();
    return items.find(i => i.id === id || i.item_id === id) || null;
  }

  async saveItem(itemData) {
    if (!itemData) throw new Error("Dados do item são obrigatórios");
    const name = (itemData.name || itemData.title || "").trim();
    if (!name) throw new Error("Nome do item é obrigatório");

    const typeLower = (itemData.entityType || itemData.type || "item").toString().toLowerCase();
    if (typeLower === "metadata" || typeLower === "lore") {
      throw new Error("Criação de metadados/lore através de formulário jogável não é permitida");
    }

    const items = await this.getAllItems();
    const targetKey = createEntityKey({ ...itemData, type: "item", name });

    const collision = items.find(i =>
      targetKey &&
      createEntityKey({ ...i, type: "item" }) === targetKey &&
      (!itemData.id || i.id !== itemData.id) &&
      (!itemData.item_id || i.item_id !== itemData.item_id)
    );

    if (collision) {
      const err = new Error("Entidade já existente");
      err.isCollision = true;
      err.existingEntity = collision;
      err.entityKey = targetKey;
      throw err;
    }

    const existing = items.find(i => (itemData.id && i.id === itemData.id) || (itemData.code && i.code === itemData.code));
    if (existing) {
      return await db.entities.Item.update(existing.id, { ...existing, ...itemData, name });
    } else {
      return await db.entities.Item.create({
        id: itemData.id || `item_${Date.now()}`,
        ...itemData,
        name
      });
    }
  }

  async deleteItem(id) {
    return await db.entities.Item.delete(id);
  }

  /**
   * Quarantine Store
   */
  async getQuarantineItems() {
    return (await db.entities.QuarantineCard.list(null, 5000)) || [];
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
      environment: "Local First (DeckVerse Persistence)",
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
