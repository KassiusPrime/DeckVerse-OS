// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Validation & Normalization Schemas for Collections & Cards
// ════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza um código de coleção ou entidade (A-Z, 0-9, _, -)
 */
export function normalizeCode(rawCode = "") {
  if (typeof rawCode !== "string") return "COLLECTION_UNKNOWN";
  const cleaned = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  return cleaned || "COLLECTION_DEFAULT";
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
  if (!name) errors.push("Nome da carta é obrigatório.");

  const collection_id = normalizeCode(input.collection_id || input.series || input.collectionCode || "MULTIVERSE");

  let card_id = typeof input.card_id === "string" ? input.card_id.trim() : "";
  if (!card_id) {
    card_id = `${collection_id}-${name.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10)}-${Math.floor(100 + Math.random() * 899)}`;
  }

  const validRarities = ["C", "UC", "R", "SR", "SSR", "UR", "LR", "MR", "BOSS", "ANOMALIA"];
  let rarity = typeof input.rarity === "string" ? input.rarity.toUpperCase().trim() : "C";
  if (rarity === "COMMON") rarity = "C";
  if (rarity === "RARE") rarity = "SR";
  if (rarity === "EPIC") rarity = "SSR";
  if (rarity === "LEGENDARY") rarity = "UR";
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

  if (errors.length > 0) {
    return { ok: false, data: null, errors };
  }

  return {
    ok: true,
    data: {
      name,
      card_id,
      collection_id,
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
      character_version_id
    },
    errors: []
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
