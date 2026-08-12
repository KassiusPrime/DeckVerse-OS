// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Dynamic Collection Registry Service (Phase 3)
// Merges Static built-in Registry with Dynamic Admin Registry into Effective Registry.
// Handles strict collision detection, code auto-suggestion, and lifecycle rules.
// ════════════════════════════════════════════════════════════════════════════

import { db } from "../../deckverseClient.js";
import {
  CANONICAL_COLLECTION_CODES,
  LEGACY_ALIASES,
  LEGACY_FULL_CODE_ALIASES,
  setDynamicCollectionResolver
} from "../../lib/collectionCodes.js";

let dynamicCollectionsCache = [];

class CollectionRegistryService {
  constructor() {
    // Register dynamic collection lookup hook into core lib/collectionCodes.js
    setDynamicCollectionResolver(this.resolveDynamicCode.bind(this));
  }

  /**
   * Returns array of dynamic collection records stored in db, updating in-memory cache.
   */
  async getDynamicCollections() {
    try {
      const allCols = (await db.entities.Collection.list(null, 5000)) || [];
      const dynamicCols = allCols.filter(c => c.registrySource === "DYNAMIC" || (!CANONICAL_COLLECTION_CODES.includes(c.code) && c.code && c.code !== "COL-00-MULTI"));
      dynamicCollectionsCache = dynamicCols;
      return dynamicCols;
    } catch (err) {
      console.warn("[CollectionRegistryService] Error loading dynamic collections:", err);
      return dynamicCollectionsCache;
    }
  }

