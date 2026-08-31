import { collection, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { getFirestoreDb, getFirebaseStorage } from "../firebase/firebaseClient.js";
import { parseMediaFilename } from "../media/mediaFilenameParser.js";
import { isRetiredCollection } from "../../src/data/retiredCollections.js";
import { classifyLegacyBoss, entityCollectionCode, slugifyMigrationName } from "./bossMigrationPolicy.js";

const now = () => new Date().toISOString();
const directImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || "";

async function readCollection(name) {
  const snap = await getDocs(collection(getFirestoreDb(), name));
  return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

function mediaParsed(record) {
  const filename = record?.canonicalFilename || record?.originalFilename || record?.filename || "";
  return filename ? parseMediaFilename(filename) : null;
}

function mediaCollectionCode(record) {
  const parsed = mediaParsed(record);
  return String(record?.collectionId || record?.collectionCode || parsed?.collectionCodeCanonical || "").trim().toUpperCase();
}

function mediaSlug(record) {
  const parsed = mediaParsed(record);
  if (parsed?.valid) return parsed.slug;
  const key = String(record?.entityKey || "");
  return key.includes("::") ? key.split("::").pop() : "";
}

function mediaType(record) {
  const parsed = mediaParsed(record);
  return String(record?.entityType || parsed?.entityType || "").toLowerCase();
}

function extensionOf(record) {
  const name = record?.canonicalFilename || record?.originalFilename || record?.filename || "";
  const match = String(name).toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
  return match ? `.${match[1] === "jpeg" ? "jpg" : match[1]}` : ".jpg";
}

async function deleteDocsInChunks(entries) {
  let deleted = 0;
  for (let offset = 0; offset < entries.length; offset += 400) {
    const batch = writeBatch(getFirestoreDb());
    entries.slice(offset, offset + 400).forEach(({ collectionName, id }) => batch.delete(doc(getFirestoreDb(), collectionName, id)));
    await batch.commit();
    deleted += Math.min(400, entries.length - offset);
  }
  return deleted;
}

export async function cleanupRetiredCollectibleFamilies() {
  const names = ["collections", "dynamicRegistry", "characters", "items", "bosses", "mediaIndex"];
  const data = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readCollection(name)])));
  const mediaToDelete = data.mediaIndex.filter((record) => isRetiredCollection(mediaCollectionCode(record)));
  const storage = getFirebaseStorage();
  const storageResults = { deleted: 0, missingOrBlocked: 0 };

  for (const record of mediaToDelete) {
    if (!record.storagePath) continue;
    try {
      await deleteObject(ref(storage, record.storagePath));
      storageResults.deleted += 1;
    } catch (error) {
      // Missing objects are harmless; Firestore cleanup remains authoritative.
      console.warn("[RetiredCleanup] Storage object could not be deleted:", record.storagePath, error?.code || error?.message);
      storageResults.missingOrBlocked += 1;
    }
  }

  const targets = [];
  for (const name of names) {
    for (const entry of data[name]) {
      const code = name === "mediaIndex" ? mediaCollectionCode(entry) : (entry.code || entry.collectionCode || entry.collection_id || entry.id);
      if (isRetiredCollection(code)) targets.push({ collectionName: name, id: entry.id });
    }
  }

  const deletedDocuments = await deleteDocsInChunks(targets);
  await setDoc(doc(getFirestoreDb(), "systemMigrations", "retire-mythology-history-2026-08-30"), {
    id: "retire-mythology-history-2026-08-30",
    status: "complete",
    retiredPrefixes: ["COL-05-", "COL-06-"],
    deletedDocuments,
    storageResults,
    completedAt: now(),
  }, { merge: true });

  return { deletedDocuments, storageResults, removedByCollection: targets.reduce((acc, item) => { acc[item.collectionName] = (acc[item.collectionName] || 0) + 1; return acc; }, {}) };
}

function bossMediaRecords(boss, mediaIndex) {
  const code = entityCollectionCode(boss);
  const slug = slugifyMigrationName(boss?.slug || boss?.name || boss?.title || boss?.id);
  return mediaIndex.filter((record) => mediaType(record) === "boss" && mediaCollectionCode(record) === code && mediaSlug(record) === slug);
}

function canonicalMediaPatch(record, code, slug, { form = false, baseSlug = "" } = {}) {
  const targetSlug = form ? `${baseSlug}_form_${slug}` : slug;
  return {
    entityType: "character",
    entityKey: `${code}::character::${targetSlug}`,
    collectionId: code,
    canonicalFilename: `${code}__character__${targetSlug}${extensionOf(record)}`,
    legacySourceEntityType: "boss",
    migratedAt: now(),
  };
}

