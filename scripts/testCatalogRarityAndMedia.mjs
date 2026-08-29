import assert from "node:assert/strict";
import {
  CATALOG_RARITIES,
  applyFallbackRarityPolicy,
  isRarityReviewed,
  normalizeCatalogRarity,
  rarityDistribution,
} from "../src/utils/rarityPolicy.js";
import { normalizeCatalogSnapshot } from "../src/utils/catalogIdentityPolicy.js";
import { getCatalogReference } from "../src/data/catalogReference.js";
import { parseMediaFilename } from "../services/media/mediaFilenameParser.js";
import { matchMediaEntity } from "../services/media/mediaEntityMatcher.js";

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("catálogo público usa somente R, SR, SSR, UR, LR e MR", () => {
  assert.deepEqual(CATALOG_RARITIES, ["R", "SR", "SSR", "UR", "LR", "MR"]);
});

test("BOSS/DIV/ANOMALIA e C/UC não são convertidos silenciosamente", () => {
  for (const value of ["BOSS", "DIV", "ANOMALIA", "TRS", "C", "UC"]) {
    assert.equal(normalizeCatalogRarity(value), "", `${value} não deve virar raridade canônica`);
  }
  assert.equal(normalizeCatalogRarity("Legendary"), "UR");
  assert.equal(normalizeCatalogRarity("Mythic"), "MR");
});

test("seed legado perde a raridade fabricada por posição", () => {
  const seed = [{
    id: "card_col_01_aot_1",
    card_id: "COL-01-AOT-CHR-MR-001",
    collection_id: "COL-01-AOT",
    name: "Personagem Seed",
    rarity: "MR",
  }];
  const result = applyFallbackRarityPolicy(seed);
  assert.equal(result[0].rarity, "");
  assert.equal(result[0].rarityReviewed, false);
  assert.equal(result[0].raritySource, "unreviewed-seed");
  assert.equal(isRarityReviewed(result[0]), false);
});

test("raridade curada/Firebase é preservada", () => {
  const entities = [
    { id: "curated", name: "Curado", collection_id: "COL-01-AOT", rarity: "SSR", rarityReviewed: true },
    { id: "firebase", name: "Nuvem", collection_id: "COL-01-AOT", rarity: "R", source: "FIREBASE" },
  ];
  const result = applyFallbackRarityPolicy(entities);
  assert.equal(result[0].rarity, "SSR");
  assert.equal(result[1].rarity, "R");
});

test("distribuição registra raridades não revisadas separadamente", () => {
  const distribution = rarityDistribution([{ rarity: "R" }, { rarity: "BOSS" }, { rarity: "" }]);
  assert.equal(distribution.R, 1);
  assert.equal(distribution.unreviewed, 2);
});

test("política de identidade remove título duplicado de Yhwach", () => {
  const snapshot = normalizeCatalogSnapshot({
    characters: [{ name: "Yhwach", collection_id: "COL-01-BLC" }],
    items: [],
    bosses: [{ name: "Yhwach Rei Quincy", slug: "yhwach_rei_quincy", collection_id: "COL-01-BLC" }],
  });
  assert.equal(snapshot.characters.length, 1);
  assert.equal(snapshot.bosses.length, 0);
  assert.equal(snapshot.identityAudit[0].reason, "TITLE_DUPLICATE");
});

test("aliases, títulos e estados auditados não criam outra carta-base", () => {
  const snapshot = normalizeCatalogSnapshot({
    characters: [
      { slug: "all_might_normal_form", collection_id: "COL-01-MHA" },
      { slug: "toshinori_yagi", collection_id: "COL-01-MHA" },
      { slug: "kichimura_washuu", collection_id: "COL-01-TG" },
      { slug: "skeptical_man", collection_id: "COL-02-BB" },
    ],
    items: [],
    bosses: [
      { slug: "gun_fiend", collection_id: "COL-01-CSM" },
      { slug: "kid_buu", collection_id: "COL-01-DBZ" },
      { slug: "dio", collection_id: "COL-01-JOJO" },
      { slug: "izuku_midoriya", collection_id: "COL-01-MHA" },
      { slug: "majin_buu", collection_id: "COL-01-DBZ" },
      { slug: "dio_brando", collection_id: "COL-01-JOJO" },
      { slug: "furuta_nimura", collection_id: "COL-01-TG" },
    ],
  });
  assert.deepEqual(snapshot.characters.map((entity) => entity.slug).sort(), ["skeptical_man", "toshinori_yagi"]);
  assert.deepEqual(snapshot.bosses.map((entity) => entity.slug).sort(), ["dio_brando", "furuta_nimura", "majin_buu"]);
});

