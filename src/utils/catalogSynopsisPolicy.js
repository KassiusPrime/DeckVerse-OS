export const SYNOPSIS_LIMITS = Object.freeze({
  character: Object.freeze({ min: 220, max: 260 }),
  form: Object.freeze({ min: 180, max: 220 }),
  boss: Object.freeze({ min: 250, max: 300 }),
  item: Object.freeze({ min: 200, max: 240 }),
  collection: Object.freeze({ min: 350, max: 400 }),
});

// Numeric combat/power fields are retired from every collectible entity payload.
export const RETIRED_ENTITY_STAT_FIELDS = Object.freeze([
  'atk', 'attack', 'def', 'defense', 'hp', 'mag', 'magic', 'speed', 'spd',
  'power', 'power_level', 'powerLevel', 'pwr', 'strength', 'resistance',
  'intelligence', 'strategy', 'energy', 'precision', 'control', 'versatility',
  'potential', 'experience', 'atk_bonus', 'def_bonus', 'hp_bonus', 'spd_bonus',
  'attack_bonus', 'defense_bonus', 'speed_bonus', 'power_bonus', 'stats',
]);

export function stripRetiredEntityStats(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const clean = { ...input };
  for (const key of RETIRED_ENTITY_STAT_FIELDS) delete clean[key];
  if (clean.gameplay && typeof clean.gameplay === 'object') {
    clean.gameplay = { ...clean.gameplay };
    delete clean.gameplay.stats;
  }
  return clean;
}

export function synopsisKind(entity = {}, explicitKind = '') {
  if (explicitKind) return explicitKind;
  const type = String(entity.entity_type || entity.entityType || entity.type || '').toLowerCase();
  if (type === 'collection') return 'collection';
  if (type === 'form' || entity.form_id || entity.formId) return 'form';
  if (type === 'boss' || entity.is_boss) return 'boss';
  if (type === 'item') return 'item';
  return 'character';
}

export function synopsisLengthStatus(value, kind) {
  const text = String(value || '').trim();
  const limits = SYNOPSIS_LIMITS[kind] || SYNOPSIS_LIMITS.character;
  const length = [...text].length;
  return {
    kind,
    length,
    min: limits.min,
    max: limits.max,
    valid: length >= limits.min && length <= limits.max,
    missing: length === 0,
  };
}

export function assertSynopsis(value, kind) {
  const status = synopsisLengthStatus(value, kind);
  if (!status.valid) {
    const error = new Error(`SYNOPSIS_LENGTH_${kind.toUpperCase()}:${status.length}:${status.min}-${status.max}`);
    error.code = 'SYNOPSIS_LENGTH';
    error.details = status;
    throw error;
  }
  return String(value).trim();
}

export function getPublicSynopsis(entity = {}) {
  return String(entity.synopsis || '').trim();
}

export default {
  SYNOPSIS_LIMITS,
  RETIRED_ENTITY_STAT_FIELDS,
  stripRetiredEntityStats,
  synopsisKind,
  synopsisLengthStatus,
  assertSynopsis,
  getPublicSynopsis,
};
