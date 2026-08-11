// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Teste de Integridade do Repositório de Entidades
// Execute via: node scripts/testRepository.mjs
// ════════════════════════════════════════════════════════════════════════════

import { createEntityKey } from "../src/utils/entityIdentity.js";
import { CANONICAL_COLLECTION_CODES, resolveCollectionCode, resolveCollectionCodeStrict } from "../lib/collectionCodes.js";
import { evaluateEntityPipeline, runDataQualityAudit } from "../services/ai/dataQualityEngine.js";
import { MEGA_COLLECTIONS } from "../src/data/megaCollectionsData.js";

console.log("🧪 [TEST] Iniciando testes do Repositório Unificado e Entity Identity...\n");

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

// Test 1: Canonical Key Generation
console.log("📌 Teste 1: Geração de Chave Canônica (createEntityKey)");
const keyNaruto = createEntityKey({ name: "Naruto Uzumaki", collection_id: "NAR", type: "character" });
const keyNarutoAlias = createEntityKey({ name: "Naruto Uzumaki", collection_id: "COL-01-NRT", type: "character" });

assert(keyNaruto === keyNarutoAlias, `Aliasing de coleção normalizado para a mesma chave: ${keyNaruto}`);
assert(keyNaruto.includes("COL-01-NRT"), `Formato de chave correto com código de coleção canônico: ${keyNaruto}`);

// Test 2: Cross-Collection Independence
console.log("\n📌 Teste 2: Independência Cross-Collection (Iguais nomes, franquias diferentes)");
const keyGokuDBZ = createEntityKey({ name: "Goku", collection_id: "DBZ", type: "character" });
const keyGokuDC = createEntityKey({ name: "Goku", collection_id: "DC", type: "character" });

assert(keyGokuDBZ !== keyGokuDC, "Mesmo nome em franquias diferentes gera chaves distintas");
assert(keyGokuDBZ.includes("COL-01-DBZ"), `DBZ resolvido para canônico COL-01-DBZ: ${keyGokuDBZ}`);
assert(keyGokuDC.includes("COL-03-DC"), `DC resolvido para canônico COL-03-DC: ${keyGokuDC}`);

// Test 3: Normalização de Aliases e Nomes Equivalentes
console.log("\n📌 Teste 3: Normalização de Aliases e Nomes Equivalentes");
const keyLuffy1 = createEntityKey({ name: "Monkey D. Luffy", collection_id: "OPC", type: "character" });
const keyLuffy2 = createEntityKey({ name: "Luffy", collection_id: "ONEPIECE", type: "character" });

assert(keyLuffy1 === keyLuffy2, `Luffy e Monkey D. Luffy mapeados para a mesma chave canônica: ${keyLuffy1}`);

// Test 4: Resolução de Coleções
console.log("\n📌 Teste 4: Resolução de Coleções");
assert(resolveCollectionCode("NAR") === "COL-01-NRT", "NAR resolve para COL-01-NRT");
assert(resolveCollectionCode("AOT") === "COL-01-AOT", "AOT resolve para COL-01-AOT");
assert(resolveCollectionCode("CYB") === "COL-02-CP77", "CYB resolve para COL-02-CP77");

// Test 5: Operações CRUD Reais no Repository Cross-Collection (Thor & Zeus)
console.log("\n📌 Teste 5: Operações CRUD Reais Cross-Collection no entityRepository");

import { entityRepository } from "../core/entityRepository.js";

