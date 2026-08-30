import assert from "assert";
import { parseMediaFilename } from "../services/media/mediaFilenameParser.js";
import { matchMediaEntity } from "../services/media/mediaEntityMatcher.js";
import { calculateMediaCoverage, preflightFileList } from "../services/media/mediaImportService.js";
import { hasUsableMedia } from "../services/ai/dataQualityEngine.js";
import { entityRepository } from "../core/entityRepository.js";

console.log("🧪 [TEST] Iniciando testes do Media Manager Phase 1...\n");

async function runMediaManagerTests() {
  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${description}:`, err.message);
      throw err;
    }
  }

  test("Parser: collection cover legado continua compatível", () => {
    const res = parseMediaFilename("COL-01-BER__collection__cover.jpg");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.collectionCodeCanonical, "COL-01-BER");
    assert.strictEqual(res.entityType, "collection");
    assert.strictEqual(res.slug, "cover");
    assert.strictEqual(res.extension, ".jpg");
    assert.strictEqual(res.namingStyle, "double-underscore-legacy");
  });

  test("Parser: legacy collection alias é resolvido", () => {
    const res = parseMediaFilename("COL-01-BSK__character__guts.png");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.collectionCodeInput, "COL-01-BSK");
    assert.strictEqual(res.collectionCodeCanonical, "COL-01-BER");
    assert.strictEqual(res.isLegacyCollectionAlias, true);
    assert.strictEqual(res.entityType, "character");
    assert.strictEqual(res.slug, "guts");
    assert.strictEqual(res.extension, ".png");
  });

  test("Parser: item e boss legados permanecem válidos", () => {
    const itemRes = parseMediaFilename("COL-01-FMA__item__philosophers_stone.jpg");
    assert.strictEqual(itemRes.valid, true);
    assert.strictEqual(itemRes.entityType, "item");
    assert.strictEqual(itemRes.slug, "philosophers_stone");

    const bossRes = parseMediaFilename("COL-01-DS__boss__muzan_kibutsuji.webp");
    assert.strictEqual(bossRes.valid, true);
    assert.strictEqual(bossRes.entityType, "boss");
    assert.strictEqual(bossRes.slug, "muzan_kibutsuji");
  });

  test("Parser: extensão não permitida é rejeitada", () => {
    const gifRes = parseMediaFilename("COL-01-BER_character_guts.gif");
    assert.strictEqual(gifRes.valid, false);
    assert.strictEqual(gifRes.error, "INVALID_EXTENSION");

    const exeRes = parseMediaFilename("COL-01-BER_character_guts.exe");
    assert.strictEqual(exeRes.valid, false);
    assert.strictEqual(exeRes.error, "INVALID_EXTENSION");
  });

  test("Parser: metadata/lore são recusados", () => {
    const metaRes = parseMediaFilename("COL-01-BER__metadata__lore_entry.jpg");
    assert.strictEqual(metaRes.valid, false);
    assert.strictEqual(metaRes.error, "METADATA_NOT_ACCEPTED");

    const loreRes = parseMediaFilename("COL-01-BER__lore__chronicle.png");
    assert.strictEqual(loreRes.valid, false);
    assert.strictEqual(loreRes.error, "METADATA_NOT_ACCEPTED");
  });

  test("Parser: código de coleção desconhecido retorna COLLECTION_CODE_UNKNOWN", () => {
    const res = parseMediaFilename("COL-99-INVALID_character_test.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "COLLECTION_CODE_UNKNOWN");
  });

  test("Parser: padrão canônico atual de underline simples é aceito", () => {
    const res = parseMediaFilename("COL-01-BER_character_guts.jpg");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.collectionCodeCanonical, "COL-01-BER");
    assert.strictEqual(res.entityType, "character");
    assert.strictEqual(res.slug, "guts");
    assert.strictEqual(res.namingStyle, "single-underscore-canonical");
  });

  test("Parser: capa canônica atual é aceita", () => {
    const res = parseMediaFilename("COL-01-BER_collection_cover.jpg");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.entityType, "collection");
    assert.strictEqual(res.slug, "cover");
  });

  test("Parser: tentativa de path traversal é bloqueada", () => {
    const res = parseMediaFilename("../COL-01-BER_character_guts.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "PATH_TRAVERSAL_ATTEMPT");
  });

  const mockCatalog = {
    collections: [
      { id: "col-1", code: "COL-01-BER", name: "Berserk" },
      { id: "col-2", code: "COL-01-NRT", name: "Naruto" }
    ],
    cards: [
      { id: "c1", card_id: "BER-GUTS-001", name: "Guts", collection_id: "COL-01-BER", slug: "guts" },
      { id: "c2", card_id: "NRT-NARUTO-001", name: "Naruto Uzumaki", collection_id: "COL-01-NRT", slug: "naruto_uzumaki" }
    ],
    items: [
      { id: "i1", item_id: "BER-ITEM-001", name: "Dragon Slayer", collection_id: "COL-01-BER", slug: "dragon_slayer" }
    ],
    bosses: [
      { id: "b1", boss_id: "NRT-BOSS-001", name: "Kaguya Otsutsuki", collection_id: "COL-01-NRT", slug: "kaguya_otsutsuki" }
    ]
  };

  test("Matcher: entidade encontrada com filename canônico atual", () => {
    const parsed = parseMediaFilename("COL-01-BER_character_guts.jpg");
    const match = matchMediaEntity(parsed, mockCatalog);
    assert.strictEqual(match.matchStatus, "MATCHED");
    assert.strictEqual(match.matchedEntity?.id, "c1");
  });

  test("Matcher: entidade não encontrada", () => {
    const parsed = parseMediaFilename("COL-01-BER_character_non_existent.jpg");
    const match = matchMediaEntity(parsed, mockCatalog);
    assert.strictEqual(match.matchStatus, "NOT_FOUND");
    assert.strictEqual(match.matchedEntity, null);
  });

  test("Preflight: conflito por múltiplas imagens para o mesmo alvo", () => {
    const files = [
      "COL-01-BER_character_guts.jpg",
      "COL-01-BER_character_guts.png"
    ];
    const report = preflightFileList(files, mockCatalog);
    assert.strictEqual(report.totalFiles, 2);
    assert.strictEqual(report.conflicts, 2);
    assert.strictEqual(report.writesPerformed, 0);
  });

  test("Media Safety: placeholders e Unsplash não contam como mídia real", () => {
    const unsplashEntity = { image_url: "https://images.unsplash.com/photo-12345" };
    const placeholderEntity = { image_url: "/assets/placeholders/entity.svg" };
    const realEntity = { image_url: "https://i.imgur.com/real_art.png" };

    assert.strictEqual(hasUsableMedia(unsplashEntity), false);
    assert.strictEqual(hasUsableMedia(placeholderEntity), false);
    assert.strictEqual(hasUsableMedia(realEntity), true);
  });

  test("Preflight Guarantee: nenhum preflight realiza escrita", () => {
    const files = ["COL-01-BER_collection_cover.jpg", "COL-01-BER_character_guts.png"];
    const report = preflightFileList(files, mockCatalog);
    assert.strictEqual(report.writesPerformed, 0);
  });

  test("Media Coverage: cálculo dinâmico não assume contagens estáticas", () => {
    const expectedTotal = mockCatalog.collections.length + mockCatalog.cards.length + mockCatalog.items.length + mockCatalog.bosses.length;
    const coverage = calculateMediaCoverage(mockCatalog);
    assert.strictEqual(coverage.totalMediaEligible, expectedTotal);
    assert.strictEqual(coverage.itemsTotal, mockCatalog.items.length);
    assert.strictEqual(coverage.coverageAccountingValid, true);
    assert.strictEqual(coverage.realUsableMedia, 0);
    assert.strictEqual(coverage.missingRealMedia, expectedTotal);
    assert.strictEqual(coverage.unsplashConsideredUsable, 0);
    assert.strictEqual(coverage.localPlaceholderConsideredUsable, 0);
  });

  test("Media Coverage Real Repository Invariants", async () => {
    const realItems = await entityRepository.getAllItems();
    const realCols = await entityRepository.getAllCollections();
    const realCards = await entityRepository.getAllCards();
    const realBosses = await entityRepository.getAllBosses();

    assert.ok(Array.isArray(realItems), "getAllItems() deve retornar um Array");
    assert.ok(realItems.length > 0, "A fonte real de Item deve possuir itens registrados");

    const realCatalog = { collections: realCols, cards: realCards, items: realItems, bosses: realBosses };
    const cov = calculateMediaCoverage(realCatalog);

    assert.strictEqual(cov.itemsTotal, realItems.length);
    assert.strictEqual(cov.collectionsTotal, realCols.length);
    assert.strictEqual(cov.charactersTotal, realCards.length);
    assert.strictEqual(cov.bossesTotal, realBosses.length);
    assert.strictEqual(cov.totalMediaEligible, cov.collectionsTotal + cov.charactersTotal + cov.itemsTotal + cov.bossesTotal);
    assert.strictEqual(cov.coverageAccountingValid, true);
    assert.ok(cov.itemsMissingMedia > 0);

    assert.throws(() => {
      calculateMediaCoverage({ collections: realCols, cards: realCards, bosses: realBosses });
    }, /MEDIA_COVERAGE_ERROR/);
  });

  console.log(`\n📊 RESULTADO DOS TESTES DO MEDIA MANAGER: ${passed}/${total} Passaram`);
}

runMediaManagerTests().catch(err => {
  console.error("❌ Falha nos testes de mídia:", err);
  process.exit(1);
});
