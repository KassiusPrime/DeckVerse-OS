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

// 1. Validar estrutura e integridade dos códigos canônicos
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

// Check zero canonicalAliasContamination
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

// Check zero legacy codes inside seed
let legacyInSeedCount = 0;
MEGA_COLLECTIONS.forEach(col => {
  if (!uniqueCanonicalCodes.has(col.code)) {
    console.error(`❌ Código de coleção no seed não é canônico: ${col.code}`);
    legacyInSeedCount++;
  }
});
if (legacyInSeedCount > 0) {
  errors += legacyInSeedCount;
} else {
  console.log('✅ Zero códigos legados dentro do seed de coleções (legacyCodesInsideMegaCollections = 0).');
}

CANONICAL_COLLECTION_CODES.forEach(code => {
  if (!/^COL-\d{2}-[A-Z0-9]+$/.test(code)) {
    console.error(`❌ Código canônico inválido (formato incorreto): ${code}`);
    errors++;
  }
});

// 2. Testar resolução dos aliases legados
console.log('\n🔗 Testando aliases legados...');
const testCases = [
  { raw: 'NAR', expected: 'COL-01-NRT' },
  { raw: 'NRT', expected: 'COL-01-NRT' },
  { raw: 'OPC', expected: 'COL-01-OP' },
  { raw: 'OP', expected: 'COL-01-OP' },
  { raw: 'DBZ', expected: 'COL-01-DBZ' },
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

// 3. Testar função validateCollectionCode
console.log('\n🧪 Testando validateCollectionCode...');
const canonicalTest = validateCollectionCode('COL-01-NRT');
if (!canonicalTest.valid || !canonicalTest.isCanonical) {
  console.error(`  ❌ Falha na validação do código canônico 'COL-01-NRT'`);
  errors++;
} else {
  console.log(`  ✅ 'COL-01-NRT' é reconhecido como canônico`);
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
