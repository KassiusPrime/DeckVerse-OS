// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Schema Validation API & Soft Validation Emitter
// ════════════════════════════════════════════════════════════════════════════

import {
  UNIVERSAL_SCHEMA,
  FRANCHISE_SCHEMAS,
  resolveSchemaCode,
  getFranchiseSchema,
  getAllSchemaFields,
  listFranchiseSchemaCodes,
  hasFranchiseSchema,
  validateAgainstSchema
} from "../src/data/franchiseSchemas.js";

const listeners = new Set();

/**
 * Registra um ouvinte de eventos de validação de schema.
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function onSchemaValidation(callback) {
  if (typeof callback === "function") {
    listeners.add(callback);
  }
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Notifica todos os ouvintes e emite CustomEvent no navegador com try/catch seguro.
 */
function notifyValidationListeners(eventDetail) {
  // 1. Ouvintes em memória
  listeners.forEach(fn => {
    try {
      fn(eventDetail);
    } catch (err) {
      console.warn("⚠️ Listener em onSchemaValidation falhou:", err);
    }
  });

  // 2. CustomEvent global para a UI
  if (typeof window !== "undefined" && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent("deckverse:schema-validation", { detail: eventDetail }));
    } catch (err) {
      console.warn("⚠️ Evento deckverse:schema-validation falhou ao despachar:", err);
    }
  }
}

/**
 * Valida uma única carta contra os schemas congelados (Universal + Franquia).
 */
export function validateCardSchema(cardInput = {}, options = { mode: "soft" }) {
  const result = validateAgainstSchema(cardInput, options);

  const eventDetail = {
    timestamp: new Date().toISOString(),
    cardName: result.data?.name || "Desconhecido",
    schemaCode: result.schema_code,
    ok: result.ok,
    errorsCount: result.errors.length,
    warningsCount: result.warnings.length,
    errors: result.errors,
    warnings: result.warnings,
    franchiseFieldsCount: Object.keys(result.data?.franchise_fields || {}).length,
    mode: result.mode
  };

  notifyValidationListeners(eventDetail);

  return result;
}

/**
 * Valida um lote de cartas.
 */
export function validateCardBatch(cardsList = [], options = { mode: "soft" }) {
  if (!Array.isArray(cardsList)) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      warningsTotal: 0,
      results: []
    };
  }

  const results = cardsList.map(card => validateCardSchema(card, options));
  const valid = results.filter(r => r.ok).length;
  const warningsTotal = results.reduce((acc, r) => acc + (r.warnings?.length || 0), 0);

  return {
    total: cardsList.length,
    valid,
    invalid: cardsList.length - valid,
    warningsTotal,
    results
  };
}

/**
 * Retorna o catálogo completo de Schemas registrados.
 */
export function getSchemaCatalog() {
  return {
    universal: UNIVERSAL_SCHEMA,
    franchises: FRANCHISE_SCHEMAS,
    codes: listFranchiseSchemaCodes(),
    totalFranchises: listFranchiseSchemaCodes().length
  };
}

/**
 * Descreve o schema de uma coleção específica.
 */
export function describeCollectionSchema(collectionId = "") {
  const schema_code = resolveSchemaCode(collectionId);
  return {
    schema_code,
    universal: UNIVERSAL_SCHEMA,
    franchise: getFranchiseSchema(schema_code),
    allFields: getAllSchemaFields(schema_code)
  };
}

export default {
  validateCardSchema,
  validateCardBatch,
  getSchemaCatalog,
  describeCollectionSchema,
  onSchemaValidation,
  resolveSchemaCode,
  getFranchiseSchema,
  listFranchiseSchemaCodes,
  hasFranchiseSchema
};
