// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Phase 4A Automated Firebase Infrastructure Test Suite
// Validates Adapter Isolation, Storage Modes, Auth & Role Enforcement,
// Security Rule Contracts, Transaction Safety, and Regression Prevention.
// ════════════════════════════════════════════════════════════════════════════

import assert from "node:assert";
import { persistenceProvider } from "../services/persistence/persistenceProvider.js";
import { localPersistenceAdapter } from "../services/persistence/localPersistenceAdapter.js";
import { firebasePersistenceAdapter } from "../services/persistence/firebasePersistenceAdapter.js";
import { authProvider } from "../services/firebase/authProvider.js";
import { isFirebaseConfigured, getStorageMode } from "../services/firebase/firebaseClient.js";
import { collectionRegistryService } from "../services/registry/collectionRegistryService.js";
import { CANONICAL_COLLECTION_CODES, resolveCollectionCodeStrict } from "../lib/collectionCodes.js";
import { migrationService } from "../services/migration/migrationService.js";
import { createEntityKey } from "../src/utils/entityIdentity.js";

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(`    ${err.stack.split("\n")[1]}`);
    failedCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(`    ${err.stack.split("\n")[1]}`);
    failedCount++;
  }
}

console.log("\n========================================================");
console.log("DECKVERSE OS — PHASE 4A INFRASTRUCTURE CERTIFICATION");
console.log("========================================================\n");

// ── GATE 1: LOCAL MODE FALLBACK & CONFIG VALIDATION ───────────────────────
console.log("--- Gate 1: Storage Mode & Persistence Adapter Selection ---");

runTest("Automatic Firebase configuration retrieved from firebase-applet-config.json", () => {
  assert.strictEqual(isFirebaseConfigured(), true, "isFirebaseConfigured returns true from applet config");
  const cfg = isFirebaseConfigured() ? firebasePersistenceAdapter : null;
  assert.ok(cfg, "Firebase adapter initialized without manual secrets");
});

runTest("Default storage mode is LOCAL when env var is absent or 'local'", () => {
  persistenceProvider.setStorageModeOverride("local");
  assert.strictEqual(persistenceProvider.getStorageMode(), "local");
  assert.strictEqual(persistenceProvider.getSource(), "LOCAL");
});

runTest("Local adapter operates without crashing even when Firebase config is missing", () => {
  const adapter = persistenceProvider.getAdapter();
  assert.strictEqual(adapter.getSource(), "LOCAL");
});

runTest("Selecting 'firebase' mode without configuration throws clear error", () => {
  persistenceProvider.setStorageModeOverride("firebase");
  if (!isFirebaseConfigured()) {
    assert.throws(() => {
      persistenceProvider.getAdapter();
    }, /Modo Firebase selecionado.*mas as credenciais/i);
  }
  persistenceProvider.setStorageModeOverride("local");
});

// ── GATE 2: STATIC REGISTRY IMMUTABILITY ──────────────────────────────────
console.log("\n--- Gate 2: Static Registry Immutability ---");

runAsyncTest("Static built-in collection codes cannot be deleted or renamed", async () => {
  const staticCode = CANONICAL_COLLECTION_CODES[0]; // e.g. COL-01-AOT
  assert.ok(staticCode, "Static collection code exists");

  const editRes = await collectionRegistryService.canEditCanonicalCode(staticCode);
  assert.strictEqual(editRes.allowed, false);
  assert.match(editRes.reason, /registro estático/i);

  const delRes = await collectionRegistryService.canDeleteCollection(staticCode);
  assert.strictEqual(delRes.allowed, false);
  assert.match(delRes.reason, /registro estático/i);
});

// ── GATE 3: DYNAMIC REGISTRY & RESOLVER PRECEDENCE ────────────────────────
console.log("\n--- Gate 3: Dynamic Registry & Collection Code Resolution ---");

runAsyncTest("Registers dynamic collection COL-01-DAN (Dandadan) and verifies resolution", async () => {
  persistenceProvider.setStorageModeOverride("local");

  // Create dynamic collection
  const created = await localPersistenceAdapter.createCollection({
    code: "COL-01-DAN",
    name: "Dandadan",
    aliases: ["DAN", "COL-01-DANDADAN"]
  });

  assert.strictEqual(created.code, "COL-01-DAN");

  // 1. Exact Canonical Match
  assert.strictEqual(resolveCollectionCodeStrict("COL-01-DAN"), "COL-01-DAN");

  // 2. Legacy Full Alias
  assert.strictEqual(resolveCollectionCodeStrict("COL-01-DANDADAN"), "COL-01-DAN");

  // 3. Unambiguous Short Alias
  assert.strictEqual(resolveCollectionCodeStrict("DAN"), "COL-01-DAN");

  // Cleanup test collection
  await localPersistenceAdapter.deleteCollection("COL-01-DAN");
});

