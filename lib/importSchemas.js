// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Validation & Normalization Schemas for Collections & Cards
// ════════════════════════════════════════════════════════════════════════════

import { resolveCollectionCode, inferCollectionCode } from './collectionCodes.js';
import { validateAgainstSchema } from '../src/data/franchiseSchemas.js';

/**
 * Padrões de termos não-personagem (Coleções, Episódios, Categorias, Franquias)
 */
export const INVALID_CARD_NAME_PATTERNS = [
  /^hero(es)?$/i,
  /^antiguidade(\s+cl[áa]ssica)?$/i,
  /^mitologia(\s+(grega|n[óo]rdica|romana|eg[íi]pcia))?$/i,
  /^(epis[óo]dio|episode)\s*\d*/i,
  /^(temporada|season)\s*\d*/i,
  /^(cap[íi]tulo|chapter)\s*\d*/i,
  /^(cole[çc][ãa]o|collection|franquia|franchise|universo|universe)$/i,
  /^(category|categoria|template|predefini[çc][ãa]o):/i,
  /^(lista\s+de|list\s+of)/i,
  /^vol(ume)?\b/i
];

export function isNonCharacterName(name = "") {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  return INVALID_CARD_NAME_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Normaliza um código de coleção ou entidade (A-Z, 0-9, _, -)
 */
export function normalizeCode(rawCode = "") {
  if (typeof rawCode !== "string") return "COL-00-MULTI";
  return resolveCollectionCode(rawCode);
}

/**
 * Normaliza um valor numérico garantindo Finito >= 0
 */

function sanitizeNumber(val, defaultVal = 0) {
  const num = Number(val);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : defaultVal;
}

/**
 * Valida e normaliza o payload de uma Collection
 */
export function validateCollection(input = {}) {
  const errors = [];

  if (!input || typeof input !== "object") {
    return { ok: false, data: null, errors: ["Payload de coleção inválido (não é objeto)."] };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rawCode = input.code || input.id || input.slug || name;

  if (!name) {
    errors.push("Nome da coleção é obrigatório.");
  }
  if (!rawCode) {
    errors.push("Código da coleção é obrigatório.");
  }

  const code = normalizeCode(rawCode);
  const description = typeof input.description === "string" ? input.description.trim() : "";

  let image_url = "";
  if (typeof input.image_url === "string" && input.image_url.trim()) {
    image_url = input.image_url.trim();
  } else if (typeof input.banner === "string" && input.banner.trim()) {
    image_url = input.banner.trim();
  }

  const type = typeof input.type === "string" ? input.type.trim() : "franchise";

  if (errors.length > 0) {
    return { ok: false, data: null, errors };
  }

  return {
    ok: true,
    data: {
      code,
      name,
      description,
      image_url,
      type
    },
    errors: []
  };
}

/**
 * Valida e normaliza o payload de uma Card
 */
export function validateCard(input = {}) {
  const errors = [];

  if (!input || typeof input !== "object") {
    return { ok: false, data: null, errors: ["Payload de carta inválido."] };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    errors.push("Nome da carta é obrigatório.");
  } else if (isNonCharacterName(name)) {
    errors.push(`"${name}" é um termo de Coleção/Episódio/Categoria e não um personagem válido.`);
  }

  const collection_id = resolveCollectionCode(inferCollectionCode(input));

  let card_id = typeof input.card_id === "string" ? input.card_id.trim() : "";
  if (!card_id) {
    card_id = `${collection_id}-${name.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10)}-${Math.floor(100 + Math.random() * 899)}`;
  }

  const validRarities = ["C", "UC", "R", "SR", "SSR", "UR", "LR", "MR", "DIV", "TRS", "BOSS", "ANOMALIA"];
  let rawRarity = typeof input.rarity === "string" ? input.rarity.toUpperCase().trim() : "C";
  const rarityMap = {
    "COMUM": "C", "COMMON": "C",
    "INCOMUM": "UC", "UNCOMMON": "UC",
    "RARO": "SR", "RARE": "SR",
    "ÉPICO": "SSR", "EPICO": "SSR", "EPIC": "SSR",
    "LENDÁRIO": "UR", "LENDARIO": "UR", "LEGENDARY": "UR",
    "MÍTICO": "MR", "MITICO": "MR", "MYTHIC": "MR",
    "DIVINO": "DIV", "DIVINE": "DIV",
    "TRANSCENDENTE": "TRS",
    "BOSS": "BOSS", "ANOMALIA": "ANOMALIA"
  };
  let rarity = rarityMap[rawRarity] || rawRarity;
  if (!validRarities.includes(rarity)) rarity = "SSR";

  const validRoles = ["DPS", "Tank", "Support", "Healer", "Assassin", "Mage", "Berserker", "Sniper"];
  let role = typeof input.role === "string" ? input.role.trim() : "DPS";
  if (!validRoles.includes(role)) role = "DPS";

  const attack = sanitizeNumber(input.attack, 75);
  const defense = sanitizeNumber(input.defense, 70);
  const speed = sanitizeNumber(input.speed, 75);
  const hp = sanitizeNumber(input.hp, attack * 4);
  const mag = sanitizeNumber(input.mag, 70);

  const img_oficial = typeof input.img_oficial === "string" ? input.img_oficial.trim() : "";
  const image_url = typeof input.image_url === "string" ? input.image_url.trim() : (img_oficial || "");
  const img_custom = typeof input.img_custom === "string" ? input.img_custom.trim() : "";

  const lore = typeof input.lore === "string" ? input.lore.trim() : "";

  // Multi Naturezas / Elements
  let natures = [];
  if (Array.isArray(input.natures)) natures = input.natures.map(n => String(n).trim()).filter(Boolean);
  else if (typeof input.natures === "string") natures = input.natures.split(",").map(n => n.trim()).filter(Boolean);
  else if (Array.isArray(input.nature)) natures = input.nature.map(n => String(n).trim()).filter(Boolean);
  else if (typeof input.nature === "string") natures = input.nature.split(",").map(n => n.trim()).filter(Boolean);
  else if (typeof input.element === "string") natures = input.element.split(",").map(n => n.trim()).filter(Boolean);

  // Multi Personalities
  let personalities = [];
  if (Array.isArray(input.personalities)) personalities = input.personalities.map(p => String(p).trim()).filter(Boolean);
  else if (typeof input.personalities === "string") personalities = input.personalities.split(",").map(p => p.trim()).filter(Boolean);
  else if (Array.isArray(input.personality)) personalities = input.personality.map(p => String(p).trim()).filter(Boolean);
  else if (typeof input.personality === "string") personalities = input.personality.split(",").map(p => p.trim()).filter(Boolean);

  // Multi Power Origins
  let power_origins = [];
  if (Array.isArray(input.power_origins)) power_origins = input.power_origins.map(po => String(po).trim()).filter(Boolean);
  else if (typeof input.power_origins === "string") power_origins = input.power_origins.split(",").map(po => po.trim()).filter(Boolean);
  else if (Array.isArray(input.power_origin)) power_origins = input.power_origin.map(po => String(po).trim()).filter(Boolean);
  else if (typeof input.power_origin === "string") power_origins = input.power_origin.split(",").map(po => po.trim()).filter(Boolean);
  else if (typeof input.origin === "string") power_origins = input.origin.split(",").map(po => po.trim()).filter(Boolean);

  // Skills validation
  let skills = [];
  if (Array.isArray(input.skills)) {
    skills = input.skills
      .filter(s => s && typeof s === "object")
      .map(s => ({
        name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : "Habilidade Especial",
        description: typeof s.description === "string" ? s.description.trim() : (typeof s.desc === "string" ? s.desc.trim() : ""),
        type: ["Active", "Passive", "Ultimate", "Ataque"].includes(s.type) ? s.type : "Active"
      }));
  }

  // Tags validation
  let tags = [];
  if (Array.isArray(input.tags)) {
    tags = input.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim());
  }

  const is_boss = Boolean(input.is_boss) || rarity === "BOSS" || rarity === "ANOMALIA";
  const version = typeof input.version === "string" && input.version.trim() ? input.version.trim() : "Wiki+IA";
  const character_version_id = typeof input.character_version_id === "string" ? input.character_version_id : "";

  // Classifications (Prompt Mestre schema)
  const classifications = input.classifications || {};
  const personality = personalities.length > 0 ? personalities.join(", ") : (typeof input.personality === "string" ? input.personality.trim() : (typeof classifications.personality === "string" ? classifications.personality.trim() : ""));
  const identity = typeof input.identity === "string" ? input.identity.trim() : (typeof classifications.identity === "string" ? classifications.identity.trim() : "");
  const origin = power_origins.length > 0 ? power_origins.join(", ") : (typeof input.origin === "string" ? input.origin.trim() : (typeof classifications.origin === "string" ? classifications.origin.trim() : ""));
  const narrative_function = typeof input.narrative_function === "string" ? input.narrative_function.trim() : (typeof classifications.narrative_function === "string" ? classifications.narrative_function.trim() : "");
  const character_class = typeof input.character_class === "string" ? input.character_class.trim() : (typeof classifications.character_class === "string" ? classifications.character_class.trim() : "");
  const power_type = typeof input.power_type === "string" ? input.power_type.trim() : (typeof classifications.power_type === "string" ? classifications.power_type.trim() : "");

  if (errors.length > 0) {
    return { ok: false, data: null, errors };
  }

  const quality_score = input.quality_score && Number.isFinite(input.quality_score) ? input.quality_score : (img_oficial || image_url ? 80 : 45);
  const status = input.status || (quality_score >= 50 ? "valid" : "quarantine");
  const last_sync = input.last_sync || new Date().toISOString();
  const last_validation = input.last_validation || new Date().toISOString();
  const data_source = input.data_source || "Fandom Wiki + Gemini IA (Canônico)";
  const rejection_reason = input.rejection_reason || (status === "quarantine" ? "Dados parciais aguardando validação do Data Quality Engine" : "");

  // Soft Schema Check
  const schemaRes = validateAgainstSchema({ ...input, name, card_id, collection_id, tags }, { mode: "soft" });
  const franchise_fields = schemaRes.data?.franchise_fields || {};
  const schema_code = schemaRes.schema_code || "MULTI";

  return {
    ok: true,
    data: {
      name,
      card_id,
      collection_id,
      schema_code,
      franchise_fields,
      ...franchise_fields,
      rarity,
      role,
      attack,
      defense,
      speed,
      hp,
      mag,
      img_oficial: img_oficial || image_url,
      image_url: image_url || img_oficial,
      img_custom,
      lore,
      skills,
      tags,
      is_boss,
      version,
      character_version_id,
      natures,
      nature: natures.join(", ") || (typeof input.element === "string" ? input.element : ""),
      element: natures[0] || (typeof input.element === "string" ? input.element : "Void"),
      personalities,
      personality,
      power_origins,
      power_origin: power_origins.join(", ") || origin,
      identity,
      origin: power_origins.join(", ") || origin,
      narrative_function,
      character_class,
      power_type,
      quality_score,
      status,
      last_sync,
      last_validation,
      data_source,
      rejection_reason
    },
    errors: [],
    warnings: schemaRes.warnings || []
  };
}

/**
 * Valida e normaliza o payload de um Item
 */
export function validateItem(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { ok: false, data: null, errors: ["Nome do item é obrigatório."] };

  const type = typeof input.type === "string" ? input.type.trim() : "Equipamento";
  const rarity = typeof input.rarity === "string" ? input.rarity.toUpperCase().trim() : "R";
  const collection_id = normalizeCode(input.collection_id || "MULTIVERSE");
  const item_code = typeof input.item_code === "string" ? input.item_code.trim() : `ITEM-${Math.floor(1000 + Math.random() * 8999)}`;
  const description = typeof input.description === "string" ? input.description.trim() : (input.effect || "");
  const image_url = typeof input.image_url === "string" ? input.image_url.trim() : "";

  return {
    ok: true,
    data: {
      name,
      type,
      rarity,
      collection_id,
      item_code,
      description,
      image_url
    },
    errors: []
  };
}

/**
 * Valida e normaliza o payload de um Boss (Card especial)
 */
export function validateBoss(input = {}) {
  const cardValidation = validateCard({
    ...input,
    is_boss: true,
    rarity: input.rarity || "BOSS"
  });

  if (!cardValidation.ok) return cardValidation;

  const data = cardValidation.data;
  data.hp = Math.max(data.hp, data.attack * 8, 2500); // Bosses tem HP massivo

  return {
    ok: true,
    data,
    errors: []
  };
}
