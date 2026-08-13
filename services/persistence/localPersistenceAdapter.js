// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Local Persistence Adapter (Phase 4A)
// Local-first implementation using localStorage and in-memory entityRepository.
// Source: LOCAL
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "../../core/entityRepository.js";
import { collectionRegistryService } from "../registry/collectionRegistryService.js";

export class LocalPersistenceAdapter {
  constructor() {
    this.source = "LOCAL";
  }

  getSource() {
    return this.source;
  }

  // ── COLLECTIONS ──────────────────────────────────────────────────────────
  async getCollections() {
    return await entityRepository.getAllCollections();
  }

  async getCollectionById(codeOrId) {
    return await entityRepository.getCollectionById(codeOrId);
  }

  async createCollection(collectionData) {
    return await entityRepository.saveCollection({
      ...collectionData,
      source: "LOCAL"
    });
  }

  async updateCollection(codeOrId, collectionData) {
    const existing = await entityRepository.getCollectionById(codeOrId);
    if (!existing) {
      throw new Error(`Coleção não encontrada: ${codeOrId}`);
    }
    return await entityRepository.saveCollection({
      ...existing,
      ...collectionData,
      id: existing.id
    });
  }

  async deleteCollection(codeOrId) {
    return await entityRepository.deleteCollection(codeOrId);
  }

  // ── CHARACTERS / CARDS ───────────────────────────────────────────────────
  async getCharacters() {
    return await entityRepository.getAllCards();
  }

  async getCharacterById(idOrKey) {
    return await entityRepository.getCardById(idOrKey);
  }

  async createCharacter(characterData) {
    return await entityRepository.saveCard({
      ...characterData,
      source: "LOCAL"
    });
  }

  async updateCharacter(idOrKey, characterData) {
    const existing = await entityRepository.getCardById(idOrKey);
    if (!existing) {
      throw new Error(`Personagem não encontrado: ${idOrKey}`);
    }
    return await entityRepository.saveCard({
      ...existing,
      ...characterData,
      id: existing.id
    });
  }

  async deleteCharacter(idOrKey) {
    return await entityRepository.deleteCard(idOrKey);
  }

  // ── ITEMS ────────────────────────────────────────────────────────────────
  async getItems() {
    return await entityRepository.getAllItems();
  }

  async getItemById(id) {
    return await entityRepository.getItemById(id);
  }

  async createItem(itemData) {
    return await entityRepository.saveItem({
      ...itemData,
      source: "LOCAL"
    });
  }

  async updateItem(id, itemData) {
    const existing = await entityRepository.getItemById(id);
    if (!existing) {
      throw new Error(`Item não encontrado: ${id}`);
    }
    return await entityRepository.saveItem({
      ...existing,
      ...itemData,
      id: existing.id
    });
  }

  async deleteItem(id) {
    return await entityRepository.deleteItem(id);
  }

  // ── BOSSES ───────────────────────────────────────────────────────────────
  async getBosses() {
    return await entityRepository.getAllBosses();
  }

  async getBossById(id) {
    const bosses = await entityRepository.getAllBosses();
    return bosses.find(b => b.id === id) || null;
  }

  async createBoss(bossData) {
    return await entityRepository.saveBoss({
      ...bossData,
      source: "LOCAL"
    });
  }

  async updateBoss(id, bossData) {
    return await entityRepository.saveBoss({
      ...bossData,
      id
    });
  }

  async deleteBoss(id) {
    return await entityRepository.deleteBoss(id);
  }

  // ── DYNAMIC REGISTRY ─────────────────────────────────────────────────────
  async getDynamicRegistry() {
    return await collectionRegistryService.getDynamicCollections();
  }

  async saveDynamicRegistryEntry(entry) {
    return await entityRepository.saveCollection(entry);
  }

  async deleteDynamicRegistryEntry(code) {
    return await entityRepository.deleteCollection(code);
  }

  // ── MEDIA INDEX ──────────────────────────────────────────────────────────
  async getMediaIndex() {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem("deckverse_mediaIndex");
        return raw ? JSON.parse(raw) : [];
      }
    } catch (e) {}
    return [];
  }

  async saveMediaIndexRecord(record) {
    const items = await this.getMediaIndex();
    const newRecord = {
      id: record.id || `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      source: "LOCAL",
      ...record
    };
    items.unshift(newRecord);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deckverse_mediaIndex", JSON.stringify(items));
    }
    return newRecord;
  }

  async deleteMediaIndexRecord(id) {
    const items = await this.getMediaIndex();
    const filtered = items.filter(i => i.id !== id && i.entityKey !== id);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deckverse_mediaIndex", JSON.stringify(filtered));
    }
    return { success: true };
  }
}

export const localPersistenceAdapter = new LocalPersistenceAdapter();
export default localPersistenceAdapter;
