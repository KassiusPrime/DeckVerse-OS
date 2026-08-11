// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Collection Management & Stats Service
// ════════════════════════════════════════════════════════════════════════════

import { db } from "@/deckverseClient";

/**
 * Recalcula estatísticas e contagem de cartas para todas as coleções do banco
 */
export async function syncAllCollectionStats() {
  const collections = await db.entities.Collection.list();
  const allCards = await db.entities.Card.list("-created_date", 5000);

  const statsMap = {};

  allCards.forEach((card) => {
    const code = (card.collection_id || card.series || "").toUpperCase();
    if (!code) return;
    if (!statsMap[code]) {
      statsMap[code] = { count: 0, ssrCount: 0, totalPower: 0 };
    }
    statsMap[code].count++;
    if (["SSR", "UR", "LR", "MR", "DIV", "TRS", "BOSS"].includes(card.rarity)) {
      statsMap[code].ssrCount++;
    }
    const power = (card.power || (card.stats?.strength || 50) + (card.stats?.energy || 50));
    statsMap[code].totalPower += power;
  });

  for (const col of collections) {
    const code = (col.code || "").toUpperCase();
    const stats = statsMap[code] || { count: 0, ssrCount: 0, totalPower: 0 };

    await db.entities.Collection.update(col.id, {
      character_count: stats.count,
      avg_power: stats.count > 0 ? Math.round(stats.totalPower / stats.count) : 0,
      last_sync: new Date().toISOString()
    });
  }

  return collections.length;
}

/**
 * Retorna banner recomendado para a coleção baseado no código
 */
export function getCollectionBanner(collectionCode, defaultImage = "") {
  return defaultImage || "/assets/placeholders/collection.svg";
}

export const collectionService = {
  syncAllCollectionStats,
  getCollectionBanner
};

export default collectionService;
