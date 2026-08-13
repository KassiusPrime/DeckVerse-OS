// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Persistence Provider (Phase 4A)
// Central gateway selecting between LocalPersistenceAdapter and FirebasePersistenceAdapter
// Default mode: "local"
// ════════════════════════════════════════════════════════════════════════════

import { getStorageMode, isFirebaseConfigured } from "../firebase/firebaseClient.js";
import { localPersistenceAdapter } from "./localPersistenceAdapter.js";
import { firebasePersistenceAdapter } from "./firebasePersistenceAdapter.js";

class PersistenceProvider {
  constructor() {
    this.overrideMode = null;
  }

  setStorageModeOverride(mode) {
    if (mode === "local" || mode === "firebase" || mode === null) {
      this.overrideMode = mode;
    }
  }

  getStorageMode() {
    if (this.overrideMode) return this.overrideMode;
    return getStorageMode();
  }

  getAdapter() {
    const mode = this.getStorageMode();
    if (mode === "firebase") {
      if (!isFirebaseConfigured()) {
        throw new Error("[PersistenceProvider] Modo Firebase selecionado (VITE_DECKVERSE_STORAGE_MODE=firebase), mas as credenciais e configuração do Firebase não estão presentes no ambiente.");
      }
      return firebasePersistenceAdapter;
    }
    return localPersistenceAdapter;
  }

  getSource() {
    return this.getAdapter().getSource();
  }

  // ── DELEGATED ENTITY METHODS ──────────────────────────────────────────────
  async getCollections() {
    return await this.getAdapter().getCollections();
  }

  async getCollectionById(codeOrId) {
    return await this.getAdapter().getCollectionById(codeOrId);
  }

  async createCollection(data) {
    return await this.getAdapter().createCollection(data);
  }

  async updateCollection(codeOrId, data) {
    return await this.getAdapter().updateCollection(codeOrId, data);
  }

  async deleteCollection(codeOrId) {
    return await this.getAdapter().deleteCollection(codeOrId);
  }

  async getCharacters() {
    return await this.getAdapter().getCharacters();
  }

  async getCharacterById(idOrKey) {
    return await this.getAdapter().getCharacterById(idOrKey);
  }

  async createCharacter(data) {
    return await this.getAdapter().createCharacter(data);
  }

  async updateCharacter(idOrKey, data) {
    return await this.getAdapter().updateCharacter(idOrKey, data);
  }

  async deleteCharacter(idOrKey) {
    return await this.getAdapter().deleteCharacter(idOrKey);
  }

  async getItems() {
    return await this.getAdapter().getItems();
  }

  async getItemById(id) {
    return await this.getAdapter().getItemById(id);
  }

  async createItem(data) {
    return await this.getAdapter().createItem(data);
  }

  async updateItem(id, data) {
    return await this.getAdapter().updateItem(id, data);
  }

  async deleteItem(id) {
    return await this.getAdapter().deleteItem(id);
  }

  async getBosses() {
    return await this.getAdapter().getBosses();
  }

  async createBoss(data) {
    return await this.getAdapter().createBoss(data);
  }

  async updateBoss(id, data) {
    return await this.getAdapter().updateBoss(id, data);
  }

  async deleteBoss(id) {
    return await this.getAdapter().deleteBoss(id);
  }

  async getDynamicRegistry() {
    return await this.getAdapter().getDynamicRegistry();
  }

  async saveDynamicRegistryEntry(entry) {
    return await this.getAdapter().saveDynamicRegistryEntry(entry);
  }

  async deleteDynamicRegistryEntry(code) {
    return await this.getAdapter().deleteDynamicRegistryEntry(code);
  }

  async getMediaIndex() {
    return await this.getAdapter().getMediaIndex();
  }

  async saveMediaIndexRecord(record) {
    return await this.getAdapter().saveMediaIndexRecord(record);
  }

  async deleteMediaIndexRecord(id) {
    return await this.getAdapter().deleteMediaIndexRecord(id);
  }
}

export const persistenceProvider = new PersistenceProvider();
export default persistenceProvider;
