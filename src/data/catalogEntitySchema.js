import { z } from 'zod';
import { SYNOPSIS_LIMITS, RETIRED_ENTITY_STAT_FIELDS, stripRetiredEntityStats } from '../utils/catalogSynopsisPolicy.js';

const boundedSynopsis = (kind) => {
  const { min, max } = SYNOPSIS_LIMITS[kind];
  return z.string().trim().min(min).max(max);
};

const base = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  image_url: z.string().optional(),
  rarity: z.string().optional(),
}).passthrough();

export const characterSchema = base.extend({
  entity_type: z.literal('character'),
  collection_id: z.string().min(1),
  synopsis: boundedSynopsis('character'),
});

export const bossSchema = base.extend({
  entity_type: z.literal('boss'),
  collection_id: z.string().min(1),
  synopsis: boundedSynopsis('boss'),
});

export const itemSchema = base.extend({
  entity_type: z.literal('item'),
  collection_id: z.string().min(1),
  synopsis: boundedSynopsis('item'),
});

export const formSchema = base.extend({
  card_id: z.string().min(1),
  synopsis: boundedSynopsis('form'),
});

export const collectionSchema = base.extend({
  synopsis: boundedSynopsis('collection'),
});

export const catalogEntitySchema = z.discriminatedUnion('entity_type', [characterSchema, bossSchema, itemSchema]);

export function parseCatalogEntity(input) {
  return catalogEntitySchema.parse(stripRetiredEntityStats(input));
}

export function containsRetiredEntityStats(input = {}) {
  if (!input || typeof input !== 'object') return false;
  return RETIRED_ENTITY_STAT_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(input, key));
}

export function assertNoRetiredEntityStats(input = {}) {
  const found = RETIRED_ENTITY_STAT_FIELDS.filter((key) => Object.prototype.hasOwnProperty.call(input, key));
  if (found.length) throw new Error(`RETIRED_ENTITY_STATS:${found.join(',')}`);
  return input;
}

export default {
  characterSchema, bossSchema, itemSchema, formSchema, collectionSchema,
  catalogEntitySchema, parseCatalogEntity, containsRetiredEntityStats, assertNoRetiredEntityStats,
};
