// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Phase 3 Dynamic Collection Registry Tests & Certification
// Verifies Effective Registry, collision safety, static immutability,
// code auto-suggestion, media manager integration, persistence reinitialization,
// transaction safety, exact entity keys, importService regression, and deletion protections.
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "../core/entityRepository.js";
import { adminController } from "../core/adminController.js";
import { collectionRegistryService } from "../services/registry/collectionRegistryService.js";
import { resolveCollectionCodeStrict, resolveCollectionCode } from "../lib/collectionCodes.js";
import { parseMediaFilename } from "../services/media/mediaFilenameParser.js";
import { matchMediaEntity } from "../services/media/mediaEntityMatcher.js";
import { importService } from "../core/importService.js";
import { createEntityKey } from "../src/utils/entityIdentity.js";
import { db } from "../deckverseClient.js";

async function runDynamicRegistryTests() {
  console.log("🧪 [TEST] Iniciando testes da Phase 3 — Dynamic Collection Registry Certification...\n");
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failCount++;
      process.exitCode = 1;
    }
  }

  try {
    // 📌 Teste 1: Sugestão Automática de Código ("Sugerir Código")
    console.log("📌 Teste 1: Auto-Sugestão de Códigos Canônicos");
    const codeDandadan = await collectionRegistryService.suggestCollectionCode("Dandadan", "COL-01");
    assert(codeDandadan === "COL-01-DAN", `Sugestão para 'Dandadan' gerou '${codeDandadan}' (esperado: COL-01-DAN)`);

    const codeCyberpunk = await collectionRegistryService.suggestCollectionCode("Cyberpunk 2077", "COL-02");
    assert(codeCyberpunk.startsWith("COL-02-"), `Sugestão para 'Cyberpunk 2077' possui prefixo COL-02 (${codeCyberpunk})`);

    // 📌 Teste 2: Criação e Registro de Coleção Dinâmica com Aliases Curtos e Completos
    console.log("\n📌 Teste 2: Criação de Nova Coleção Dinâmica com Aliases Curtos e Completos");
    const newCol = await adminController.saveCollection({
      name: "Dandadan",
      code: "COL-01-DAN",
      category: "COL-01 Anime/Mangá",
      description: "Momo Ayase, Okarun e eventos paranormais/alienígenas.",
      aliases: ["DAN", "COL-01-DANDADAN", "DANDADAN_MANGA"]
    });

    assert(newCol.code === "COL-01-DAN", `Coleção salva com código 'COL-01-DAN'`);
    assert(newCol.registrySource === "DYNAMIC", `registrySource é 'DYNAMIC'`);

    // 📌 Teste 3: Resolutores Canônicos (Estrito, Curto e Completo) + Ambiguidades
    console.log("\n📌 Teste 3: Resolução Estrita da Coleção Dinâmica e Aliases");
    const resolvedStrict = resolveCollectionCodeStrict("COL-01-DAN");
    assert(resolvedStrict === "COL-01-DAN", `resolveCollectionCodeStrict('COL-01-DAN') resolveu para 'COL-01-DAN'`);

    const resolvedShortAlias = resolveCollectionCodeStrict("DAN");
    assert(resolvedShortAlias === "COL-01-DAN", `Alias curto 'DAN' resolveu estritamente para 'COL-01-DAN'`);

    const resolvedFullAlias = resolveCollectionCodeStrict("COL-01-DANDADAN");
    assert(resolvedFullAlias === "COL-01-DAN", `Alias completo 'COL-01-DANDADAN' resolveu estritamente para 'COL-01-DAN'`);

    const resolvedNormal = resolveCollectionCode("COL-01-DAN");
    assert(resolvedNormal === "COL-01-DAN", `resolveCollectionCode('COL-01-DAN') resolveu para 'COL-01-DAN'`);

    // Teste de alias curto ambíguo (2 coleções compartilhando alias)
    await db.entities.Collection.create({ id: "col_amb1", name: "Amb1", code: "COL-01-AMB1", aliases: ["DUPL_ALIAS"], registrySource: "DYNAMIC" });
    await db.entities.Collection.create({ id: "col_amb2", name: "Amb2", code: "COL-01-AMB2", aliases: ["DUPL_ALIAS"], registrySource: "DYNAMIC" });
    await collectionRegistryService.getDynamicCollections();
    const resolvedAmbiguous = resolveCollectionCodeStrict("DUPL_ALIAS");
    assert(resolvedAmbiguous === null, `Alias curto ambíguo compartilhado 'DUPL_ALIAS' retorna null (bloqueado/não arbitrário)`);

    // Limpar coleções de teste de ambiguidade
    await db.entities.Collection.delete("col_amb1");
    await db.entities.Collection.delete("col_amb2");
    await collectionRegistryService.getDynamicCollections();

    // 📌 Teste 4: Reinitialization & Persistence Proof
    console.log("\n📌 Teste 4: Teste de Re-inicialização e Persistência do Registro Dinâmico");
    await collectionRegistryService.getDynamicCollections(); // Força recarga do repositório
    const resolvedAfterReinit = resolveCollectionCodeStrict("DAN");
    assert(resolvedAfterReinit === "COL-01-DAN", `Após re-inicialização do serviço, alias 'DAN' continua resolvendo para 'COL-01-DAN'`);

    // 📌 Teste 5: Effective Registry Merging e Fontes
    console.log("\n📌 Teste 5: Effective Registry (Estático + Dinâmico)");
    const collections = await adminController.getAllCollections();
    const staticCol = collections.find(c => c.code === "COL-01-AOT");
    const dynamicCol = collections.find(c => c.code === "COL-01-DAN");

    assert(Boolean(staticCol), `Coleção estática COL-01-AOT encontrada nas coleções ativas`);
    assert(staticCol?.registrySource === "STATIC", `COL-01-AOT possui registrySource 'STATIC'`);
    assert(Boolean(dynamicCol), `Coleção dinâmica COL-01-DAN encontrada no catálogo ativo`);
    assert(dynamicCol?.registrySource === "DYNAMIC", `COL-01-DAN possui registrySource 'DYNAMIC'`);

    // 📌 Teste 6: Safety & Transaction Rollback
    console.log("\n📌 Teste 6: Segurança de Transações e Rollback");
    // A) Falha no REGISTER (colisão de código) -> CREATE é abortado
    let registerFailsBlocked = false;
    try {
      await adminController.saveCollection({
        name: "Dandadan Duplicado",
        code: "COL-01-DAN"
      });
    } catch (e) {
      registerFailsBlocked = true;
    }
    assert(registerFailsBlocked, `Falta de validação no REGISTER aborta criação e não altera banco`);

    // B) Simular falha de persistência após validação do REGISTER
    const originalCreate = db.entities.Collection.create;
    let createErrorThrown = false;
    db.entities.Collection.create = async () => {
      throw new Error("Simulated storage write error during collection create");
    };

    try {
      await adminController.saveCollection({
        name: "Coleção Falha Persistência",
        code: "COL-01-FAILWRITE"
      });
    } catch (e) {
      createErrorThrown = e.message.includes("Simulated storage write error");
    } finally {
      db.entities.Collection.create = originalCreate;
    }

    assert(createErrorThrown, `Falha de persistência no DB propaga erro corretamente`);
    assert(resolveCollectionCodeStrict("COL-01-FAILWRITE") === null, `Registro para 'COL-01-FAILWRITE' foi revertido/ausente após falha de gravação`);

    // 📌 Teste 7: Validação Estrita de Identidade Canonical (EntityKeys)
    console.log("\n📌 Teste 7: Validação de Identidades Canônicas (entityKey)");
    const momoCardRes = await adminController.saveCard({
      name: "Momo Ayase",
      collection_id: "COL-01-DAN",
      rarity: "SSR",
      entityType: "character",
      version: ""
    });
    const momoObj = momoCardRes.card || momoCardRes;
    const momoKey = createEntityKey({ ...momoObj, version: "" });
    assert(momoKey === "COL-01-DAN::character::momo_ayase", `Character entityKey gerado exatamente: ${momoKey}`);

    const itemDan = await entityRepository.saveItem({
      name: "Orbe Espiritual",
      collection_id: "COL-01-DAN",
      rarity: "SR",
      entityType: "item"
    });
    const itemKey = createEntityKey(itemDan);
    assert(itemKey === "COL-01-DAN::item::orbe_espiritual", `Item entityKey gerado exatamente: ${itemKey}`);

    const bossDan = await adminController.saveBoss({
      name: "Turbo Baba",
      collection_id: "COL-01-DAN",
      rarity: "BOSS",
      entityType: "boss"
    });
    const bossKey = createEntityKey(bossDan);
    assert(bossKey === "COL-01-DAN::boss::turbo_baba", `Boss entityKey gerado exatamente: ${bossKey}`);

    // Clean up entities from COL-01-DAN for further testing
    await adminController.deleteCard(momoObj.id || momoObj.card_id);
    await entityRepository.deleteItem(itemDan.id);
    await entityRepository.deleteBoss(bossDan.id || bossDan.card_id);

    // 📌 Teste 8: Detecção e Bloqueio Rigoroso de Colisão
    console.log("\n📌 Teste 8: Detecção e Bloqueio Rigoroso de Colisão");
    let staticCodeBlocked = false;
    try {
      await adminController.saveCollection({
        name: "AOT Fake",
        code: "COL-01-AOT"
      });
    } catch (e) {
      staticCodeBlocked = e.isCollision || e.message.includes("registro estático");
    }
    assert(staticCodeBlocked, `Tentativa de criar coleção com código estático 'COL-01-AOT' foi bloqueada`);

    let aliasCollisionBlocked = false;
    try {
      await adminController.saveCollection({
        name: "Demon Slayer Fake",
        code: "COL-01-KNY"
      });
    } catch (e) {
      aliasCollisionBlocked = e.isCollision || e.message.includes("alias");
    }
    assert(aliasCollisionBlocked, `Tentativa de criar coleção com alias reservado 'COL-01-KNY' foi bloqueada`);

    // 📌 Teste 9: Auto-Sugestão Incrementa Sufixo se Houver Colisão
    console.log("\n📌 Teste 9: Auto-Sugestão Incrementa Sufixo se Houver Colisão");
    const codeDandadan2 = await collectionRegistryService.suggestCollectionCode("Dandadan", "COL-01");
    assert(codeDandadan2 === "COL-01-DAN1", `Segunda sugestão para 'Dandadan' gerou 'COL-01-DAN1' evitando 'COL-01-DAN'`);

    // 📌 Teste 10: Proteções do Registro Estático (Imutabilidade & Exclusão)
    console.log("\n📌 Teste 10: Imutabilidade e Proteção de Exclusão do Registro Estático");
    let staticDeleteBlocked = false;
    try {
      await adminController.deleteCollection("COL-01-AOT");
    } catch (e) {
      staticDeleteBlocked = e.message.includes("registro estático") || e.message.includes("built-in");
    }
    assert(staticDeleteBlocked, `Exclusão de coleção estática 'COL-01-AOT' foi expressamente BLOQUEADA`);

    const canEditStatic = await collectionRegistryService.canEditCanonicalCode("COL-01-AOT");
    assert(!canEditStatic.allowed, `Edição de código canônico da coleção estática foi BLOQUEADA`);

    // 📌 Teste 11: Exclusão Limpa e Consistência de Cache/Estado
    console.log("\n📌 Teste 11: Consistência Total na Exclusão de Coleção Dinâmica");
    const delCol = await adminController.saveCollection({
      name: "Coleção Teste Exclusão",
      code: "COL-01-DELTEST",
      category: "COL-01"
    });

    assert(Boolean(await entityRepository.getCollectionById("COL-01-DELTEST")), `Coleção 'COL-01-DELTEST' existe no repositório antes da exclusão`);
    assert(resolveCollectionCodeStrict("COL-01-DELTEST") === "COL-01-DELTEST", `Resolver reconhece 'COL-01-DELTEST' antes da exclusão`);

    const delRes = await adminController.deleteCollection("COL-01-DELTEST");
    assert(delRes.success, `Exclusão de coleção dinâmica vazia executada com sucesso`);

    const repoRecordAfter = await entityRepository.getCollectionById("COL-01-DELTEST");
    const dynamicRegistryAfter = await collectionRegistryService.getDynamicCollections();
    const effectiveRegistryAfter = await collectionRegistryService.getEffectiveRegistry();
    const strictResolverAfter = resolveCollectionCodeStrict("COL-01-DELTEST");
    const adminListAfter = await adminController.getAllCollections();

    assert(repoRecordAfter === null, `Repository record ausente após exclusão`);
    assert(!dynamicRegistryAfter.some(c => c.code === "COL-01-DELTEST"), `Entrada removida do registro dinâmico`);
    assert(!effectiveRegistryAfter.effectiveCodes.includes("COL-01-DELTEST"), `Entrada removida do registro efetivo`);
    assert(strictResolverAfter === null, `Resolutor estrito retorna null após exclusão`);
    assert(!adminListAfter.some(c => c.code === "COL-01-DELTEST"), `Entrada removida da lista de coleções do Admin`);

    // 📌 Teste 12: Integração com Media Manager e Media Matcher
    console.log("\n📌 Teste 12: Reconhecimento do Media Manager e Matcher para Coleções Dinâmicas");
    const mediaParse = parseMediaFilename("COL-01-DAN__collection__cover.jpg");
    assert(mediaParse.valid, `Parser validou arquivo da coleção dinâmica`);
    assert(mediaParse.collectionCodeCanonical === "COL-01-DAN", `Parser identificou código canônico 'COL-01-DAN'`);

    const momoCard2 = await adminController.saveCard({
      name: "Momo Ayase",
      collection_id: "COL-01-DAN",
      rarity: "SSR"
    });

    const charMediaParse = parseMediaFilename("COL-01-DAN__character__momo_ayase.jpg");
    assert(charMediaParse.valid, `Parser validou mídia de personagem da coleção dinâmica`);

    const activeCatalog = {
      collections: await adminController.getAllCollections(),
      cards: await adminController.getAllCards()
    };
    const matchResult = matchMediaEntity(charMediaParse, activeCatalog);
    assert(matchResult.matchStatus === "MATCHED", `Media Matcher relacionou mídia à entidade 'Momo Ayase' na coleção dinâmica`);

    // Clean up momoCard2
    await adminController.deleteCard((momoCard2.card || momoCard2).id);

    // 📌 Teste 13: Busca Global no Catálogo do Admin Console
    console.log("\n📌 Teste 13: Busca Global no Catálogo para Coleção Dinâmica");
    const searchRes = await adminController.searchCatalog("Dandadan");
    const foundCol = searchRes.collections.find(c => c.code === "COL-01-DAN");
    assert(Boolean(foundCol), `Busca global no catálogo encontrou 'Dandadan'`);
    assert(foundCol?.registrySource === "DYNAMIC", `Busca global confirmou registrySource = 'DYNAMIC'`);

    // 📌 Teste 14: Regressão do Resolutor Canônico (Demon Slayer / Dark Souls / Aliases Legados)
    console.log("\n📌 Teste 14: Invariantes do Resolutor Estrito e Aliases Legados");
    assert(resolveCollectionCodeStrict("COL-01-KNY") === "COL-01-DS", `COL-01-KNY resolve para Demon Slayer (COL-01-DS)`);
    assert(resolveCollectionCodeStrict("COL-01-DS") === "COL-01-DS", `COL-01-DS resolve para Demon Slayer (COL-01-DS)`);
    assert(resolveCollectionCodeStrict("COL-02-DS") === "COL-02-DS", `COL-02-DS resolve para Dark Souls (COL-02-DS)`);
    assert(resolveCollectionCodeStrict("COL-01-BSK") === "COL-01-BER", `COL-01-BSK resolve para Berserk (COL-01-BER)`);
    assert(resolveCollectionCodeStrict("COL-01-JJBA") === "COL-01-JOJO", `COL-01-JJBA resolve para JoJo (COL-01-JOJO)`);
    assert(resolveCollectionCodeStrict("COL-01-SLV") === "COL-01-SL", `COL-01-SLV resolve para Solo Leveling (COL-01-SL)`);
    assert(resolveCollectionCodeStrict("UNKNOWN") === null, `UNKNOWN resolve para null (nunca MULTI)`);
    assert(resolveCollectionCodeStrict("LORE-01") === null, `LORE-* resolve para null`);

    // 📌 Teste 15: Operação Real com ImportService (Garantia contra 'db is not defined')
    console.log("\n📌 Teste 15: Operação Real com ImportService (Garantia de Variáveis Globais)");
    const importedCol = await importService.importCollection({
      name: "Coleção Teste ImportService",
      code: "COL-01-IMPTST",
      category: "COL-01",
      description: "Coleção importada via pipeline de importação real"
    });
    assert(importedCol.code === "COL-01-IMPTST", `ImportService.importCollection executou sem ReferenceError`);

    const importedCardRes = await importService.importSingleCard({
      name: "Carta Teste ImportService",
      collection_id: "COL-01-IMPTST",
      rarity: "SSR"
    });
    const importedCard = importedCardRes.card || importedCardRes;
    assert(Boolean(importedCard.id || importedCard.card_id), `ImportService.importSingleCard executou sem ReferenceError`);

    // Clean up import test card FIRST, then collection
    const cardIdToDelete = importedCard.id || importedCard.card_id;
    if (cardIdToDelete) {
      await adminController.deleteCard(cardIdToDelete);
    }
    await adminController.deleteCollection("COL-01-IMPTST");

    console.log(`\n════════════════════════════════════════════════════════════════`);
    console.log(`📊 RESULTADO DOS TESTES DA PHASE 3: ${passCount} Passaram | ${failCount} Falharam`);
    console.log(`════════════════════════════════════════════════════════════════\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Erro fatal durante a execução dos testes da Phase 3:", err);
    process.exit(1);
  }
}

runDynamicRegistryTests();