  /**
   * Synchronous cache version for fast resolver hooks.
   */
  getDynamicCollectionsSync() {
    if (dynamicCollectionsCache && dynamicCollectionsCache.length > 0) {
      return dynamicCollectionsCache;
    }
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem("deckverse_Collection");
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            const filtered = items.filter(c => c.registrySource === "DYNAMIC" || (!CANONICAL_COLLECTION_CODES.includes(c.code) && c.code && c.code !== "COL-00-MULTI"));
            dynamicCollectionsCache = filtered;
            return filtered;
          }
        }
      }
    } catch (e) {
      // Fallback
    }
    return dynamicCollectionsCache || [];
  }

  /**
   * Internal hook registered into lib/collectionCodes.js for resolveCollectionCodeStrict.
   * Checks dynamic canonical codes and dynamic aliases.
   * @param {string} cleanInput - Uppercased, trimmed input code or alias
   * @returns {string|null} Canonical code if found in dynamic registry, or null
   */
  resolveDynamicCode(cleanInput) {
    if (!cleanInput || typeof cleanInput !== "string") return null;
    const clean = cleanInput.trim().toUpperCase();

    const dynamicCols = this.getDynamicCollectionsSync();

    // 1. Direct match on dynamic canonical code
    for (const col of dynamicCols) {
      const code = (col.code || "").toUpperCase();
      if (code && code === clean) {
        return code;
      }
    }

    // 2. Direct match on dynamic legacy/short aliases or COL-XX-SUFFIX alias format
    const matches = new Set();
    const colMatch = clean.match(/^COL-\d{2}-([A-Z0-9_]+)$/);
    const suffix = colMatch ? colMatch[1] : null;

    for (const col of dynamicCols) {
      const code = (col.code || "").toUpperCase();
      if (!code) continue;

      const aliases = Array.isArray(col.aliases)
        ? col.aliases.map(a => String(a).trim().toUpperCase())
        : typeof col.aliases === "string"
        ? col.aliases.split(",").map(a => a.trim().toUpperCase())
        : [];

      if (aliases.includes(clean) || (suffix && aliases.includes(suffix))) {
        matches.add(code);
      }
    }

    if (matches.size === 1) {
      return Array.from(matches)[0];
    }

    // Ambiguous (matches.size > 1) or no match -> return null
    return null;
  }

  /**
   * Effective Registry: Merges Static Built-in Collections + Dynamic Admin Collections
   */
  async getEffectiveRegistry() {
    const dynamicCols = await this.getDynamicCollections();

    const staticCodes = [...CANONICAL_COLLECTION_CODES];
    const staticAliases = { ...LEGACY_ALIASES, ...LEGACY_FULL_CODE_ALIASES };

    const dynamicCodes = dynamicCols.map(c => c.code.toUpperCase());
    const dynamicAliasMap = {};

    for (const col of dynamicCols) {
      const code = col.code.toUpperCase();
      const aliases = Array.isArray(col.aliases)
        ? col.aliases
        : typeof col.aliases === "string"
        ? col.aliases.split(",").map(a => a.trim().toUpperCase())
        : [];

      for (const alias of aliases) {
        if (alias) {
          dynamicAliasMap[alias] = code;
        }
      }
    }

    return {
      staticCodes,
      staticAliases,
      dynamicCodes,
      dynamicAliases: dynamicAliasMap,
      effectiveCodes: Array.from(new Set([...staticCodes, ...dynamicCodes])),
      dynamicCollections: dynamicCols
    };
  }

  /**
   * Checks if a proposed code or alias collides with ANY static or dynamic entry.
   * @param {string} proposedCode
   * @param {string[]|string} proposedAliases
   * @param {string|null} ignoreId - ID of collection being updated (to avoid self-collision)
   */
  async validateCollision(proposedCode, proposedAliases = [], ignoreId = null) {
    if (!proposedCode || typeof proposedCode !== "string") {
      throw new Error("Código canônico da coleção é obrigatório.");
    }

    const cleanCode = proposedCode.trim().toUpperCase();

    // Normalize proposed aliases
    const cleanAliases = Array.isArray(proposedAliases)
      ? proposedAliases.map(a => String(a).trim().toUpperCase()).filter(Boolean)
      : typeof proposedAliases === "string"
      ? proposedAliases.split(",").map(a => a.trim().toUpperCase()).filter(Boolean)
      : [];

    const effective = await this.getEffectiveRegistry();

    // 1. Check collision with Static Canonical Codes
    if (effective.staticCodes.includes(cleanCode)) {
      const err = new Error(`O código "${cleanCode}" já pertence ao registro estático (built-in).`);
      err.isCollision = true;
      err.collisionType = "STATIC_CODE_COLLISION";
      err.existingEntity = { code: cleanCode, registrySource: "STATIC" };
      throw err;
    }

    // 2. Check collision with Static Aliases
    if (effective.staticAliases[cleanCode]) {
      const targetCode = effective.staticAliases[cleanCode];
      const err = new Error(`O código "${cleanCode}" é um alias reservado para a coleção estática "${targetCode}".`);
      err.isCollision = true;
      err.collisionType = "STATIC_ALIAS_COLLISION";
      err.existingEntity = { code: targetCode, registrySource: "STATIC" };
      throw err;
    }

    // 3. Check collision with Dynamic Canonical Codes
    for (const col of effective.dynamicCollections) {
      if (ignoreId && (col.id === ignoreId || col.code === ignoreId)) continue;
      const colCode = (col.code || "").toUpperCase();
      if (colCode === cleanCode) {
        const err = new Error(`O código "${cleanCode}" já pertence a outra coleção cadastrada ("${col.name}").`);
        err.isCollision = true;
        err.collisionType = "DYNAMIC_CODE_COLLISION";
        err.existingEntity = col;
        throw err;
      }
    }

    // 4. Check collision with Dynamic Aliases
    for (const col of effective.dynamicCollections) {
      if (ignoreId && (col.id === ignoreId || col.code === ignoreId)) continue;

      const aliases = Array.isArray(col.aliases)
        ? col.aliases
        : typeof col.aliases === "string"
        ? col.aliases.split(",").map(a => a.trim().toUpperCase())
        : [];

      if (aliases.includes(cleanCode)) {
        const err = new Error(`O código "${cleanCode}" é um alias registrado para a coleção "${col.name}" (${col.code}).`);
        err.isCollision = true;
        err.collisionType = "DYNAMIC_ALIAS_COLLISION";
        err.existingEntity = col;
        throw err;
      }
    }

    // 5. Check if any proposed alias collides with static or dynamic codes/aliases
    for (const alias of cleanAliases) {
      if (effective.staticCodes.includes(alias)) {
        const err = new Error(`O alias "${alias}" colide com o código canônico estático "${alias}".`);
        err.isCollision = true;
        err.collisionType = "ALIAS_STATIC_CODE_COLLISION";
        err.existingEntity = { code: alias, registrySource: "STATIC" };
        throw err;
      }

      if (effective.staticAliases[alias]) {
        const targetCode = effective.staticAliases[alias];
        const err = new Error(`O alias "${alias}" colide com um alias reservado para "${targetCode}".`);
        err.isCollision = true;
        err.collisionType = "ALIAS_STATIC_ALIAS_COLLISION";
        err.existingEntity = { code: targetCode, registrySource: "STATIC" };
        throw err;
      }

      for (const col of effective.dynamicCollections) {
        if (ignoreId && (col.id === ignoreId || col.code === ignoreId)) continue;
        const colCode = (col.code || "").toUpperCase();
        if (colCode === alias) {
          const err = new Error(`O alias "${alias}" colide com o código da coleção dinâmica "${col.name}" (${colCode}).`);
          err.isCollision = true;
          err.collisionType = "ALIAS_DYNAMIC_CODE_COLLISION";
          err.existingEntity = col;
          throw err;
        }
      }
    }

    return { valid: true };
  }

  /**
   * Code Auto-Suggestion ("Sugerir Código")
   * Formats a unique canonical collection code based on Name and Category/Bank.
   * e.g. "Dandadan", "COL-01" -> "COL-01-DAN"
   * e.g. if COL-01-DAN exists -> "COL-01-DAN1"
   */
  async suggestCollectionCode(name = "", collectionType = "COL-01") {
    const rawName = String(name || "").trim();
    if (!rawName) return "COL-01-NEW";

    // Standardize category prefix (e.g. "COL-01", "COL-02", "COL-03")
    let prefix = "COL-01";
    if (typeof collectionType === "string") {
      const match = collectionType.match(/^COL-\d{2}/i);
      if (match) {
        prefix = match[0].toUpperCase();
      } else if (collectionType.toLowerCase().includes("game") || collectionType.toLowerCase().includes("jogo")) {
        prefix = "COL-02";
      } else if (collectionType.toLowerCase().includes("comic") || collectionType.toLowerCase().includes("hero")) {
        prefix = "COL-03";
      } else if (collectionType.toLowerCase().includes("anim") || collectionType.toLowerCase().includes("desenho")) {
        prefix = "COL-04";
      } else if (collectionType.toLowerCase().includes("mito") || collectionType.toLowerCase().includes("lenda")) {
        prefix = "COL-05";
      } else if (collectionType.toLowerCase().includes("hist")) {
        prefix = "COL-06";
      }
    }

    // Extract suffix initials or key uppercase letters (e.g. Dandadan -> DAN)
    const words = rawName.split(/\s+/).filter(Boolean);
    let suffix = "";

    if (words.length === 1) {
      const word = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      suffix = word.length <= 4 ? word : word.substring(0, 3);
    } else if (words.length === 2) {
      suffix = words.map(w => w.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase()).join("");
      if (suffix.length < 3) {
        const secondWord = words[1].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        suffix = (words[0].charAt(0) + secondWord.substring(0, 2)).toUpperCase();
      }
    } else {
      suffix = words.slice(0, 4).map(w => w.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase()).join("");
    }

    if (!suffix) suffix = "GEN";

    let candidate = `${prefix}-${suffix}`;
    const effective = await this.getEffectiveRegistry();

    // If collision exists, iterate with suffix counters
    let counter = 1;
    while (
      effective.effectiveCodes.includes(candidate) ||
      effective.staticAliases[candidate] ||
      effective.dynamicAliases[candidate]
    ) {
      candidate = `${prefix}-${suffix}${counter}`;
      counter++;
    }

    return candidate;
  }

  /**
   * Checks if editing canonicalCode is allowed for a collection code.
   * Returns { allowed: boolean, reason?: string }
   */
  async canEditCanonicalCode(collectionCode, entityCounts = null) {
    if (!collectionCode) return { allowed: false, reason: "Código de coleção inválido." };
    const cleanCode = collectionCode.trim().toUpperCase();

    // Static collections cannot be renamed
    if (CANONICAL_COLLECTION_CODES.includes(cleanCode)) {
      return {
        allowed: false,
        reason: "Coleções do registro estático (built-in) não podem ter seu código canônico alterado."
      };
    }

    // Check associated entities
    let counts = entityCounts;
    if (!counts) {
      const cards = (await db.entities.Card.list(null, 5000)) || [];
      const items = (await db.entities.Item.list(null, 5000)) || [];
      const bosses = (await db.entities.Boss.list(null, 5000)) || [];

      const colCards = cards.filter(c => (c.collection_id || c.collection_code) === cleanCode);
      const colItems = items.filter(i => (i.collection_id || i.collection_code) === cleanCode);
      const colBosses = bosses.filter(b => (b.collection_id || b.collection_code) === cleanCode);

      counts = {
        cards: colCards.length,
        items: colItems.length,
        bosses: colBosses.length,
        total: colCards.length + colItems.length + colBosses.length
      };
    }

    if (counts.total > 0) {
      return {
        allowed: false,
        reason: "O código canônico de uma coleção não pode ser alterado após o cadastro de entidades associadas."
      };
    }

    return { allowed: true };
  }

  /**
   * Checks if deleting a collection is allowed.
   * Returns { allowed: boolean, reason?: string }
   */
  async canDeleteCollection(collectionCode, entityCounts = null) {
    if (!collectionCode) return { allowed: false, reason: "Código de coleção inválido." };
    const cleanCode = collectionCode.trim().toUpperCase();

    // Static collections cannot be deleted
    if (CANONICAL_COLLECTION_CODES.includes(cleanCode)) {
      return {
        allowed: false,
        reason: "Coleções do registro estático (built-in) não podem ser excluídas do registro canônico."
      };
    }

    // Check associated entities
    let counts = entityCounts;
    if (!counts) {
      const cards = (await db.entities.Card.list(null, 5000)) || [];
      const items = (await db.entities.Item.list(null, 5000)) || [];
      const bosses = (await db.entities.Boss.list(null, 5000)) || [];

      const colCards = cards.filter(c => (c.collection_id || c.collection_code) === cleanCode);
      const colItems = items.filter(i => (i.collection_id || i.collection_code) === cleanCode);
      const colBosses = bosses.filter(b => (b.collection_id || b.collection_code) === cleanCode);

      counts = {
        cards: colCards.length,
        items: colItems.length,
        bosses: colBosses.length,
        total: colCards.length + colItems.length + colBosses.length
      };
    }

    if (counts.total > 0) {
      return {
        allowed: false,
        reason: "Esta coleção possui entidades associadas."
      };
    }

    return { allowed: true };
  }
}

export const collectionRegistryService = new CollectionRegistryService();
export default collectionRegistryService;