async function runCrudTest() {
  // Remover potenciais Thors e Zeus pré-existentes da semente para isolamento do teste CRUD
  const allCards = await entityRepository.getAllCards();
  for (const c of allCards) {
    const nameLower = (c.name || "").toLowerCase();
    if (nameLower === "thor" || nameLower === "zeus") {
      await entityRepository.deleteCard(c.id);
    }
  }

  // 1. Inserir 3 Thors em franquias distintas
  const thorMarvel = await entityRepository.saveCard({
    id: "thor_marvel_001",
    name: "Thor",
    collection_id: "COL-03-MARVEL",
    series: "Marvel Universe",
    attack: 300,
    lore: "Deus do Trovão Marvel"
  });

  const thorGow = await entityRepository.saveCard({
    id: "thor_gow_002",
    name: "Thor",
    collection_id: "COL-12-GOW",
    series: "God of War",
    attack: 350,
    lore: "Deus do Trovão GoW"
  });

  const thorMyth = await entityRepository.saveCard({
    id: "thor_myth_003",
    name: "Thor",
    collection_id: "COL-15-MYTHOLOGY",
    series: "Norse Mythology",
    attack: 280,
    lore: "Thor Mitologia Nórdica"
  });

  assert(thorMarvel.id === "thor_marvel_001", "Thor Marvel salvo com sucesso");
  assert(thorGow.id === "thor_gow_002", "Thor GoW salvo com sucesso");
  assert(thorMyth.id === "thor_myth_003", "Thor Mitologia salvo com sucesso");

  // 2. Editar apenas Thor Marvel
  await entityRepository.saveCard({
    id: "thor_marvel_001",
    name: "Thor",
    collection_id: "COL-03-MARVEL",
    series: "Marvel Universe",
    attack: 320,
    lore: "Deus do Trovão Marvel (Editado)"
  });

  // Verificar que os outros dois permaneceram intocados
  const gowCheck = await entityRepository.getCardById("thor_gow_002");
  const mythCheck = await entityRepository.getCardById("thor_myth_003");
  const marvelCheck = await entityRepository.getCardById("thor_marvel_001");

  assert(marvelCheck.attack === 320 && marvelCheck.lore.includes("Editado"), "Thor Marvel atualizado corretamente");
  assert(gowCheck.attack === 350 && gowCheck.lore === "Deus do Trovão GoW", "Thor GoW intocado após edição do Thor Marvel");
  assert(mythCheck.attack === 280 && mythCheck.lore === "Thor Mitologia Nórdica", "Thor Mitologia intocado após edição do Thor Marvel");

  // 3. Excluir apenas Thor Marvel
  await entityRepository.deleteCard("thor_marvel_001");

  const marvelDeleted = await entityRepository.getCardById("thor_marvel_001");
  const gowStillExists = await entityRepository.getCardById("thor_gow_002");
  const mythStillExists = await entityRepository.getCardById("thor_myth_003");

  assert(marvelDeleted === null, "Thor Marvel excluído com sucesso");
  assert(gowStillExists !== null && gowStillExists.id === "thor_gow_002", "Thor GoW continua existindo após exclusão de Thor Marvel");
  assert(mythStillExists !== null && mythStillExists.id === "thor_myth_003", "Thor Mitologia continua existindo após exclusão de Thor Marvel");

  // 4. Testar Zeus (God of War vs Mitologia Grega)
  const zeusGow = await entityRepository.saveCard({
    id: "zeus_gow_001",
    name: "Zeus",
    collection_id: "COL-12-GOW",
    series: "God of War",
    attack: 400
  });

  const zeusGreek = await entityRepository.saveCard({
    id: "zeus_greek_002",
    name: "Zeus",
    collection_id: "COL-15-MYTHOLOGY",
    series: "Greek Mythology",
    attack: 380
  });

  await entityRepository.deleteCard("zeus_gow_001");

  const zeusGowDeleted = await entityRepository.getCardById("zeus_gow_001");
  const zeusGreekExists = await entityRepository.getCardById("zeus_greek_002");

  assert(zeusGowDeleted === null, "Zeus GoW excluído com sucesso");
  assert(zeusGreekExists !== null && zeusGreekExists.id === "zeus_greek_002", "Zeus Mitologia Grega permanece intacto após exclusão de Zeus GoW");

  // Teste 6: qualityService READ-ONLY (0 escritas)
  console.log("\n📌 Teste 6: qualityService.runFullDatabaseAudit() Imutabilidade (0 escritas)");
  const { qualityService } = await import("../core/qualityService.js");
  const { db } = await import("../deckverseClient.js");

  // Captura estado do storage
  const initialStorageKeysCount = globalThis.localStorage.length;
  const initialSnapshot = JSON.stringify(Array.from({ length: initialStorageKeysCount }, (_, i) => {
    const k = globalThis.localStorage.key(i);
    return [k, globalThis.localStorage.getItem(k)];
  }));

  // Executa audit completo
  await qualityService.runFullDatabaseAudit();

  const postAuditSnapshot = JSON.stringify(Array.from({ length: globalThis.localStorage.length }, (_, i) => {
    const k = globalThis.localStorage.key(i);
    return [k, globalThis.localStorage.getItem(k)];
  }));

  assert(initialSnapshot === postAuditSnapshot, "qualityService.runFullDatabaseAudit() realizou 0 escritas no storage");
}

