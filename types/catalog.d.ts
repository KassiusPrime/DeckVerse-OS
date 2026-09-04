export type CatalogEntityType = 'character' | 'boss' | 'item';

export interface CatalogCollection {
  id: string;
  name: string;
  synopsis: string;
  description?: string;
  category?: string;
  cover_url?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface CatalogCard {
  id: string;
  collection_id: string;
  name: string;
  entity_type: CatalogEntityType;
  synopsis: string;
  description?: string;
  rarity?: string;
  role?: string;
  image_url?: string;
  is_active?: boolean;
  is_gacha_enabled?: boolean;
}

export interface CatalogForm {
  id: string;
  card_id: string;
  name: string;
  synopsis: string;
  description?: string;
  rarity?: string;
  image_url?: string;
  order_index?: number;
  is_active?: boolean;
}

/**
 * Combat-stat fields are intentionally absent. Catalog entities are lore-first
 * collectibles; numeric combat progression is not part of their public contract.
 */
export type PublicCatalogSnapshot = {
  collections: CatalogCollection[];
  cards: CatalogCard[];
  forms: CatalogForm[];
};
