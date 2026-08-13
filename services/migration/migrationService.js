// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Migration Service (Phase 4A)
// Manual / On-Demand migration interface for transferring local data to Firebase.
// automaticMigrationExecuted = NO, localDataDeleted = NO.
// ════════════════════════════════════════════════════════════════════════════

import { localPersistenceAdapter } from "../persistence/localPersistenceAdapter.js";
import { firebasePersistenceAdapter } from "../persistence/firebasePersistenceAdapter.js";
import { isFirebaseConfigured } from "../firebase/firebaseClient.js";

class MigrationService {
  /**
   * Reads and packages full local catalog state into a serializable snapshot.
   */
  async exportLocalCatalog() {
    const collections = await localPersistenceAdapter.getCollections();
    const characters = await localPersistenceAdapter.getCharacters();
    const items = await localPersistenceAdapter.getItems();
    const bosses = await localPersistenceAdapter.getBosses();
    const dynamicRegistry = await localPersistenceAdapter.getDynamicRegistry();
    const mediaIndex = await localPersistenceAdapter.getMediaIndex();

    return {
      exportedAt: new Date().toISOString(),
      source: "LOCAL",
      counts: {
        collections: collections.length,
        characters: characters.length,
        items: items.length,
        bosses: bosses.length,
        dynamicRegistry: dynamicRegistry.length,
        mediaIndex: mediaIndex.length
      },
      data: {
        collections,
        characters,
        items,
        bosses,
        dynamicRegistry,
        mediaIndex
      }
    };
  }

  /**
   * Imports snapshot data into Firebase (Explicitly invoked, NOT automatic).
   */
  async importCatalogToFirebase(snapshotData) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado. Migração abortada.");
    }

    const snapshot = snapshotData || (await this.exportLocalCatalog());
    const data = snapshot.data;
    const results = {
      collections: { success: 0, failed: 0 },
      characters: { success: 0, failed: 0 },
      items: { success: 0, failed: 0 },
      bosses: { success: 0, failed: 0 }
    };

    // 1. Collections
    for (const col of data.collections || []) {
      try {
        await firebasePersistenceAdapter.createCollection(col);
        results.collections.success++;
      } catch (err) {
        results.collections.failed++;
      }
    }

    // 2. Characters
    for (const char of data.characters || []) {
      try {
        await firebasePersistenceAdapter.createCharacter(char);
        results.characters.success++;
      } catch (err) {
        results.characters.failed++;
      }
    }

    // 3. Items
    for (const item of data.items || []) {
      try {
        await firebasePersistenceAdapter.createItem(item);
        results.items.success++;
      } catch (err) {
        results.items.failed++;
      }
    }

    // 4. Bosses
    for (const boss of data.bosses || []) {
      try {
        await firebasePersistenceAdapter.createBoss(boss);
        results.bosses.success++;
      } catch (err) {
        results.bosses.failed++;
      }
    }

    return {
      success: true,
      migratedAt: new Date().toISOString(),
      results
    };
  }

  /**
   * Compares Local and Firebase catalogs to verify consistency without deleting data.
   */
  async verifyCatalogSync() {
    if (!isFirebaseConfigured()) {
      return { inSync: false, reason: "Firebase não configurado" };
    }

    const localCols = await localPersistenceAdapter.getCollections();
    const fbCols = await firebasePersistenceAdapter.getCollections();

    const localChars = await localPersistenceAdapter.getCharacters();
    const fbChars = await firebasePersistenceAdapter.getCharacters();

    return {
      inSync: localCols.length === fbCols.length && localChars.length === fbChars.length,
      localCounts: { collections: localCols.length, characters: localChars.length },
      firebaseCounts: { collections: fbCols.length, characters: fbChars.length }
    };
  }
}

export const migrationService = new MigrationService();
export default migrationService;