function bossMetadata(boss) {
  const { image_url, imageUrl, img, media_url, mediaUrl, ...metadata } = boss || {};
  return metadata;
}

export async function migrateLegacyBossCatalog() {
  const [bosses, characters, mediaIndex] = await Promise.all([
    readCollection("bosses"),
    readCollection("characters"),
    readCollection("mediaIndex"),
  ]);
  const existingIds = new Set(characters.map((character) => String(character.id)));
  const summary = { total: bosses.length, mergedIntoCharacter: 0, convertedToCharacter: 0, convertedToForm: 0, mediaRelinked: 0, errors: [] };

  for (const boss of bosses) {
    try {
      const classification = classifyLegacyBoss(boss, characters);
      const code = classification.collectionCode;
      const bossSlug = classification.bossSlug;
      if (!code || !bossSlug) throw new Error("Boss sem coleção/slug canônico");
      const relatedMedia = bossMediaRecords(boss, mediaIndex);
      const batch = writeBatch(getFirestoreDb());

      if (classification.kind === "form") {
        const base = classification.baseCharacter;
        const baseSlug = slugifyMigrationName(base?.slug || base?.name || base?.canonicalName || base?.title);
        const formSlug = `${baseSlug}_form_${bossSlug}`;
        const forms = Array.isArray(base.forms) ? [...base.forms] : [];
        if (!forms.some((entry) => slugifyMigrationName(entry?.mediaSlug || entry?.slug || entry?.name) === slugifyMigrationName(formSlug))) {
          forms.push({
            id: `legacy-form:${boss.id}`,
            name: boss.name || boss.title || bossSlug,
            slug: bossSlug,
            mediaSlug: formSlug,
            image_url: relatedMedia[0]?.downloadURL || directImage(boss),
            legacyBossId: boss.id,
            source: "legacy-boss-migration",
            isBossForm: true,
            bossMetadata: bossMetadata(boss),
          });
        }
        batch.set(doc(getFirestoreDb(), "characters", base.id), { forms, updated_at: now() }, { merge: true });
        relatedMedia.forEach((record) => {
          batch.set(doc(getFirestoreDb(), "mediaIndex", record.id), canonicalMediaPatch(record, code, bossSlug, { form: true, baseSlug }), { merge: true });
          summary.mediaRelinked += 1;
        });
        summary.convertedToForm += 1;
      } else {
        const exact = classification.baseCharacter;
        let targetId = exact?.id;
        if (!targetId) {
          targetId = existingIds.has(String(boss.id)) ? `char_from_${boss.id}` : String(boss.id || `char_${Date.now()}`);
          existingIds.add(targetId);
          const entityKey = `${code}::character::${bossSlug}`;
          const payload = {
            ...boss,
            id: targetId,
            entityType: "character",
            type: "character",
            collectionCode: code,
            collection_id: code,
            slug: bossSlug,
            entityKey,
            isBoss: true,
            legacyBossId: boss.id,
            legacyBoss: false,
            source: "legacy-boss-migration",
            migratedAt: now(),
          };
          batch.set(doc(getFirestoreDb(), "characters", targetId), payload, { merge: true });
          characters.push(payload);
          summary.convertedToCharacter += 1;
        } else {
          batch.set(doc(getFirestoreDb(), "characters", targetId), {
            isBoss: true,
            legacyBossId: boss.id,
            bossMetadata: bossMetadata(boss),
            updated_at: now(),
          }, { merge: true });
          summary.mergedIntoCharacter += 1;
        }

        relatedMedia.forEach((record) => {
          batch.set(doc(getFirestoreDb(), "mediaIndex", record.id), canonicalMediaPatch(record, code, bossSlug), { merge: true });
          summary.mediaRelinked += 1;
        });
      }

      batch.delete(doc(getFirestoreDb(), "bosses", boss.id));
      await batch.commit();
    } catch (error) {
      summary.errors.push({ bossId: boss.id, name: boss.name, error: error?.message || String(error) });
    }
  }

  await setDoc(doc(getFirestoreDb(), "systemMigrations", "boss-to-character-form-2026-08-30"), {
    id: "boss-to-character-form-2026-08-30",
    status: summary.errors.length ? "completed-with-errors" : "complete",
    ...summary,
    completedAt: now(),
  }, { merge: true });

  return summary;
}

export async function runOwnerCatalogMigration() {
  const retired = await cleanupRetiredCollectibleFamilies();
  const bosses = await migrateLegacyBossCatalog();
  return { retired, bosses };
}

export default { cleanupRetiredCollectibleFamilies, migrateLegacyBossCatalog, runOwnerCatalogMigration };