// Test 8: Entity Keys por Tipo e Regras v10
console.log("\n📌 Teste 8: Entity Key por Tipo e Validações v10");

const keyChar = createEntityKey({ name: "Thor", collection_id: "COL-03-MARVEL", type: "character" });
assert(keyChar.includes("::character::"), `Character entityKey utiliza ::character:: (${keyChar})`);

const keyItem = createEntityKey({ name: "Equipamento DMT Tridimensional", collection_id: "COL-01-AOT", type: "item", _sourceTable: "Item" });
assert(keyItem.includes("::item::"), `Item entityKey utiliza ::item:: (${keyItem})`);

const keyBoss = createEntityKey({ name: "Malenia", collection_id: "COL-02-ER", type: "boss", _sourceTable: "Boss" });
assert(keyBoss.includes("::boss::"), `Boss entityKey utiliza ::boss:: (${keyBoss})`);

const keyMeta = createEntityKey({ name: "Genesis of the Multiverse Convergence", collection_id: "COL-00-MULTI", type: "metadata", _sourceTable: "Lore" });
assert(keyMeta.includes("::metadata::"), `Metadata entityKey utiliza ::metadata:: (${keyMeta})`);

const keyCol = createEntityKey({ name: "Naruto Shippuden", code: "COL-01-NRT", type: "collection", _sourceTable: "Collection" });
assert(keyCol.includes("::collection::"), `Collection entityKey utiliza ::collection:: (${keyCol})`);

// Test 9: Short Name Policy (V / Cyberpunk 2077)
console.log("\n📌 Teste 9: Política de Nome Curto (V / Cyberpunk 2077)");
const evalV = evaluateEntityPipeline({
  id: "v_cp77",
  name: "V",
  collection_id: "COL-02-CP77",
  series: "Cyberpunk 2077",
  type: "character",
  lore: "Mercenário de Night City no universo de Cyberpunk 2077.",
  img_custom: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800"
});

assert(evalV.primaryState === "valid", "V / Cyberpunk 2077 não vai para quarentena apenas pelo tamanho do nome (status = valid)");
assert(evalV.flags.shortName === true, "V / Cyberpunk 2077 registra flag shortName = true");

// Test 10: Alias Resolution (COL-01-NAR -> COL-01-NRT)
console.log("\n📌 Teste 10: Normalização de Alias sem Quarentena Indevida");
const evalNarAlias = evaluateEntityPipeline({
  id: "naruto_card_001",
  name: "Naruto Uzumaki",
  collection_id: "COL-01-NAR",
  type: "character",
  lore: "Ninja de Konoha com a Raposa de Nove Caudas selada.",
  img_custom: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"
});

assert(evalNarAlias.primaryState === "valid", "Alias COL-01-NAR -> COL-01-NRT não gera quarentena sozinho (status = valid)");
assert(evalNarAlias.suggestedCollection === "COL-01-NRT", "Alias COL-01-NAR resolvido para o código canônico COL-01-NRT");

// Test 11: Observabilidade do DQE em Relação ao Repositório
console.log("\n📌 Teste 11: Teste de Observabilidade DQE vs Repositório Persistido");

