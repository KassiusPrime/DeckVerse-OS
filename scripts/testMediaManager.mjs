import assert from "assert";
import { parseMediaFilename } from "../services/media/mediaFilenameParser.js";
import { matchMediaEntity, slugifyText } from "../services/media/mediaEntityMatcher.js";
import { calculateMediaCoverage, preflightFileList, preflightZipImport } from "../services/media/mediaImportService.js";
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

  // 1. Parser: Collection Cover Canônico
  test("Parser: Collection cover canônico (COL-01-BER__collection__cover.jpg)", () => {
    const res = parseMediaFilename("COL-01-BER__collection__cover.jpg");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.collectionCodeCanonical, "COL-01-BER");
    assert.strictEqual(res.entityType, "collection");
    assert.strictEqual(res.slug, "cover");
    assert.strictEqual(res.extension, ".jpg");
    assert.strictEqual(res.isLegacyCollectionAlias, false);
  });

  // 2. Parser: Legacy Collection Alias
  test("Parser: Legacy alias detectado (COL-01-BSK -> COL-01-BER)", () => {
    const res = parseMediaFilename("COL-01-BSK__character__guts.png");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.collectionCodeInput, "COL-01-BSK");
    assert.strictEqual(res.collectionCodeCanonical, "COL-01-BER");
    assert.strictEqual(res.isLegacyCollectionAlias, true);
    assert.strictEqual(res.entityType, "character");
    assert.strictEqual(res.slug, "guts");
    assert.strictEqual(res.extension, ".png");
  });

  // 3. Parser: Item e Boss
  test("Parser: Item e Boss em formatos oficiais", () => {
    const itemRes = parseMediaFilename("COL-01-FMA__item__philosophers_stone.jpg");
    assert.strictEqual(itemRes.valid, true);
    assert.strictEqual(itemRes.entityType, "item");
    assert.strictEqual(itemRes.slug, "philosophers_stone");

    const bossRes = parseMediaFilename("COL-01-DS__boss__muzan_kibutsuji.webp");
    assert.strictEqual(bossRes.valid, true);
    assert.strictEqual(bossRes.entityType, "boss");
    assert.strictEqual(bossRes.slug, "muzan_kibutsuji");
  });

  // 4. Parser: Extensão inválida
  test("Parser: Extensão não permitida (.gif / .exe) é rejeitada", () => {
    const gifRes = parseMediaFilename("COL-01-BER__character__guts.gif");
    assert.strictEqual(gifRes.valid, false);
    assert.strictEqual(gifRes.error, "INVALID_EXTENSION");

    const exeRes = parseMediaFilename("COL-01-BER__character__guts.exe");
    assert.strictEqual(exeRes.valid, false);
    assert.strictEqual(exeRes.error, "INVALID_EXTENSION");
  });

  // 5. Parser: Recusa de Metadata / Lore
  test("Parser: Formato de entidade 'metadata' ou 'lore' é expressamente recusado", () => {
    const metaRes = parseMediaFilename("COL-01-BER__metadata__lore_entry.jpg");
    assert.strictEqual(metaRes.valid, false);
    assert.strictEqual(metaRes.error, "METADATA_NOT_ACCEPTED");

    const loreRes = parseMediaFilename("COL-01-BER__lore__chronicle.png");
    assert.strictEqual(loreRes.valid, false);
    assert.strictEqual(loreRes.error, "METADATA_NOT_ACCEPTED");
  });

  // 6. Parser: Código de coleção desconhecido
  test("Parser: Código de coleção desconhecido/inválido retorna COLLECTION_CODE_UNKNOWN", () => {
    const res = parseMediaFilename("COL-99-INVALID__character__test.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "COLLECTION_CODE_UNKNOWN");
  });

  // 7. Parser: Filename malformado
  test("Parser: Filename sem delimitadores '__' é recusado como MALFORMED_FILENAME", () => {
    const res = parseMediaFilename("COL-01-BER_character_guts.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "MALFORMED_FILENAME");
  });

  // 8. Parser: Tentativa de Path Traversal
  test("Parser: Tentativa de path traversal é bloqueada", () => {
    const res = parseMediaFilename("../COL-01-BER__character__guts.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, "PATH_TRAVERSAL_ATTEMPT");
  });

  // Carregar catálogo mock/real para testes de matcher e preflight
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

  // 9. Matcher: Entidade encontrada com sucesso
  test("Matcher: Entidade encontrada com sucesso (MATCHED)", () => {
    const parsed = parseMediaFilename("COL-01-BER__character__guts.jpg");
    const match = matchMediaEntity(parsed, mockCatalog);
    assert.strictEqual(match.matchStatus, "MATCHED");
    assert.strictEqual(match.matchedEntity?.id, "c1");
  });

  // 10. Matcher: Entidade não encontrada
  test("Matcher: Entidade não encontrada (NOT_FOUND)", () => {
    const parsed = parseMediaFilename("COL-01-BER__character__non_existent.jpg");
    const match = matchMediaEntity(parsed, mockCatalog);
    assert.strictEqual(match.matchStatus, "NOT_FOUND");
    assert.strictEqual(match.matchedEntity, null);
  });

  // 11. Preflight: Detecção de duplicatas (Conflito)
  test("Preflight: Detecção de conflito por múltiplas imagens para o mesmo alvo", () => {
    const files = [
      "COL-01-BER__character__guts.jpg",
      "COL-01-BER__character__guts.png"
    ];
    const report = preflightFileList(files, mockCatalog);
    assert.strictEqual(report.totalFiles, 2);
    assert.strictEqual(report.conflicts, 2);
    assert.strictEqual(report.writesPerformed, 0);
  });

  // 12. Media Safety: Unsplash e Local Placeholders não são considerados mídia utilizável
  test("Media Safety: Placeholders locais e Unsplash não contam como mídia real", () => {
    const unsplashEntity = { image_url: "https://images.unsplash.com/photo-12345" };
    const placeholderEntity = { image_url: "/assets/placeholders/entity.svg" };
    const realEntity = { image_url: "https://i.imgur.com/real_art.png" };

    assert.strictEqual(hasUsableMedia(unsplashEntity), false);
    assert.strictEqual(hasUsableMedia(placeholderEntity), false);
    assert.strictEqual(hasUsableMedia(realEntity), true);
  });

  // 13. Preflight writes = 0
  test("Preflight Guarantee: Nenhum preflight realiza escrita (previewWrites = 0)", () => {
    const files = ["COL-01-BER__collection__cover.jpg", "COL-01-BER__character__guts.png"];
    const report = preflightFileList(files, mockCatalog);
    assert.strictEqual(report.writesPerformed, 0);
  });

  // 14. Cálculo dinâmico de Cobertura de Mídia
  test("Media Coverage: Cálculo dinâmico não assume contagens estáticas", () => {
    const expectedTotal = mockCatalog.collections.length + mockCatalog.cards.length + mockCatalog.items.length + mockCatalog.bosses.length;
    const coverage = calculateMediaCoverage(mockCatalog);
    assert.strictEqual(coverage.totalMediaEligible, expectedTotal);
    assert.strictEqual(coverage.realUsableMedia, 0);
    assert.strictEqual(coverage.missingRealMedia, expectedTotal);
    assert.strictEqual(coverage.unsplashConsideredUsable, 0);
    assert.strictEqual(coverage.localPlaceholderConsideredUsable, 0);
  });

  console.log(`\n📊 RESULTADO DOS TESTES DO MEDIA MANAGER: ${passed}/${total} Passaram`);
}

runMediaManagerTests().catch(err => {
  console.error("❌ Falha nos testes de mídia:", err);
  process.exit(1);
});