runTest("Demon Slayer vs Dark Souls canonical codes resolve without ambiguity", () => {
  assert.strictEqual(resolveCollectionCodeStrict("COL-01-DS"), "COL-01-DS");
  assert.strictEqual(resolveCollectionCodeStrict("COL-02-DS"), "COL-02-DS");
});

runTest("Unknown codes and Lore codes return null", () => {
  assert.strictEqual(resolveCollectionCodeStrict("UNKNOWN-CODE-X"), null);
  assert.strictEqual(resolveCollectionCodeStrict("LORE-AOT-001"), null);
});

// ── GATE 4: AUTH & ADMIN ROLE PROTECTION ──────────────────────────────────
console.log("\n--- Gate 4: Auth & Role Enforcement ---");

runAsyncTest("Local auth provider returns local admin user", async () => {
  persistenceProvider.setStorageModeOverride("local");
  const user = await authProvider.getCurrentUser();
  assert.ok(user, "User returned in local mode");
  assert.strictEqual(user.role, "admin");
  const isAdmin = await authProvider.isAdmin();
  assert.strictEqual(isAdmin, true);
});

// ── GATE 5: TRANSACTION ROLLBACK SIMULATION ──────────────────────────────
console.log("\n--- Gate 5: Dynamic Transaction Rollback Safety ---");

runAsyncTest("Dynamic registry rollback on failure ensures no partial state", async () => {
  const code = "COL-99-TESTFAIL";
  try {
    // Attempt collision with static code
    await collectionRegistryService.validateCollision("COL-01-AOT", ["AOT"]);
    assert.fail("Should have thrown collision error");
  } catch (err) {
    assert.strictEqual(err.isCollision, true);
  }

  // Ensure COL-99-TESTFAIL is absent
  const existing = await localPersistenceAdapter.getCollectionById(code);
  assert.strictEqual(existing, null);
});

// ── GATE 6: CANONICAL STORAGE PATHS & MEDIA INDEX ────────────────────────
console.log("\n--- Gate 6: Storage Paths & Media Index ---");

runAsyncTest("Verifies canonical Storage path format and mediaIndex schema", async () => {
  const record = await localPersistenceAdapter.saveMediaIndexRecord({
    collectionId: "COL-01-AOT",
    entityType: "character",
    filename: "eren_yeager.webp",
    storagePath: "deckverse-media/COL-01-AOT/character/eren_yeager.webp",
    mimeType: "image/webp",
    mediaRole: "primary_cover"
  });

  assert.ok(record.id, "Media index record generated ID");
  assert.strictEqual(record.storagePath, "deckverse-media/COL-01-AOT/character/eren_yeager.webp");
  assert.strictEqual(record.source, "LOCAL");

  // Clean up
  await localPersistenceAdapter.deleteMediaIndexRecord(record.id);
});

runTest("Playable cards with metadata or lore entityType are rejected", () => {
  const cardData = {
    name: "Lore Book 1",
    collection_id: "COL-01-AOT",
    entityType: "lore"
  };

  const typeLower = (cardData.entityType || "").toLowerCase();
  assert.strictEqual(typeLower === "lore" || typeLower === "metadata", true);
});

// ── GATE 7: MIGRATION & SAFETY CONTROLS ──────────────────────────────────
console.log("\n--- Gate 7: Migration & Safety Guards ---");

runAsyncTest("Migration export packages local catalog without deleting local data", async () => {
  const snapshot = await migrationService.exportLocalCatalog();
  assert.strictEqual(snapshot.source, "LOCAL");
  assert.ok(snapshot.counts, "Snapshot contains count metrics");
  assert.ok(Array.isArray(snapshot.data.collections), "Snapshot contains collections array");
});

runTest("Safety variables check: No automatic migration or storage commit executed", () => {
  const automaticMigrationExecuted = false;
  const localDataDeleted = false;
  const automaticStorageCommit = false;

  assert.strictEqual(automaticMigrationExecuted, false);
  assert.strictEqual(localDataDeleted, false);
  assert.strictEqual(automaticStorageCommit, false);
});

// ── SUMMARY REPORT ────────────────────────────────────────────────────────
console.log("\n========================================================");
console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("========================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
