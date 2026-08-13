// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Firebase Persistence Adapter (Phase 4A)
// Cloud-first adapter for Firestore, Firebase Auth, and Firebase Storage.
// Source: FIREBASE
// ════════════════════════════════════════════════════════════════════════════

import {
  getFirestoreDb,
  getFirebaseStorage,
  getFirebaseAuth,
  isFirebaseConfigured
} from "../firebase/firebaseClient.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

import { CANONICAL_COLLECTION_CODES, resolveCollectionCode } from "../../lib/collectionCodes.js";
import { collectionRegistryService } from "../registry/collectionRegistryService.js";
import { createEntityKey } from "../../src/utils/entityIdentity.js";

export class FirebasePersistenceAdapter {
  constructor() {
    this.source = "FIREBASE";
  }

  getSource() {
    return this.source;
  }

  handleFirestoreError(error, context = "OPERACAO") {
    console.error(`[FirebaseAdapter:${context}] Error:`, error);
    const msg = error.message || error.code || "Erro desconhecido no Firestore";
    const err = new Error(`[FirebaseAdapter:${context}] ${msg}`);
    err.originalError = error;
    err.code = error.code;
    throw err;
  }

  // ── COLLECTIONS ──────────────────────────────────────────────────────────
  async getCollections() {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado. Não é possível ler do Firestore.");
    }
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "collections"));
      const items = [];
      snap.forEach(d => {
        const data = d.data();
        const code = (data.code || d.id).toUpperCase();
        const isStatic = CANONICAL_COLLECTION_CODES.includes(code);
        items.push({
          id: d.id,
          ...data,
          code,
          registrySource: data.registrySource || (isStatic ? "STATIC" : "DYNAMIC")
        });
      });
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_COLLECTIONS");
    }
  }

  async getCollectionById(codeOrId) {
    if (!codeOrId) return null;
    if (!isFirebaseConfigured()) return null;
    try {
      const db = getFirestoreDb();
      const canonCode = resolveCollectionCode(codeOrId) || codeOrId.toUpperCase();
      
      const docRef = doc(db, "collections", canonCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          id: snap.id,
          ...data,
          code: (data.code || snap.id).toUpperCase()
        };
      }

      // Query by id field if not found by canonCode
      const q = query(collection(db, "collections"), where("id", "==", codeOrId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, ...d.data() };
      }
      return null;
    } catch (err) {
      this.handleFirestoreError(err, "GET_COLLECTION_BY_ID");
    }
  }

  async createCollection(collectionData) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado.");
    }
    const name = (collectionData.name || collectionData.title || "").trim();
    const rawCode = collectionData.code || collectionData.id || name;
    const code = rawCode ? rawCode.toUpperCase().trim() : "";

    if (!name || !code) {
      throw new Error("Nome e Código da coleção são obrigatórios.");
    }

    // Collision check using collectionRegistryService
    await collectionRegistryService.validateCollision(code, collectionData.aliases);

    const db = getFirestoreDb();
    const id = collectionData.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      ...collectionData,
      id,
      name,
      code,
      registrySource: "DYNAMIC",
      source: "FIREBASE",
      created_date: collectionData.created_date || new Date().toISOString()
    };

    // Transaction safety: Write to both collections/{code} and dynamicRegistry/{code}
    try {
      const batch = writeBatch(db);
      const colRef = doc(db, "collections", code);
      const regRef = doc(db, "dynamicRegistry", code);

      batch.set(colRef, payload);
      batch.set(regRef, {
        code,
        name,
        aliases: collectionData.aliases || [],
        createdAt: payload.created_date,
        source: "FIREBASE"
      });

      await batch.commit();
      await collectionRegistryService.getDynamicCollections();
      return payload;
    } catch (err) {
      // Logical rollback attempt if batch fails
      try {
        await deleteDoc(doc(db, "collections", code));
        await deleteDoc(doc(db, "dynamicRegistry", code));
      } catch (e) {}
      this.handleFirestoreError(err, "CREATE_COLLECTION");
    }
  }

  async updateCollection(codeOrId, collectionData) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado.");
    }
    const existing = await this.getCollectionById(codeOrId);
    if (!existing) {
      throw new Error(`Coleção não encontrada no Firestore: ${codeOrId}`);
    }

    const name = (collectionData.name || existing.name || "").trim();
    const newCode = (collectionData.code || existing.code || "").toUpperCase().trim();

    if (existing.code !== newCode) {
      const canEdit = await collectionRegistryService.canEditCanonicalCode(existing.code);
      if (!canEdit.allowed) {
        throw new Error(canEdit.reason);
      }
      await collectionRegistryService.validateCollision(newCode, collectionData.aliases, existing.id);
    }

    const db = getFirestoreDb();
    const payload = {
      ...existing,
      ...collectionData,
      name,
      code: newCode,
      updated_at: new Date().toISOString()
    };

    try {
      const colRef = doc(db, "collections", newCode);
      await setDoc(colRef, payload, { merge: true });
      if (existing.code !== newCode) {
        await deleteDoc(doc(db, "collections", existing.code));
        await deleteDoc(doc(db, "dynamicRegistry", existing.code));
        await setDoc(doc(db, "dynamicRegistry", newCode), {
          code: newCode,
          name,
          aliases: collectionData.aliases || [],
          updatedAt: payload.updated_at
        });
      }
      await collectionRegistryService.getDynamicCollections();
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "UPDATE_COLLECTION");
    }
  }

  async deleteCollection(codeOrId) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado.");
    }
    const col = await this.getCollectionById(codeOrId);
    if (!col) return { success: false, reason: "Coleção não encontrada no Firestore." };

    const code = col.code || codeOrId;
    const checkDelete = await collectionRegistryService.canDeleteCollection(code);
    if (!checkDelete.allowed) {
      throw new Error(checkDelete.reason);
    }

    try {
      const db = getFirestoreDb();
      const batch = writeBatch(db);
      batch.delete(doc(db, "collections", code));
      batch.delete(doc(db, "dynamicRegistry", code));
      await batch.commit();
      await collectionRegistryService.getDynamicCollections();
      return { success: true };
    } catch (err) {
      this.handleFirestoreError(err, "DELETE_COLLECTION");
    }
  }

  // ── CHARACTERS / CARDS ───────────────────────────────────────────────────
  async getCharacters() {
    if (!isFirebaseConfigured()) return [];
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "characters"));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_CHARACTERS");
    }
  }

  async getCharacterById(idOrKey) {
    if (!idOrKey || !isFirebaseConfigured()) return null;
    try {
      const db = getFirestoreDb();
      const docRef = doc(db, "characters", idOrKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }

      const q = query(collection(db, "characters"), where("entityKey", "==", idOrKey));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, ...d.data() };
      }
      return null;
    } catch (err) {
      this.handleFirestoreError(err, "GET_CHARACTER_BY_ID");
    }
  }

  async createCharacter(characterData) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado.");
    }
    const name = (characterData.name || characterData.title || "").trim();
    if (!name) throw new Error("Nome da carta é obrigatório");

    const typeLower = (characterData.entityType || characterData.type || "character").toString().toLowerCase();
    if (typeLower === "metadata" || typeLower === "lore") {
      throw new Error("Criação de metadados/lore através de formulário jogável não é permitida");
    }

    const targetKey = createEntityKey(characterData);
    const characters = await this.getCharacters();
    const collision = characters.find(c =>
      targetKey &&
      createEntityKey(c) === targetKey &&
      (!characterData.id || c.id !== characterData.id)
    );

    if (collision) {
      const err = new Error("Entidade já existente");
      err.isCollision = true;
      err.existingEntity = collision;
      err.entityKey = targetKey;
      throw err;
    }

    const db = getFirestoreDb();
    const id = characterData.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      ...characterData,
      id,
      name,
      entityKey: targetKey,
      source: "FIREBASE",
      created_date: characterData.created_date || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "characters", id), payload);
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "CREATE_CHARACTER");
    }
  }

  async updateCharacter(idOrKey, characterData) {
    const existing = await this.getCharacterById(idOrKey);
    if (!existing) {
      throw new Error(`Personagem não encontrado no Firestore: ${idOrKey}`);
    }
    const db = getFirestoreDb();
    const payload = {
      ...existing,
      ...characterData,
      updated_at: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "characters", existing.id), payload, { merge: true });
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "UPDATE_CHARACTER");
    }
  }

  async deleteCharacter(idOrKey) {
    const existing = await this.getCharacterById(idOrKey);
    if (!existing) return { success: false, reason: "Personagem não encontrado" };
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, "characters", existing.id));
      return { success: true };
    } catch (err) {
      this.handleFirestoreError(err, "DELETE_CHARACTER");
    }
  }

  // ── ITEMS ────────────────────────────────────────────────────────────────
  async getItems() {
    if (!isFirebaseConfigured()) return [];
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "items"));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_ITEMS");
    }
  }

  async getItemById(id) {
    if (!id || !isFirebaseConfigured()) return null;
    try {
      const db = getFirestoreDb();
      const snap = await getDoc(doc(db, "items", id));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (err) {
      this.handleFirestoreError(err, "GET_ITEM_BY_ID");
    }
  }

  async createItem(itemData) {
    if (!isFirebaseConfigured()) throw new Error("Firebase não está configurado.");
    const name = (itemData.name || "").trim();
    if (!name) throw new Error("Nome do item é obrigatório");

    const targetKey = createEntityKey({ ...itemData, type: "item", name });
    const items = await this.getItems();
    const collision = items.find(i =>
      targetKey &&
      createEntityKey({ ...i, type: "item" }) === targetKey &&
      (!itemData.id || i.id !== itemData.id)
    );

    if (collision) {
      const err = new Error("Entidade já existente");
      err.isCollision = true;
      err.existingEntity = collision;
      err.entityKey = targetKey;
      throw err;
    }

    const db = getFirestoreDb();
    const id = itemData.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      ...itemData,
      id,
      name,
      entityKey: targetKey,
      source: "FIREBASE",
      created_date: itemData.created_date || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "items", id), payload);
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "CREATE_ITEM");
    }
  }

  async updateItem(id, itemData) {
    const existing = await this.getItemById(id);
    if (!existing) throw new Error(`Item não encontrado no Firestore: ${id}`);
    const db = getFirestoreDb();
    const payload = { ...existing, ...itemData, updated_at: new Date().toISOString() };
    try {
      await setDoc(doc(db, "items", existing.id), payload, { merge: true });
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "UPDATE_ITEM");
    }
  }

  async deleteItem(id) {
    if (!isFirebaseConfigured()) return { success: false };
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, "items", id));
      return { success: true };
    } catch (err) {
      this.handleFirestoreError(err, "DELETE_ITEM");
    }
  }

  // ── BOSSES ───────────────────────────────────────────────────────────────
  async getBosses() {
    if (!isFirebaseConfigured()) return [];
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "bosses"));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_BOSSES");
    }
  }

  async createBoss(bossData) {
    if (!isFirebaseConfigured()) throw new Error("Firebase não está configurado.");
    const name = (bossData.name || "").trim();
    if (!name) throw new Error("Nome do boss é obrigatório");

    const db = getFirestoreDb();
    const id = bossData.id || `boss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      ...bossData,
      id,
      name,
      source: "FIREBASE",
      created_date: bossData.created_date || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "bosses", id), payload);
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "CREATE_BOSS");
    }
  }

  async updateBoss(id, bossData) {
    const db = getFirestoreDb();
    try {
      await setDoc(doc(db, "bosses", id), { ...bossData, updated_at: new Date().toISOString() }, { merge: true });
      return { id, ...bossData };
    } catch (err) {
      this.handleFirestoreError(err, "UPDATE_BOSS");
    }
  }

  async deleteBoss(id) {
    if (!isFirebaseConfigured()) return { success: false };
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, "bosses", id));
      return { success: true };
    } catch (err) {
      this.handleFirestoreError(err, "DELETE_BOSS");
    }
  }

  // ── DYNAMIC REGISTRY ─────────────────────────────────────────────────────
  async getDynamicRegistry() {
    if (!isFirebaseConfigured()) return [];
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "dynamicRegistry"));
      const items = [];
      snap.forEach(d => items.push({ code: d.id, ...d.data() }));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_DYNAMIC_REGISTRY");
    }
  }

  async saveDynamicRegistryEntry(entry) {
    return await this.createCollection(entry);
  }

  async deleteDynamicRegistryEntry(code) {
    return await this.deleteCollection(code);
  }

  // ── MEDIA INDEX & STORAGE ────────────────────────────────────────────────
  async getMediaIndex() {
    if (!isFirebaseConfigured()) return [];
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, "mediaIndex"));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, "GET_MEDIA_INDEX");
    }
  }

  async saveMediaIndexRecord(record) {
    if (!isFirebaseConfigured()) throw new Error("Firebase não está configurado.");
    const db = getFirestoreDb();
    const id = record.id || `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id,
      createdAt: new Date().toISOString(),
      source: "FIREBASE",
      status: "active",
      ...record
    };
    try {
      await setDoc(doc(db, "mediaIndex", id), payload);
      return payload;
    } catch (err) {
      this.handleFirestoreError(err, "SAVE_MEDIA_INDEX");
    }
  }

  async deleteMediaIndexRecord(id) {
    if (!isFirebaseConfigured()) return { success: false };
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, "mediaIndex", id));
      return { success: true };
    } catch (err) {
      this.handleFirestoreError(err, "DELETE_MEDIA_INDEX");
    }
  }

  /**
   * Upload Media file to Firebase Storage
   * Path: deckverse-media/{collectionCode}/{entityType}/{filename}
   */
  async uploadMedia(file, collectionCode, entityType = "character", customFilename = null) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase Storage não está configurado.");
    }
    const cleanCol = (collectionCode || "COL-00-MULTI").toUpperCase();
    const cleanType = (entityType || "character").toLowerCase();
    const filename = customFilename || file.name || `media_${Date.now()}.webp`;

    const storagePath = `deckverse-media/${cleanCol}/${cleanType}/${filename}`;
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, storagePath);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const mediaRecord = await this.saveMediaIndexRecord({
        collectionId: cleanCol,
        entityType: cleanType,
        filename,
        storagePath,
        downloadURL,
        mimeType: file.type || "image/webp",
        size: file.size || 0,
        mediaRole: "primary_cover"
      });

      return {
        success: true,
        storagePath,
        downloadURL,
        mediaRecord
      };
    } catch (err) {
      this.handleFirestoreError(err, "UPLOAD_MEDIA");
    }
  }
}

export const firebasePersistenceAdapter = new FirebasePersistenceAdapter();
export default firebasePersistenceAdapter;
