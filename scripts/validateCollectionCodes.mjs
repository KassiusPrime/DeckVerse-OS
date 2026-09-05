// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Script de Validação de Códigos de Coleção (CI Validator)
// ════════════════════════════════════════════════════════════════════════════

import {
  CANONICAL_COLLECTION_CODES,
  LEGACY_ALIASES,
  LEGACY_FULL_CODE_ALIASES,
  resolveCollectionCode,
  validateCollectionCode
} from '../lib/collectionCodes.js';
import { MEGA_COLLECTIONS } from '../src/data/megaCollectionsData.js';

console.log('🔍 [CI] Iniciando validação dos códigos de coleção do DeckVerse OS...\n');

let errors = 0;

console.log(`📦 Total de códigos canônicos cadastrados: ${CANONICAL_COLLECTION_CODES.length}`);

if (CANONICAL_COLLECTION_CODES.length === 0) {
  console.error('❌ A lista de códigos canônicos não pode estar vazia.');
  errors++;
}

const uniqueCanonicalCodes = new Set(CANONICAL_COLLECTION_CODES);
if (uniqueCanonicalCodes.size !== CANONICAL_COLLECTION_CODES.length) {
  console.error(`❌ Códigos canônicos duplicados encontrados: ${CANONICAL_COLLECTION_CODES.length - uniqueCanonicalCodes.size}`);
  errors++;
} else {
  console.log('✅ Todos os códigos canônicos são únicos.');
}

const allAliasKeys = new Set([...Object.keys(LEGACY_ALIASES), ...Object.keys(LEGACY_FULL_CODE_ALIASES)]);
let contaminationCount = 0;
CANONICAL_COLLECTION_CODES.forEach(code => {
  if (allAliasKeys.has(code)) {
    console.error(`❌ Contaminação de alias em código canônico encontrada: ${code}`);
    contaminationCount++;
  }
});
if (contaminationCount > 0) {
  errors += contaminationCount;
} else {
  console.log('✅ Zero contaminação de aliases nos códigos canônicos (canonicalAliasContamination = 0).');
}

// Seeds históricos podem conter um alias legado, mas precisam resolver sem ambiguidade
// para um código canônico. Isso permite migrações como DBZ -> DB sem reintroduzir DBZ
// na lista canônica.
let unresolvedSeedCount = 0;
MEGA_COLLECTIONS.forEach(col => {
  const resolved = resolveCollectionCode(col.code);
  if (!uniqueCanonicalCodes.has(resolved)) {
    console.error(`❌ Código de coleção no seed não resolve para canônico: ${col.code} -> ${resolved}`);
    unresolvedSeedCount++;
  } else if (resolved !== col.code) {
    console.log(`  ↪ Seed legado '${col.code}' resolvido para '${resolved}'.`);
  }
});
if (unresolvedSeedCount > 0) {
  errors += unresolvedSeedCount;
} else {
  console.log('✅ Todos os códigos do seed resolvem para códigos canônicos válidos.');
}

CANONICAL_COLLECTION_CODES.forEach(code => {
  if (!/^COL-\d{2}-[A-Z0-9]+$/.test(code)) {
    console.error(`❌ Código canônico inválido (formato incorreto): ${code}`);
    errors++;
  }
});

console.log('\n🔗 Testando aliases legados...');
const testCases = [
  { raw: 'NAR', expected: 'COL-01-NRT' },
  { raw: 'NRT', expected: 'COL-01-NRT' },
  { raw: 'OPC', expected: 'COL-01-OP' },
  { raw: 'OP', expected: 'COL-01-OP' },
  { raw: 'DB', expected: 'COL-01-DB' },
  { raw: 'DBZ', expected: 'COL-01-DB' },
  { raw: 'COL-01-DBZ', expected: 'COL-01-DB' },
  { raw: 'CYB', expected: 'COL-02-CP77' },
  { raw: 'MVC', expected: 'COL-03-MARVEL' },
  { raw: 'AOT', expected: 'COL-01-AOT' },
  { raw: 'JJK', expected: 'COL-01-JJK' },
  { raw: 'BLC', expected: 'COL-01-BLC' }
];

testCases.forEach(({ raw, expected }) => {
  const resolved = resolveCollectionCode(raw);
  if (resolved === expected) {
    console.log(`  ✅ Alias '${raw}' -> '${resolved}' (correto)`);
  } else {
    console.error(`  ❌ Falha no alias '${raw}': esperado '${expected}', obtido '${resolved}'`);
    errors++;
  }
});

console.log('\n🧪 Testando validateCollectionCode...');
const canonicalTest = validateCollectionCode('COL-01-DB');
if (!canonicalTest.valid || !canonicalTest.isCanonical) {
  console.error(`  ❌ Falha na validação do código canônico 'COL-01-DB'`);
  errors++;
} else {
  console.log(`  ✅ 'COL-01-DB' é reconhecido como canônico`);
}

const legacyDbzTest = validateCollectionCode('COL-01-DBZ');
if (!legacyDbzTest.valid || legacyDbzTest.code !== 'COL-01-DB' || legacyDbzTest.isCanonical) {
  console.error(`  ❌ Falha no mapeamento legado 'COL-01-DBZ' -> 'COL-01-DB'`);
  errors++;
} else {
  console.log(`  ✅ 'COL-01-DBZ' resolve para 'COL-01-DB' sem ser canônico`);
}

const legacyTest = validateCollectionCode('NAR');
if (!legacyTest.valid || legacyTest.code !== 'COL-01-NRT') {
  console.error(`  ❌ Falha no mapeamento do legado 'NAR'`);
  errors++;
} else {
  console.log(`  ✅ 'NAR' foi resolvido com sucesso para 'COL-01-NRT'`);
}

console.log('\n════════════════════════════════════════════════════════════════');
if (errors === 0) {
  console.log('🎉 [CI] Todos os testes de códigos de coleção passaram com sucesso!');
  process.exit(0);
} else {
  console.error(`💥 [CI] Foram encontrados ${errors} erro(s) de validação.`);
  process.exit(1);
}
