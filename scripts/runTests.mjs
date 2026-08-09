// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Data Quality & Classification Regression Tests
// ════════════════════════════════════════════════════════════════════════════

import { classifyEntityDetail } from "../src/utils/entityClassifier.js";
import { inferCollectionWithConfidence } from "../lib/collectionCodes.js";
import { evaluateEntityPipeline } from "../services/ai/dataQualityEngine.js";

console.log("🧪 Running DeckVerse Data Quality Regression Test Suite...\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

// Test 1: "Naruto Mobile" -> metadata / game
const t1 = classifyEntityDetail({ name: "Naruto Mobile" });
assert(t1.entityType === "metadata" && t1.metadataType === "game", `Naruto Mobile should be metadata/game (Got: ${t1.entityType}/${t1.metadataType})`);

// Test 2: "Earth-616" -> metadata / universe
const t2 = classifyEntityDetail({ name: "Earth-616" });
assert(t2.entityType === "metadata" && t2.metadataType === "universe", `Earth-616 should be metadata/universe (Got: ${t2.entityType}/${t2.metadataType})`);

// Test 3: "The Hero's Bridge!! (volume)" -> metadata / volume
const t3 = classifyEntityDetail({ name: "The Hero's Bridge!! (volume)" });
assert(t3.entityType === "metadata" && t3.metadataType === "volume", `The Hero's Bridge!! (volume) should be metadata/volume (Got: ${t3.entityType}/${t3.metadataType})`);

// Test 4: "Virgil Hawkins (Prime Earth)/Gallery" -> metadata / gallery
const t4 = classifyEntityDetail({ name: "Virgil Hawkins (Prime Earth)/Gallery" });
assert(t4.entityType === "metadata" && t4.metadataType === "gallery", `Virgil Hawkins/Gallery should be metadata/gallery (Got: ${t4.entityType}/${t4.metadataType})`);

// Test 5: "Sage Art: Frog Call" -> metadata / ability
const t5 = classifyEntityDetail({ name: "Sage Art: Frog Call" });
assert(t5.entityType === "metadata" && t5.metadataType === "ability", `Sage Art: Frog Call should be metadata/ability (Got: ${t5.entityType}/${t5.metadataType})`);

// Test 6: "Sword of the Thunder God" -> item
const t6 = classifyEntityDetail({ name: "Sword of the Thunder God" });
assert(t6.entityType === "item", `Sword of the Thunder God should be item (Got: ${t6.entityType})`);

// Test 7: "Saga de Gêmeos" (context Saint Seiya) -> character
const t7 = evaluateEntityPipeline({ name: "Saga de Gêmeos", series: "Saint Seiya", collection_id: "COL-01-SS", hp: 1200, attack: 280, image_url: "https://example.com/saga.jpg", lore: "Cavaleiro de Ouro de Gêmeos de Saint Seiya." });
assert(t7.entityType === "character" && t7.isCardAllowed === true, `Saga de Gêmeos should be character (Got: ${t7.entityType})`);

// Test 8: "Amaterasu" -> character (or protected)
const t8 = classifyEntityDetail({ name: "Amaterasu" });
assert(t8.entityType === "character" && t8.isCardAllowed === true, `Amaterasu should be protected character (Got: ${t8.entityType})`);

// Test 9: "Susanoo" -> character (or protected)
const t9 = classifyEntityDetail({ name: "Susanoo" });
assert(t9.entityType === "character" && t9.isCardAllowed === true, `Susanoo should be protected character (Got: ${t9.entityType})`);

// Test 10: "Miss Martian" -> DC Comics (COL-03-DC)
const c10 = inferCollectionWithConfidence({ name: "Miss Martian" });
assert(c10.collectionCode === "COL-03-DC", `Miss Martian should be DC Comics COL-03-DC (Got: ${c10.collectionCode})`);

// Test 11: "Hamura Ōtsutsuki" -> Naruto (COL-01-NRT)
const c11 = inferCollectionWithConfidence({ name: "Hamura Ōtsutsuki" });
assert(c11.collectionCode === "COL-01-NRT", `Hamura Ōtsutsuki should be Naruto COL-01-NRT (Got: ${c11.collectionCode})`);

// Test 12: "Shikamaru" -> Naruto (COL-01-NRT)
const c12 = inferCollectionWithConfidence({ name: "Shikamaru" });
assert(c12.collectionCode === "COL-01-NRT", `Shikamaru should be Naruto COL-01-NRT (Got: ${c12.collectionCode})`);

// Test 13: "King Bradley" -> Fullmetal Alchemist (COL-01-FMA)
const c13 = inferCollectionWithConfidence({ name: "King Bradley" });
assert(c13.collectionCode === "COL-01-FMA", `King Bradley should be Fullmetal Alchemist COL-01-FMA (Got: ${c13.collectionCode})`);

// Test 14: Fate vs Mesopotamian Mythology
const c14Fate = inferCollectionWithConfidence({ name: "Gilgamesh", series: "Fate/stay night", universe: "Type-Moon", class: "Servant" });
assert(c14Fate.collectionCode === "COL-01-FATE", `Gilgamesh (Fate) should be COL-01-FATE (Got: ${c14Fate.collectionCode})`);

const c14Meso = inferCollectionWithConfidence({ name: "Gilgamesh", series: "Mitologia Babilônica", universe: "Mesopotâmia" });
assert(c14Meso.collectionCode === "COL-05-MESO", `Gilgamesh (Mesopotâmia) should be COL-05-MESO (Got: ${c14Meso.collectionCode})`);

// Test 15: Cross-collection Deduplication Key Distinctness
const thorMarvelKey = `COL-03-MARVEL_thor`;
const thorGowKey = `COL-02-GOW_thor`;
const thorNorseKey = `COL-05-NORSE_thor`;
assert(thorMarvelKey !== thorGowKey && thorGowKey !== thorNorseKey, `Thor cross-collection keys must be distinct (${thorMarvelKey} vs ${thorGowKey} vs ${thorNorseKey})`);

const zeusGowKey = `COL-02-GOW_zeus`;
const zeusGrkKey = `COL-05-GRK_zeus`;
assert(zeusGowKey !== zeusGrkKey, `Zeus GOW vs Greek keys must be distinct (${zeusGowKey} vs ${zeusGrkKey})`);

const hadesSsKey = `COL-01-SS_hades`;
const hadesGrkKey = `COL-05-GRK_hades`;
assert(hadesSsKey !== hadesGrkKey, `Hades Saint Seiya vs Greek keys must be distinct (${hadesSsKey} vs ${hadesGrkKey})`);

// Test 16: Transformations Distinctness
const gokuBaseKey = `COL-01-DBZ_goku_baseform`;
const gokuSSKey = `COL-01-DBZ_goku_supersaiyan`;
const gokuUIKey = `COL-01-DBZ_goku_ultrainstinct`;
assert(gokuBaseKey !== gokuSSKey && gokuSSKey !== gokuUIKey, `Goku transformations must produce distinct keys (${gokuBaseKey} vs ${gokuSSKey} vs ${gokuUIKey})`);

// Test 17: Continuities Distinctness
const batmanPrimeKey = `COL-03-DC_batman_primeearth`;
const batmanEarth2Key = `COL-03-DC_batman_earth2`;
const batmanFlashpointKey = `COL-03-DC_batman_flashpoint`;
assert(batmanPrimeKey !== batmanEarth2Key && batmanEarth2Key !== batmanFlashpointKey, `Batman continuities must produce distinct keys (${batmanPrimeKey} vs ${batmanEarth2Key})`);

// Test 18: "Dune Hero" -> quarantine (syntheticEntity)
const t18 = evaluateEntityPipeline({ name: "Dune Hero" });
assert(t18.primaryState === "quarantine" && t18.flags.syntheticEntity === true, `Dune Hero should be in quarantine as synthetic entity (Got: ${t18.primaryState})`);

console.log(`\n📊 Summary: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✨ ALL REGRESSION TESTS PASSED PERFECTLY!");
}
