import assert from "node:assert/strict";
import {
  applyFallbackRarityPolicy,
  fallbackRarityForRank,
  normalizeCatalogRarity,
  rarityDistribution,
} from "../src/utils/rarityPolicy.js";
import { parseMediaFilename } from "../services/media/mediaFilenameParser.js";

let passed = 0;
const tests = [];

function test(name, fn) {
  tests.push([name, fn]);
}

test("fallback de 10 personagens inclui C e UC para personagens menos proeminentes", () => {
  const rarities = Array.from({ length: 10 }, (_, index) => fallbackRarityForRank(index, 10));
  assert.deepEqual(rarities.slice(0, 3), ["MR", "LR", "UR"]);
  assert.ok(rarities.filter((value) => value === "C").length >= 2, `esperado >=2 C, recebido ${rarities.join(", ")}`);
  assert.ok(rarities.includes("UC"), `esperado UC, recebido ${rarities.join(", ")}`);
});

test("política de fallback não rebaixa raridade curada/Firebase", () => {
  const entities = [
    { id: "curated", name: "Curado", collection_id: "COL-01-AOT", rarity: "SSR", rarityReviewed: true },
    { id: "firebase", name: "Nuvem", collection_id: "COL-01-AOT", rarity: "R", source: "FIREBASE" },
  ];
  const result = applyFallbackRarityPolicy(entities);
  assert.equal(result[0].rarity, "SSR");
  assert.equal(result[1].rarity, "R");
});

test("política de fallback redistribui apenas cards seed gerados", () => {
  const entities = Array.from({ length: 10 }, (_, index) => ({
    id: `card_col_01_aot_${index + 1}`,
    card_id: `COL-01-AOT-CHR-${index === 0 ? "MR" : "R"}-${String(index + 1).padStart(3, "0")}`,
    collection_id: "COL-01-AOT",
    name: `Personagem ${index + 1}`,
    rarity: index === 0 ? "MR" : "R",
  }));
  const result = applyFallbackRarityPolicy(entities);
  const distribution = rarityDistribution(result);
  assert.ok(distribution.C >= 2);
  assert.ok(distribution.UC >= 1);
  assert.equal(distribution.MR, 1);
});

test("aliases legados de raridade são normalizados ao catálogo atual", () => {
  assert.equal(normalizeCatalogRarity("Common"), "C");
  assert.equal(normalizeCatalogRarity("Uncommon"), "UC");
  assert.equal(normalizeCatalogRarity("Legendary"), "UR");
  assert.equal(normalizeCatalogRarity("ANOMALIA"), "MR");
});

test("parser aceita filename canônico real dos ZIPs atuais", () => {
  const result = parseMediaFilename("COL-01-AOT_character_lara_tybur.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.collectionCodeCanonical, "COL-01-AOT");
  assert.equal(result.entityType, "character");
  assert.equal(result.slug, "lara_tybur");
  assert.equal(result.namingStyle, "single-underscore-canonical");
});

test("parser aceita capa canônica real", () => {
  const result = parseMediaFilename("COL-01-AOT_collection_cover.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.entityType, "collection");
  assert.equal(result.slug, "cover");
});

test("parser preserva slug de forma na mesma carta", () => {
  const result = parseMediaFilename("COL-01-NRT_character_naruto_uzumaki_form_sage_mode.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.entityType, "character");
  assert.equal(result.slug, "naruto_uzumaki_form_sage_mode");
});

test("parser mantém compatibilidade com filename legado de duplo underline", () => {
  const result = parseMediaFilename("COL-01-AOT__character__eren_yeager.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.namingStyle, "double-underscore-legacy");
});

test("parser continua bloqueando path traversal", () => {
  const result = parseMediaFilename("../COL-01-AOT_character_eren_yeager.jpg");
  assert.equal(result.valid, false);
  assert.equal(result.error, "PATH_TRAVERSAL_ATTEMPT");
});

for (const [name, fn] of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✕ ${name}`);
    throw error;
  }
}

console.log(`\nDeckVerse catalog/rarity/media: ${passed}/${tests.length} testes passaram.`);
