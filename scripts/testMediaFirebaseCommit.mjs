// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Phase 4B Media Firebase Commit Pipeline Test Suite
// ════════════════════════════════════════════════════════════════════════════

import assert from "node:assert";
import {
  ZIP_SAFETY_LIMITS,
  validateZipEntryPath,
  calculateSha256,
  detectMimeType,
  buildCanonicalMediaStoragePath,
  analyzeMediaFile,
  preflightAnalyzePackage,
  validateAdminAuthForCommit,
  commitMediaPackage
} from "../services/media/mediaCommitService.js";

import { CANONICAL_COLLECTION_CODES, resolveCollectionCodeStrict } from "../lib/collectionCodes.js";

async function runTests() {
  console.log("==================================================");
  console.log("DECKVERSE OS — PHASE 4B MEDIA FIREBASE COMMIT TEST");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ TEST ${total}: ${description}`);
    } catch (err) {
      console.error(`  ✕ TEST ${total} FAILED: ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(description, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ TEST ${total}: ${description}`);
    } catch (err) {
      console.error(`  ✕ TEST ${total} FAILED: ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // ── 1. ZIP SAFETY & PATH TRAVERSAL ──────────────────────────────────────
  test("Zip path traversal detection ('../')", () => {
    const check = validateZipEntryPath("../etc/passwd");
    assert.strictEqual(check.safe, false);
    assert.strictEqual(check.reason, "PATH_TRAVERSAL_DETECTED");
  });

  test("Zip path traversal detection (leading slash)", () => {
    const check = validateZipEntryPath("/var/www/image.jpg");
    assert.strictEqual(check.safe, false);
    assert.strictEqual(check.reason, "PATH_TRAVERSAL_DETECTED");
  });

  test("Zip valid entry path allowed", () => {
    const check = validateZipEntryPath("COL-01-AOT__character__eren_yeager.jpg");
    assert.strictEqual(check.safe, true);
  });

  // ── 2. MAGIC BYTES & MIME DETECTION ──────────────────────────────────────
  test("Magic bytes: PNG detection", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const res = detectMimeType(pngBytes, "test.png");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mime, "image/png");
  });

  test("Magic bytes: JPEG detection", () => {
    const jpgBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const res = detectMimeType(jpgBytes, "test.jpg");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mime, "image/jpeg");
  });

  test("Magic bytes: WEBP detection", () => {
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x38, 0x20
    ]);
    const res = detectMimeType(webpBytes, "test.webp");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.mime, "image/webp");
  });

  test("Magic bytes: Reject HTML/script content masquerading as image", () => {
    const htmlBytes = new TextEncoder().encode("<!DOCTYPE html><html><script>alert(1)</script></html>");
    const res = detectMimeType(htmlBytes, "fake.jpg");
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, "FORBIDDEN_FILE_TYPE_SCRIPT_OR_SVG");
  });

  // ── 3. CANONICAL STORAGE PATH BUILDING ──────────────────────────────────
  test("Canonical Storage Path building with strict collection code", () => {
    const path = buildCanonicalMediaStoragePath("COL-01-BER", "character", "guts.webp");
    assert.strictEqual(path, "deckverse-media/COL-01-BER/character/guts.webp");
  });

  test("Canonical Storage Path building rejects forbidden entityTypes (metadata)", () => {
    assert.throws(() => {
      buildCanonicalMediaStoragePath("COL-01-BER", "metadata", "lore.webp");
    }, /Forbidden entityType/);
  });

  // ── 4. SHA-256 HASH CALCULATION ─────────────────────────────────────────
  await testAsync("SHA-256 calculation produces consistent hex string", async () => {
    const data = new TextEncoder().encode("DeckVerse OS Media Test");
    const hash = await calculateSha256(data);
    assert.strictEqual(typeof hash, "string");
    assert.strictEqual(hash.length, 64);
  });

  // ── 5. PREFLIGHT ANALYSIS & ENTITY MATCHING ─────────────────────────────
  await testAsync("Preflight analyze package classifies READY, NOT_FOUND, INVALID", async () => {
    const mockCatalog = {
      collections: [{ code: "COL-01-AOT", name: "Attack on Titan" }],
      cards: [{ id: "c1", name: "Eren Yeager", collection_id: "COL-01-AOT", slug: "eren_yeager" }],
      items: [],
      bosses: []
    };

    const validJpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x00, 0x00]);

    const files = [
      { name: "COL-01-AOT__character__eren_yeager.jpg", data: validJpg },
      { name: "COL-01-AOT__character__unknown_guy.jpg", data: validJpg },
      { name: "invalid_filename_without_separator.jpg", data: validJpg }
    ];

    const report = await preflightAnalyzePackage(files, mockCatalog, []);

    assert.strictEqual(report.counts.totalFiles, 3);
    assert.strictEqual(report.counts.ready, 1);
    assert.strictEqual(report.counts.notFound, 1);
    assert.strictEqual(report.counts.invalid, 1);

    const readyItem = report.items.find(i => i.originalFilename.includes("eren_yeager"));
    assert.strictEqual(readyItem.status, "READY");
    assert.strictEqual(readyItem.entityKey, "COL-01-AOT::character::eren_yeager");
    assert.strictEqual(readyItem.storagePath, "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg");
  });

  // ── 6. AUTH & PERSISTENCE MODE COMMIT PRE-CHECK ────────────────────────
  await testAsync("Commit blocked when in LOCAL persistence mode with clear message", async () => {
    const authCheck = await validateAdminAuthForCommit({ isMockMode: false });
    assert.strictEqual(authCheck.allowed, false);
    assert.ok(authCheck.reason.includes("PERSISTENCE_MODE_LOCAL") || authCheck.reason.includes("Ative o modo Firebase"));
  });

  // ── 7. TRANSACTION SAFETY & COMPENSATION / ROLLBACK ─────────────────────
  await testAsync("Commit rollback logic: Storage upload failure produces zero writes", async () => {
    const preflightReport = {
      items: [{
        docId: "COL-01-AOT_character_eren_yeager__primary",
        entityKey: "COL-01-AOT::character::eren_yeager",
        collectionCode: "COL-01-AOT",
        entityType: "character",
        mediaRole: "primary",
        storagePath: "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg",
        originalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        canonicalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        status: "READY",
        fileData: new Uint8Array([0xFF, 0xD8, 0xFF]),
        mimeType: "image/jpeg",
        byteSize: 3,
        sha256: "dummy_sha256"
      }]
    };

    const commitResult = await commitMediaPackage(preflightReport, {
      isMockMode: true,
      mockUpload: false, // will fail as storage is unconfigured
      bypassAuthForTest: true
    });

    assert.strictEqual(commitResult.success, false);
    assert.strictEqual(commitResult.committedCount, 0);
    assert.strictEqual(commitResult.failedCount, 1);
  });

  await testAsync("Compensation logic: Storage upload succeeds but Firestore write fails -> orphan cleanup attempted", async () => {
    const preflightReport = {
      items: [{
        docId: "COL-01-AOT_character_eren_yeager__primary",
        entityKey: "COL-01-AOT::character::eren_yeager",
        collectionCode: "COL-01-AOT",
        entityType: "character",
        mediaRole: "primary",
        storagePath: "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg",
        originalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        canonicalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        status: "READY",
        fileData: new Uint8Array([0xFF, 0xD8, 0xFF]),
        mimeType: "image/jpeg",
        byteSize: 3,
        sha256: "dummy_sha256"
      }]
    };

    const commitResult = await commitMediaPackage(preflightReport, {
      isMockMode: true,
      mockUpload: true,
      mockWriteError: true, // Trigger write failure after upload
      bypassAuthForTest: true
    });

    assert.strictEqual(commitResult.success, false);
    assert.strictEqual(commitResult.committedCount, 0);
    assert.strictEqual(commitResult.failedCount, 1);
    assert.strictEqual(commitResult.results[0].status, "FAILED_ROLLED_BACK");
  });

  await testAsync("Compensation logic: Storage cleanup failure flags orphanCleanupRequired", async () => {
    const preflightReport = {
      items: [{
        docId: "COL-01-AOT_character_eren_yeager__primary",
        entityKey: "COL-01-AOT::character::eren_yeager",
        collectionCode: "COL-01-AOT",
        entityType: "character",
        mediaRole: "primary",
        storagePath: "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg",
        originalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        canonicalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        status: "READY",
        fileData: new Uint8Array([0xFF, 0xD8, 0xFF]),
        mimeType: "image/jpeg",
        byteSize: 3,
        sha256: "dummy_sha256"
      }]
    };

    const commitResult = await commitMediaPackage(preflightReport, {
      isMockMode: true,
      mockUpload: true,
      mockWriteError: true,
      mockStorageDeleteFail: true, // Cleanup also fails
      bypassAuthForTest: true
    });

    assert.strictEqual(commitResult.success, false);
    assert.strictEqual(commitResult.orphanCleanupRequired, true);
    assert.strictEqual(commitResult.results[0].status, "FAILED_ORPHAN_CLEANUP_REQUIRED");
  });

  // ── 8. SUCCESSFUL COMMIT & FIRESTORE INDEX VERIFICATION ─────────────────
  await testAsync("Successful commit writes mediaIndex record cleanly", async () => {
    const preflightReport = {
      items: [{
        docId: "COL-01-AOT_character_eren_yeager__primary",
        entityKey: "COL-01-AOT::character::eren_yeager",
        collectionCode: "COL-01-AOT",
        entityType: "character",
        mediaRole: "primary",
        storagePath: "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg",
        originalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        canonicalFilename: "COL-01-AOT__character__eren_yeager.jpg",
        status: "READY",
        fileData: new Uint8Array([0xFF, 0xD8, 0xFF]),
        mimeType: "image/jpeg",
        byteSize: 3,
        sha256: "sha256_eren_yeager_test"
      }]
    };

    const mockMediaIndex = [];
    const commitResult = await commitMediaPackage(preflightReport, {
      isMockMode: true,
      mockUpload: true,
      mockWrite: true,
      mockMediaIndex,
      bypassAuthForTest: true
    });

    assert.strictEqual(commitResult.success, true);
    assert.strictEqual(commitResult.committedCount, 1);
    assert.strictEqual(commitResult.failedCount, 0);
    assert.strictEqual(mockMediaIndex.length, 1);
    assert.strictEqual(mockMediaIndex[0].id, "COL-01-AOT_character_eren_yeager__primary");
    assert.strictEqual(mockMediaIndex[0].storagePath, "deckverse-media/COL-01-AOT/character/COL-01-AOT__character__eren_yeager.jpg");
    assert.strictEqual(mockMediaIndex[0].source, "admin_upload");
    assert.strictEqual(mockMediaIndex[0].status, "active");
  });

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");
}

runTests();