async function runDqeObservabilityTest() {
  const auditA = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });
  const countQuarantineA = auditA.report.quarantineCount;

  // Modificação controlada no storage persistido de teste
  const testCardId = "test_obs_card_001";
  await entityRepository.saveCard({
    id: testCardId,
    name: "Test Entity Observability",
    collection_id: "COL-03-MARVEL",
    status: "quarantine",
    rejection_reason: "Teste de Observabilidade do DQE"
  });

  const auditB = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });
  const countQuarantineB = auditB.report.quarantineCount;

  assert(countQuarantineB > countQuarantineA, `DQE observa imediatamente alteração persistida no repository (${countQuarantineA} -> ${countQuarantineB})`);

  // Limpeza do cartão de teste
  await entityRepository.deleteCard(testCardId);
}

await runDqeObservabilityTest();

// Test 12: Invariantes de Contabilidade e Não Dupla Contagem do DQE
console.log("\n📌 Teste 12: Invariantes de Contabilidade e Prevenção de Dupla Contagem do DQE");

async function runDqeAccountingInvariantsTest() {
  const audit = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });
  const report = audit.report;

  // 1. entityType sum === totalAnalyzed
  const typeSum = report.entityTypes.collections + report.entityTypes.characters + report.entityTypes.items + report.entityTypes.bosses + report.entityTypes.metadata;
  assert(typeSum === report.totalAnalyzed, `Soma dos entityTypes (${typeSum}) é igual ao totalAnalyzed (${report.totalAnalyzed})`);
  assert(report.invariants.entityTypeAccounting.isValid === true, "Invariante entityTypeAccounting.isValid é true");

  // 2. status sum === totalAnalyzed
  const statusSum = report.statusTotals.valid + report.statusTotals.quarantine + report.statusTotals.invalid + report.statusTotals.unknown;
  assert(statusSum === report.totalAnalyzed, `Soma dos statusTotals (${statusSum}) é igual ao totalAnalyzed (${report.totalAnalyzed})`);
  assert(report.invariants.statusAccounting.isValid === true, "Invariante statusAccounting.isValid é true");

  // 3. Boss não é contado simultaneamente como character
  const bossEval = evaluateEntityPipeline({ id: "test_boss_01", name: "Malenia", _sourceTable: "Boss", type: "boss", collection_id: "COL-02-ER" });
  assert(bossEval.entityType === "boss", "Boss classifica como entityType 'boss'");
  assert(bossEval.entityType !== "character", "Boss não classifica como entityType 'character'");

  // 4. Metadata não é contado simultaneamente como character
  const metaEval = evaluateEntityPipeline({ id: "test_meta_01", name: "Lore Test", _sourceTable: "Lore", type: "metadata", collection_id: "COL-00-MULTI" });
  assert(metaEval.entityType === "metadata", "Lore classifica como entityType 'metadata'");
  assert(metaEval.entityType !== "character", "Lore não classifica como entityType 'character'");

  // 5. Metadata nunca é usado como status primário
  assert(report.statusTotals.metadata === undefined, "statusTotals não contém propriedade 'metadata'");
  assert(["valid", "quarantine", "invalid", "unknown"].includes(metaEval.primaryState), `Metadata possui status primário legítimo ('${metaEval.primaryState}'), nunca 'metadata'`);
}

await runDqeAccountingInvariantsTest();

// Test 13: Semântica do collectionsAudit e Invariantes das Coleções
console.log("\n📌 Teste 13: Semântica do collectionsAudit e Invariantes das Coleções");

