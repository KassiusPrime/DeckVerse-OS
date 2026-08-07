// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Script de Validação de Códigos de Coleção (CI Validator)
// ════════════════════════════════════════════════════════════════════════════

import {
  CANONICAL_COLLECTION_CODES,
  LEGACY_ALIASES,
  resolveCollectionCode,
  validateCollectionCode
} from '../lib/collectionCodes.js';

console.log('🔍 [CI] Iniciando validação dos códigos de coleção do DeckVerse OS...\n');

let errors = 0;

// 1. Validar quantidade e formato dos códigos canônicos
console.log(`📦 Total de códigos canônicos cadastrados: ${CANONICAL_COLLECTION_CODES.length}`);

if (CANONICAL_COLLECTION_CODES.length < 60) {
  console.warn(`⚠️ Alerta: esperavam-se 60 códigos canônicos, encontrados ${CANONICAL_COLLECTION_CODES.length}`);
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