test("referência canônica segue a curadoria física atual dos ZIPs", () => {
  assert.equal(getCatalogReference("COL-BLC").cards, 72);
  assert.equal(getCatalogReference("COL-CSM").cards, 27);
  assert.equal(getCatalogReference("COL-DBZ").cards, 47);
  assert.equal(getCatalogReference("COL-JOJO").cards, 41);
  assert.equal(getCatalogReference("COL-BB").cards, 59);
  assert.equal(getCatalogReference("COL-SL").cards, 67);
  assert.equal(getCatalogReference("COL-TG").cards, 56);
  assert.equal(getCatalogReference("COL-TOG").cards, 59);
  assert.equal(getCatalogReference("COL-YYH").cards, 49);
});

test("parser aceita filename estável sem numeração de lote", () => {
  const result = parseMediaFilename("COL-BB_character_lonely_old_woman.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.collectionCodeCanonical, "COL-02-BB");
  assert.equal(result.entityType, "character");
  assert.equal(result.baseSlug, "lonely_old_woman");
  assert.equal(result.stateType, null);
});

test("parser resolve COL-DSG como Dark Souls sem colidir com Demon Slayer", () => {
  const darkSouls = parseMediaFilename("COL-DSG_character_solaire_of_astora.jpg");
  const demonSlayer = parseMediaFilename("COL-DS_character_tanjiro_kamado.jpg");
  assert.equal(darkSouls.valid, true);
  assert.equal(darkSouls.collectionCodeCanonical, "COL-02-DS");
  assert.equal(demonSlayer.valid, true);
  assert.equal(demonSlayer.collectionCodeCanonical, "COL-01-DS");
});

test("parser extrai forma sem transformar a forma em identidade", () => {
  const result = parseMediaFilename("COL-DBZ_boss_majin_buu_form_kid_buu.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.entityType, "boss");
  assert.equal(result.slug, "majin_buu_form_kid_buu");
  assert.equal(result.baseSlug, "majin_buu");
  assert.equal(result.stateType, "form");
  assert.equal(result.stateSlug, "kid_buu");
});

test("parser extrai appearance sem criar uma nova carta", () => {
  const result = parseMediaFilename("COL-JOJO_boss_dio_brando_appearance_dio.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.slug, "dio_brando_appearance_dio");
  assert.equal(result.baseSlug, "dio_brando");
  assert.equal(result.stateType, "appearance");
  assert.equal(result.stateSlug, "dio");
});

test("matcher vincula form e appearance à entidade-base", () => {
  const catalog = {
    collections: [],
    cards: [{ id: "naruto", name: "Naruto Uzumaki", slug: "naruto_uzumaki", collection_id: "COL-01-NRT" }],
    items: [],
    bosses: [{ id: "dio", name: "Dio Brando", slug: "dio_brando", collection_id: "COL-01-JOJO" }],
  };

  const form = matchMediaEntity(parseMediaFilename("COL-NRT_character_naruto_uzumaki_form_sage_mode.jpg"), catalog);
  const appearance = matchMediaEntity(parseMediaFilename("COL-JOJO_boss_dio_brando_appearance_dio.jpg"), catalog);

  assert.equal(form.matchStatus, "MATCHED");
  assert.equal(form.matchedEntity.id, "naruto");
  assert.deepEqual(form.mediaState, { type: "form", slug: "sage_mode", fullSlug: "naruto_uzumaki_form_sage_mode", baseSlug: "naruto_uzumaki" });

  assert.equal(appearance.matchStatus, "MATCHED");
  assert.equal(appearance.matchedEntity.id, "dio");
  assert.equal(appearance.mediaState.type, "appearance");
});

test("parser mantém compatibilidade com os filenames numéricos anteriores", () => {
  const result = parseMediaFilename("COL-01-AOT_character_lara_tybur.jpg");
  assert.equal(result.valid, true);
  assert.equal(result.collectionCodeCanonical, "COL-01-AOT");
});

test("parser continua bloqueando path traversal", () => {
  const result = parseMediaFilename("../COL-AOT_character_eren_yeager.jpg");
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