async function runCollectionsAuditTests() {
  const auditResult = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });
  const report = auditResult.report;

  // 1. Missing media não transforma ACTIVE em MISSING_DATA
  const aotAudit = report.collectionsAudit.find(c => c.code === "COL-01-AOT");
  assert(aotAudit !== undefined, "COL-01-AOT encontrado no collectionsAudit");
  assert(aotAudit.operationalStatus === "ACTIVE", `COL-01-AOT tem status operacional ACTIVE (mesmo com mídia ausente/parcial): ${aotAudit.operationalStatus}`);
  assert(aotAudit.operationalStatus !== "MISSING_DATA", "Ausência de mídia NÃO transforma status operacional da coleção em MISSING_DATA");

  // 2. Alias legado de collection resolve para código canônico antes de classificar
  assert(resolveCollectionCode("COL-01-NAR") === "COL-01-NRT", "Alias legado COL-01-NAR resolve para COL-01-NRT");
  assert(resolveCollectionCode("COL-01-KNY") === "COL-01-DS", "Alias legado COL-01-KNY resolve para COL-01-DS");
  assert(resolveCollectionCode("COL-02-ATLA") === "COL-04-ATLA", "Alias legado COL-02-ATLA resolve para COL-04-ATLA");

  // 3. LORE-* nunca é colocado em resolvedCollectionCanonicalId
  let loreAsCanonicalCount = 0;
  for (const conflict of report.collectionConflicts) {
    if (conflict.resolvedCollectionCanonicalId && conflict.resolvedCollectionCanonicalId.startsWith("LORE-")) {
      loreAsCanonicalCount++;
    }
  }
  assert(loreAsCanonicalCount === 0, `LORE-* nunca é colocado em resolvedCollectionCanonicalId (count = ${loreAsCanonicalCount})`);

  // 4. ACTIVE + EMPTY + RESERVED + MISSING_DATA + INVALID = 95
  const statusCounts = { ACTIVE: 0, EMPTY: 0, RESERVED: 0, MISSING_DATA: 0, INVALID: 0 };
  for (const col of report.collectionsAudit) {
    statusCounts[col.operationalStatus] = (statusCounts[col.operationalStatus] || 0) + 1;
  }
  const auditSum = statusCounts.ACTIVE + statusCounts.EMPTY + statusCounts.RESERVED + statusCounts.MISSING_DATA + statusCounts.INVALID;
  assert(auditSum === report.collectionsAudit.length, `Soma dos status operacionais das coleções (${auditSum}) é igual ao total de coleções canônicas (${report.collectionsAudit.length})`);
  assert(auditSum === CANONICAL_COLLECTION_CODES.length, `Soma das coleções no registry é exatamente ${CANONICAL_COLLECTION_CODES.length} (${auditSum})`);
}

await runCollectionsAuditTests();

// Teste 14: Final Gate — Strict Collection Resolver e Audit Invariants
console.log("\n📌 Teste 14: Final Gate — Strict Collection Resolver e Audit Invariants");

