// DeckVerse OS — lore-first validation and normalization schemas.
import { resolveCollectionCode, inferCollectionCode } from './collectionCodes.js';
import { validateAgainstSchema } from '../src/data/franchiseSchemas.js';
import { assertSynopsis, stripRetiredEntityStats } from '../src/utils/catalogSynopsisPolicy.js';

export const DATA_SCHEMA_VERSION = 11;

export const INVALID_CARD_NAME_PATTERNS = [
  /^hero(es)?$/i, /^antiguidade(\s+cl[áa]ssica)?$/i, /^mitologia(\s+(grega|n[óo]rdica|romana|eg[íi]pcia))?$/i,
  /^(epis[óo]dio|episode)\s*\d*/i, /^(temporada|season)\s*\d*/i, /^(cap[íi]tulo|chapter)\s*\d*/i,
  /^(cole[çc][ãa]o|collection|franquia|franchise|universo|universe)$/i, /^(category|categoria|template|predefini[çc][ãa]o):/i,
  /^(lista\s+de|list\s+of)/i, /^vol(ume)?\b/i,
];

export function isNonCharacterName(name = '') {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  return trimmed.length < 1 || INVALID_CARD_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function normalizeCode(rawCode = '') {
  if (typeof rawCode !== 'string') return 'COL-00-MULTI';
  return resolveCollectionCode(rawCode);
}

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}
function synopsisOrError(input, kind, errors) {
  try { return assertSynopsis(input?.synopsis, kind); }
  catch (error) { errors.push(`Sinopse ${kind} deve respeitar o limite editorial definido.`); return text(input?.synopsis); }
}

export function validateCollection(input = {}) {
  const errors = [];
  if (!input || typeof input !== 'object') return { ok: false, data: null, errors: ['Payload de coleção inválido (não é objeto).'] };
  const name = text(input.name);
  const rawCode = input.code || input.id || input.slug || name;
  if (!name) errors.push('Nome da coleção é obrigatório.');
  if (!rawCode) errors.push('Código da coleção é obrigatório.');
  const synopsis = synopsisOrError(input, 'collection', errors);
  if (errors.length) return { ok: false, data: null, errors };
  const code = normalizeCode(rawCode);
  return {
    ok: true,
    data: {
      code, name, synopsis, description: text(input.description),
      image_url: text(input.image_url) || text(input.banner), type: text(input.type) || 'franchise',
      aliases: list(input.aliases).map((entry) => entry.toUpperCase()), category: input.category || input.bank || '',
      registrySource: input.registrySource || undefined, dataSchemaVersion: DATA_SCHEMA_VERSION,
    }, errors: [],
  };
}

export function validateCard(input = {}) {
  const errors = [];
  if (!input || typeof input !== 'object') return { ok: false, data: null, errors: ['Payload de carta inválido.'] };
  const cleanInput = stripRetiredEntityStats(input);
  const name = text(cleanInput.name);
  if (!name) errors.push('Nome da carta é obrigatório.');
  else if (isNonCharacterName(name)) errors.push(`"${name}" é um termo de Coleção/Episódio/Categoria e não um personagem válido.`);
  const collection_id = resolveCollectionCode(inferCollectionCode(cleanInput));
  const entity_type = String(cleanInput.entity_type || cleanInput.entityType || (cleanInput.is_boss ? 'boss' : 'character')).toLowerCase();
  const kind = entity_type === 'boss' ? 'boss' : entity_type === 'item' ? 'item' : 'character';
  const synopsis = synopsisOrError(cleanInput, kind, errors);
  if (errors.length) return { ok: false, data: null, errors };

  let card_id = text(cleanInput.card_id);
  if (!card_id) card_id = `${collection_id}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10)}-${Math.floor(100 + Math.random() * 899)}`;
  const rarity = text(cleanInput.rarity).toUpperCase();
  const role = text(cleanInput.role);
  const img_oficial = text(cleanInput.img_oficial);
  const image_url = text(cleanInput.image_url) || img_oficial;
  const img_custom = text(cleanInput.img_custom);
  const lore = text(cleanInput.lore) || text(cleanInput.description);
  const tags = list(cleanInput.tags);
  const natures = list(cleanInput.natures || cleanInput.nature || cleanInput.element);
  const personalities = list(cleanInput.personalities || cleanInput.personality);
  const power_origins = list(cleanInput.power_origins || cleanInput.power_origin || cleanInput.origin);
  const classifications = cleanInput.classifications || {};
  const personality = personalities.join(', ') || text(classifications.personality);
  const identity = text(cleanInput.identity) || text(classifications.identity);
  const origin = power_origins.join(', ') || text(classifications.origin);
  const narrative_function = text(cleanInput.narrative_function) || text(classifications.narrative_function);
  const character_class = text(cleanInput.character_class) || text(classifications.character_class);
  const power_type = text(cleanInput.power_type) || text(classifications.power_type);

  const schemaRes = validateAgainstSchema({ ...cleanInput, name, card_id, collection_id, synopsis, tags }, { mode: 'soft' });
  const franchise_fields = schemaRes.data?.franchise_fields || {};
  const canonical = { name, species: cleanInput.species || cleanInput.race || '', franchise: collection_id, series: cleanInput.series || '', aliases: list(cleanInput.aliases), synopsis, biography: lore, lore, img_oficial: img_oficial || image_url, image_url: image_url || img_oficial };

  return {
    ok: true,
    data: stripRetiredEntityStats({
      dataSchemaVersion: DATA_SCHEMA_VERSION, canonical,
      gameplay: { rarity, role, affinity: natures[0] || text(cleanInput.element), is_boss: entity_type === 'boss' },
      name, card_id, collection_id, entity_type, schema_code: schemaRes.schema_code || 'MULTI', franchise_fields, ...franchise_fields,
      rarity, role, synopsis, img_oficial: img_oficial || image_url, image_url: image_url || img_oficial, img_custom,
      lore, description: text(cleanInput.description) || lore, tags, is_boss: entity_type === 'boss', version: text(cleanInput.version),
      character_version_id: text(cleanInput.character_version_id), natures, nature: natures.join(', '), element: natures[0] || undefined,
      personalities, personality, power_origins, power_origin: power_origins.join(', ') || origin,
      identity, origin, narrative_function, character_class, power_type,
      quality_score: Number.isFinite(cleanInput.quality_score) ? cleanInput.quality_score : (image_url ? 80 : 45),
      status: cleanInput.status || 'valid', last_sync: cleanInput.last_sync || new Date().toISOString(),
      last_validation: cleanInput.last_validation || new Date().toISOString(), data_source: cleanInput.data_source || 'Curadoria canônica DeckVerse',
      rejection_reason: text(cleanInput.rejection_reason),
    }),
    errors: [], warnings: schemaRes.warnings || [],
  };
}

export function validateItem(input = {}) {
  return validateCard({ ...stripRetiredEntityStats(input), entity_type: 'item', role: input.role || '' });
}

export function validateBoss(input = {}) {
  return validateCard({ ...stripRetiredEntityStats(input), entity_type: 'boss', is_boss: true });
}
