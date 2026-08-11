// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Teste de Integridade do Admin Catalog Manager (Fase 2)
// Execute via: node scripts/testAdminCatalog.mjs
// ════════════════════════════════════════════════════════════════════════════

import { adminController } from "../core/adminController.js";
import { entityRepository } from "../core/entityRepository.js";
import { preflightFileList } from "../services/media/mediaImportService.js";

console.log("🧪 [TEST] Iniciando testes do Admin Catalog Manager Phase 2...\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    // 1. Initial Catalog Fetch & Dynamic Counts
    console.log("📌 Teste 1: Obtenção de Catálogo e Contagens Dinâmicas");
    const initialCollections = await adminController.getAllCollections();
    const initialCards = await adminController.getAllCards();
    const initialItems = await adminController.getAllItems();
    const initialBosses = await adminController.getAllBosses();

    assert(initialCollections.length > 0, `Coleções carregadas dinamicamente: ${initialCollections.length}`);
    assert(initialCards.length > 0, `Personagens carregados dinamicamente: ${initialCards.length}`);
    assert(initialItems.length >= 0, `Itens carregados dinamicamente: ${initialItems.length}`);
    assert(initialBosses.length >= 0, `Bosses carregados dinamicamente: ${initialBosses.length}`);

    // 2. Character Creation & Duplicate Identity Blocking
    console.log("\n📌 Teste 2: Criação de Personagem e Bloqueio de Duplicatas");
    const char1Data = {
      name: "Kratos Teste Admin",
      collection_id: "COL-01-GOW",
      rarity: "UR",
      role: "DPS"
    };

    const resChar1 = await adminController.saveCard(char1Data);
    const createdChar1 = resChar1?.card || resChar1;
    assert(Boolean(createdChar1 && createdChar1.id), `Personagem Kratos criado com id: ${createdChar1.id}`);

    // Attempt duplicate in same collection
    let duplicateBlocked = false;
    try {
      await adminController.saveCard(char1Data);
    } catch (err) {
      if (err.isCollision) duplicateBlocked = true;
    }
    assert(duplicateBlocked, "Tentativa de criar personagem duplicado na mesma coleção foi bloqueada com e.isCollision = true");

    // Allow same name in different collection
    console.log("\n📌 Teste 3: Mesma Entidade em Franquia Diferente (Cross-Collection Allowed)");
    const charDifferentCol = {
      name: "Kratos Teste Admin",
      collection_id: "COL-01-NRT",
      rarity: "SR",
      role: "DPS"
    };
    const resChar2 = await adminController.saveCard(charDifferentCol);
    const createdChar2 = resChar2?.card || resChar2;
    assert(Boolean(createdChar2 && createdChar2.id && createdChar2.id !== createdChar1.id), "Mesmo nome em coleção diferente gerou novo card sem colisão");

    // 3. Item Creation & Duplicate Blocking
    console.log("\n📌 Teste 4: Criação e Bloqueio de Duplicata de Item");
    const itemData = {
      name: "Lâmina do Caos Teste Admin",
      collection_id: "COL-01-GOW",
      type: "item",
      description: "Artefato lendário de esparta"
    };

    const createdItem = await adminController.saveItem(itemData);
    assert(Boolean(createdItem && createdItem.id), `Item salvo com id: ${createdItem.id}`);

    let itemDuplicateBlocked = false;
    try {
      await adminController.saveItem(itemData);
    } catch (err) {
      if (err.isCollision) itemDuplicateBlocked = true;
    }
    assert(itemDuplicateBlocked, "Tentativa de criar item duplicado na mesma coleção foi bloqueada");

    // 4. Boss Creation & Duplicate Blocking
    console.log("\n📌 Teste 5: Criação e Bloqueio de Duplicata de Boss");
    const bossData = {
      name: "Ares Teste Admin",
      collection_id: "COL-01-GOW",
      type: "boss",
      title: "Deus da Guerra",
      hp: 5000
    };

    const createdBoss = await adminController.saveBoss(bossData);
    assert(Boolean(createdBoss && createdBoss.id), `Boss salvo com id: ${createdBoss.id}`);

    let bossDuplicateBlocked = false;
    try {
      await adminController.saveBoss(bossData);
    } catch (err) {
      if (err.isCollision) bossDuplicateBlocked = true;
    }
    assert(bossDuplicateBlocked, "Tentativa de criar boss duplicado na mesma coleção foi bloqueada");

    // 5. Identity-changing edit collision
    console.log("\n📌 Teste 6: Colisão de Edição que Altera Identidade para Entidade Existente");
    const secondItemData = {
      name: "Machado Leviatã Teste Admin",
      collection_id: "COL-01-GOW",
      type: "item"
    };
    const createdItem2 = await adminController.saveItem(secondItemData);

    let editCollisionBlocked = false;
    try {
      // Try to rename item 2 to item 1's name
      await adminController.saveItem({
        ...createdItem2,
        name: "Lâmina do Caos Teste Admin"
      });
    } catch (err) {
      if (err.isCollision) editCollisionBlocked = true;
    }
    assert(editCollisionBlocked, "Edição alterando nome para item já existente bloqueada por colisão");

    // 6. Safe Delete & Cascade Protection
    console.log("\n📌 Teste 7: Safe Delete e Proteção contra Exclusão em Cascata");
    // Attempting delete on collection with linked items should fail
    let collectionDeleteBlocked = false;
    try {
      await adminController.deleteCollection("COL-01-GOW");
    } catch (err) {
      collectionDeleteBlocked = true;
    }
    assert(collectionDeleteBlocked, "Exclusão de coleção com entidades associadas foi BLOQUEADA (sem exclusão em cascata)");

    // Delete created test entities
    await adminController.deleteCard(createdChar1.id);
    await adminController.deleteCard(createdChar2.id);
    await adminController.deleteItem(createdItem.id);
    await adminController.deleteItem(createdItem2.id);
    await adminController.deleteBoss(createdBoss.id);

    const afterDeleteCards = await adminController.getAllCards();
    assert(!afterDeleteCards.some(c => c.id === createdChar1.id), "Exclusão individual de personagem realizada com sucesso");

    // 7. Global Search Test
    console.log("\n📌 Teste 8: Busca Global no Catálogo");
    const searchRes = await adminController.searchCatalog("Naruto");
    assert(searchRes.characters.length > 0 || searchRes.collections.length > 0, "Busca global retornou resultados agrupados por categoria");

    // 8. Create Entity from Media Preflight
    console.log("\n📌 Teste 9: Criar Entidade a partir de Mídia Unmapped e Re-check do Matcher");
    const fileInfo = {
      originalFilename: "COL-01-AOT__character__levi_ackerman_test.jpg",
      parsed: {
        collectionCodeCanonical: "COL-01-AOT",
        entityType: "character",
        targetSlug: "levi_ackerman_test"
      }
    };
    const resFromMedia = await adminController.createEntityFromMedia(fileInfo);
    const entityFromMedia = resFromMedia?.card || resFromMedia;
    assert(entityFromMedia && (entityFromMedia.name === "Levi Ackerman Test" || entityFromMedia.id), `Entidade criada a partir de arquivo de mídia: ${entityFromMedia?.name}`);

    // Re-check matcher with newly created entity
    const updatedCards = await adminController.getAllCards();
    const updatedCollections = await adminController.getAllCollections();
    const updatedItems = await adminController.getAllItems();
    const updatedBosses = await adminController.getAllBosses();

    const mockFile = new File(["test"], "COL-01-AOT__character__levi_ackerman_test.jpg", { type: "image/jpeg" });
    const preflight = preflightFileList([mockFile], {
      collections: updatedCollections,
      cards: updatedCards,
      items: updatedItems,
      bosses: updatedBosses
    });

    assert(preflight.matched === 1, "Media Matcher re-analisou e combinou (MATCHED) com a nova entidade criada");

    // Cleanup created test entity
    await adminController.deleteCard(entityFromMedia.id);

    console.log(`\n════════════════════════════════════════════════════════════════`);
    console.log(`📊 RESULTADO DOS TESTES DO ADMIN CATALOG MANAGER: ${passed} Passaram | ${failed} Falharam`);
    console.log(`════════════════════════════════════════════════════════════════\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("❌ Erro fatal nos testes do Admin Catalog Manager:", err);
    process.exit(1);
  }
}

runTests();