async function runFinalGateTests() {
  const auditResult = await runDataQualityAudit({ mode: "PROPOSE", dryRun: true });
  const report = auditResult.report;

  // 1. exactCanonicalPrecedenceTest
  assert(resolveCollectionCodeStrict("COL-01-AOT") === "COL-01-AOT", "exactCanonicalPrecedenceTest: COL-01-AOT resolve para COL-01-AOT");
  assert(resolveCollectionCodeStrict("COL-02-DS") === "COL-02-DS", "exactCanonicalPrecedenceTest: COL-02-DS resolve para COL-02-DS");
  assert(resolveCollectionCodeStrict("COL-01-DS") === "COL-01-DS", "exactCanonicalPrecedenceTest: COL-01-DS resolve para COL-01-DS");
  assert(resolveCollectionCodeStrict("COL-01-SLV") === "COL-01-SL", "exactCanonicalPrecedenceTest: COL-01-SLV (legacy alias) resolve para COL-01-SL");

  // 2. demonSlayerDarkSoulsCollisionTest
  assert(resolveCollectionCodeStrict("COL-01-KNY") === "COL-01-DS", "demonSlayerDarkSoulsCollisionTest: COL-01-KNY resolve para COL-01-DS (Demon Slayer)");
  assert(resolveCollectionCodeStrict("COL-02-DS") === "COL-02-DS", "demonSlayerDarkSoulsCollisionTest: COL-02-DS resolve para COL-02-DS (Dark Souls)");
  assert(resolveCollectionCodeStrict("COL-01-KNY") !== resolveCollectionCodeStrict("COL-02-DS"), "demonSlayerDarkSoulsCollisionTest: COL-01-KNY e COL-02-DS geram resoluções distintas");

  // 3. strictUnknownReturnsNullTest
  assert(resolveCollectionCodeStrict("NON_EXISTENT_XYZ_123") === null, "strictUnknownReturnsNullTest: Código desconhecido retorna null");
  assert(resolveCollectionCodeStrict("UNKNOWN") === null, "strictUnknownReturnsNullTest: UNKNOWN retorna null");
  assert(resolveCollectionCodeStrict("INVALID_CODE") === null, "strictUnknownReturnsNullTest: Código inválido retorna null e NUNCA COL-00-MULTI");

  // 4. loreDoesNotBecomeMultiTest
  assert(resolveCollectionCodeStrict("LORE-AOT-SCO-003") === null, "loreDoesNotBecomeMultiTest: Referência LORE-* resolve para null em modo estrito");

  // 5. collectionRecordNotConflictTest
  const colEval = evaluateEntityPipeline({ id: "col_aot", code: "COL-01-AOT", type: "collection", name: "Attack on Titan" });
  assert(colEval.flags.collectionConflict === false, "collectionRecordNotConflictTest: Registro estrutural de coleção não gera collectionConflict");

  // 6. multiNamespaceNotConflictByDefaultTest
  const multiEval = evaluateEntityPipeline({ id: "item_multi", collection_id: "COL-00-MULTI", type: "item", name: "Multi Item" });
  assert(multiEval.flags.collectionConflict === false, "multiNamespaceNotConflictByDefaultTest: Namespace COL-00-MULTI explícito não gera collectionConflict por padrão");

  // 7. collectionRecordUniquenessTest
  const colAcc = report.collectionRecordsAccounting;
  const collectionRecords = colAcc.collectionRecords;
  assert(collectionRecords === MEGA_COLLECTIONS.length, `collectionRecordUniquenessTest: collectionRecords (${collectionRecords}) === MEGA_COLLECTIONS.length (${MEGA_COLLECTIONS.length})`);
  assert(colAcc.resolvedCollectionRecords === collectionRecords, `collectionRecordUniquenessTest: resolvedCollectionRecords (${colAcc.resolvedCollectionRecords}) === collectionRecords (${collectionRecords})`);
  assert(colAcc.uniqueResolvedCanonicalIds === collectionRecords, `collectionRecordUniquenessTest: uniqueResolvedCanonicalIds (${colAcc.uniqueResolvedCanonicalIds}) === collectionRecords (${collectionRecords})`);
  assert(colAcc.duplicateCanonicalMappings === 0, `collectionRecordUniquenessTest: 0 mapeamentos duplicados (${colAcc.duplicateCanonicalMappings})`);
  assert(colAcc.unresolvedCollectionRecords === 0, `collectionRecordUniquenessTest: 0 registros de coleção não resolvidos (${colAcc.unresolvedCollectionRecords})`);

  // 8. collectionCodeAccountingTest
  const confAcc = report.collectionConflictsAccounting;
  assert(typeof confAcc.collectionConflictsBefore === "number", `collectionCodeAccountingTest: collectionConflictsBefore é numérico (${confAcc.collectionConflictsBefore})`);
  assert(confAcc.collectionConflictsAfter === 0, `collectionCodeAccountingTest: collectionConflictsAfter === 0 (emergiu: ${confAcc.collectionConflictsAfter})`);
  assert(typeof confAcc.structuralCollectionFalsePositivesRemoved === "number", `collectionCodeAccountingTest: falsos positivos estruturais de coleção calculados dinamicamente (${confAcc.structuralCollectionFalsePositivesRemoved})`);
  assert(typeof confAcc.multiNamespaceFalsePositivesRemoved === "number", `collectionCodeAccountingTest: falsos positivos de namespace MULTI calculados dinamicamente (${confAcc.multiNamespaceFalsePositivesRemoved})`);
  assert(typeof confAcc.unresolvedLoreReferences === "number", `collectionCodeAccountingTest: referências de Lore isoladas (${confAcc.unresolvedLoreReferences})`);
}

await runFinalGateTests();

await runCrudTest();

console.log("\n════════════════════════════════════════════════════════════════");
console.log(`📊 RESULTADO DOS TESTES: ${passed} Passaram | ${failed} Falharam`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✨ Todos os testes do repositório unificado passaram com sucesso!");
  process.exit(0);
}
