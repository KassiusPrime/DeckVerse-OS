// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Script Auditor de Catálogo e Integridade de Dados
// Execute via: npm run audit:catalog
// ════════════════════════════════════════════════════════════════════════════

import {
  CANONICAL_COLLECTION_CODES,
  LEGACY_ALIASES,
  resolveCollectionCode,
  validateCollectionCode
} from '../lib/collectionCodes.js';

import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, getAllExpandedCards } from '../src/data/megaCollectionsData.js';
import { auditAndMigrateEntities, isInvalidCardEntity } from '../src/utils/entityClassifier.js';
import { createEntityKey } from '../src/utils/entityIdentity.js';
import { isNonCharacterName } from '../lib/importSchemas.js';

console.log('📊 [AUDIT] Iniciando auditoria completa do catálogo e entidades DeckVerse OS...\n');

let issues = 0;

// 1. Audit Canonical Collection Codes
console.log('📌 [1/5] Auditando Códigos de Coleção Canônicos...');
console.log(`   - Total cadastrado: ${CANONICAL_COLLECTION_CODES.length}`);

if (CANONICAL_COLLECTION_CODES.length < 90) {
  console.warn(`   ⚠️ Alerta: esperavam-se no mínimo 90 códigos canônicos, encontrados ${CANONICAL_COLLECTION_CODES.length}`);
} else {
  console.log('   ✅ Quantidade de códigos atende ao requisito canônico (>=90).');
}

CANONICAL_COLLECTION_CODES.forEach(code => {
  if (!/^COL-\d{2}-[A-Z0-9]+$/.test(code)) {
    console.error(`   ❌ Código fora do padrão: ${code}`);
    issues++;
  }
});

// 2. Audit Legacy Aliases
console.log('\n🔗 [2/5] Auditando Aliases e Redirecionamentos...');
const aliasKeys = Object.keys(LEGACY_ALIASES);
console.log(`   - Mapeamentos legados ativos: ${aliasKeys.length}`);

aliasKeys.forEach(alias => {
  const target = LEGACY_ALIASES[alias];
  if (!CANONICAL_COLLECTION_CODES.includes(target)) {
    console.error(`   ❌ Alias '${alias}' aponta para código não-canônico '${target}'`);
    issues++;
  }
});

// 3. System Integrity Check
console.log('\n🛡️ [3/5] Verificando Integridade das Coleções e Resolução...');
const sampleCodes = ['NAR', 'OPC', 'DBZ', 'MVC', 'AOT', 'JJK', 'BLC', 'CYB'];
sampleCodes.forEach(raw => {
  const resolved = resolveCollectionCode(raw);
  if (!resolved || !CANONICAL_COLLECTION_CODES.includes(resolved)) {
    console.error(`   ❌ Falha ao resolver alias '${raw}' -> '${resolved}'`);
    issues++;
  }
});

// 4. Entity Type Structural Audit & Migration Verification
console.log('\n👥 [4/5] Auditando Estrutura de Entidades (Personagens, Coleções, Itens e Bosses)...');
const rawCards = getAllExpandedCards();
const rawItems = MEGA_ITEMS || [];
const rawBosses = MEGA_BOSSES || [];
const rawCols = MEGA_COLLECTIONS || [];

const auditResult = auditAndMigrateEntities(rawCards, rawItems, rawBosses, rawCols);
const { stats } = auditResult;

console.log('\n📋 RELATÓRIO DA AUDITORIA DE ENTIDADES:');
console.log(`   • Personagens Antes: ${stats.charactersBefore}  |  Depois: ${stats.charactersAfter}`);
console.log(`   • Itens Antes:        ${stats.itemsBefore}       |  Depois: ${stats.itemsAfter}`);
console.log(`   • Bosses Antes:       ${stats.bossesBefore}      |  Depois: ${stats.bossesAfter}`);
console.log(`   • Registros Inválidos Encontrados: ${stats.invalidFound}`);

// 5. Policy & Forbidden Generic Defaults Check
console.log('\n🔍 [5/5] Auditando Nomes de Coleção, Colisões de Identity e Defaults Proibidos...');
const seenKeys = new Map();

rawCards.forEach((card, idx) => {
  const cardName = card.name || "";
  
  // Check 1: Non-character names
  if (isNonCharacterName(cardName)) {
    console.error(`   ❌ Carta #${idx} tem nome inválido/não-personagem: "${cardName}"`);
    issues++;
  }

  // Check 2: Forbidden generic defaults
  if (card.moral_alignment === "Ordeiro e Bom") {
    console.error(`   ❌ Carta "${cardName}" possui alinhamento genérico proibido: "Ordeiro e Bom"`);
    issues++;
  }

  if (card.fears && card.fears.includes("Proteger")) {
    console.error(`   ❌ Carta "${cardName}" possui medo genérico fabricado: "${card.fears}"`);
    issues++;
  }

  // Check 3: Identity Key Colision
  const entityKey = createEntityKey({
    name: cardName,
    collection_id: card.collection_id,
    series: card.series,
    type: "character"
  });

  if (seenKeys.has(entityKey)) {
    const prev = seenKeys.get(entityKey);
    console.error(`   ❌ Colisão de e_key_cannon detectada! Key "${entityKey}" usada por [${prev.collection_id}] "${prev.name}" e [${card.collection_id}] "${cardName}"`);
    issues++;
  } else {
    seenKeys.set(entityKey, { name: cardName, collection_id: card.collection_id });
  }
});
console.log(`   • Registros Convertidos (em Item/Boss): ${stats.convertedCount}`);
console.log(`   • Registros Removidos da Grade de Cartas: ${stats.removedCount}`);
console.log(`   • Dados Migrados para Metadados: ${stats.metadataMigrated}`);
console.log(`   • Registros Ambíguos: ${stats.ambiguousRecords.length}`);

if (stats.ambiguousRecords.length > 0) {
  console.log('   ⚠️ Registros Ambíguos Notificados:');
  stats.ambiguousRecords.forEach(rec => console.log(`      - [${rec.id}] ${rec.name}: ${rec.reason}`));
}

console.log('\n════════════════════════════════════════════════════════════════');
if (issues === 0) {
  console.log('✨ [AUDIT] Catálogo e Entidades 100% íntegros! Requisitos v9.3 validados.');
  process.exit(0);
} else {
  console.error(`💥 [AUDIT] Encontradas ${issues} inconsistência(s) no catálogo.`);
  process.exit(1);
}

