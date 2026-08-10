import { db } from "../deckverseClient.js";

async function checkSelectedRecords() {
  const ids = [
    { table: "Card", id: "card_col_05_grk_4", category: "character" },
    { table: "Card", id: "card_col_05_grk_5", category: "character" },
    { table: "Card", id: "card_col_05_grk_6", category: "character" },
    { table: "Item", id: "item_aot_1", category: "item" },
    { table: "Item", id: "item_ber_1", category: "item" },
    { table: "Card", id: "card_col_02_er_2", category: "boss" },
    { table: "Card", id: "card_col_02_ff_2", category: "boss" },
    { table: "Lore", id: "lore_1", category: "metadata" },
    { table: "Card", id: "card_col_02_cp77_1", category: "quarantine" },
    { table: "Collection", id: "col_naruto", category: "collection_correction" }
  ];

  for (const item of ids) {
    let rec = null;
    if (item.table === "Card") rec = await db.entities.Card.get(item.id);
    else if (item.table === "Item") rec = await db.entities.Item.get(item.id);
    else if (item.table === "Boss") rec = await db.entities.Boss.get(item.id);
    else if (item.table === "Lore") rec = await db.entities.Lore.get(item.id);
    else if (item.table === "Collection") rec = await db.entities.Collection.get(item.id);

    console.log(`[${item.category.toUpperCase()}] ${item.table} #${item.id}:`, rec ? {
      id: rec.id,
      name: rec.name || rec.title,
      type: rec.type,
      collection_id: rec.collection_id || rec.code,
      status: rec.status,
      img_custom: rec.img_custom
    } : "NOT FOUND");
  }
}

checkSelectedRecords().catch(console.error);
