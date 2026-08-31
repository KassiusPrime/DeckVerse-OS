import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { getFirestoreDb, getFirebaseStorage } from "../firebase/firebaseClient.js";
import { slugifyMigrationName, entityCollectionCode } from "./bossMigrationPolicy.js";

async function all(name) {
  const snap = await getDocs(collection(getFirestoreDb(), name));
  return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function cleanupLegacyBossMediaAfterCanonicalImport() {
  const [mediaIndex, characters] = await Promise.all([all("mediaIndex"), all("characters")]);
  const legacy = mediaIndex.filter((record) => record.legacySourceEntityType === "boss");
  const canonical = mediaIndex.filter((record) => record.legacySourceEntityType !== "boss" && record.status !== "deleted");
  const canonicalByEntityKey = new Map(canonical.filter((record) => record.entityKey && record.downloadURL).map((record) => [String(record.entityKey), record]));
  let formsRelinked = 0;

  for (const character of characters) {
    if (!Array.isArray(character.forms) || !character.forms.some((form) => form?.legacyBossId)) continue;
    const code = entityCollectionCode(character);
    const baseSlug = slugifyMigrationName(character.slug || character.name || character.canonicalName || character.title);
    let changed = false;
    const forms = character.forms.map((form) => {
      if (!form?.legacyBossId) return form;
      const stateSlug = slugifyMigrationName(form.slug || form.name || form.legacyBossId);
      const mediaSlug = form.mediaSlug || `${baseSlug}_form_${stateSlug}`;
      const record = canonicalByEntityKey.get(`${code}::character::${mediaSlug}`);
      if (!record?.downloadURL) return form;
      changed = true;
      formsRelinked += 1;
      return { ...form, mediaSlug, image_url: record.downloadURL, legacyMediaCleaned: true };
    });
    if (changed) await setDoc(doc(getFirestoreDb(), "characters", character.id), { forms, updated_at: new Date().toISOString() }, { merge: true });
  }

  let storageDeleted = 0;
  let storageDeleteErrors = 0;
  for (const record of legacy) {
    if (record.storagePath) {
      try {
        await deleteObject(ref(getFirebaseStorage(), record.storagePath));
        storageDeleted += 1;
      } catch (error) {
        console.warn("[LegacyBossMediaCleanup] Could not delete", record.storagePath, error?.code || error?.message);
        storageDeleteErrors += 1;
      }
    }
    await deleteDoc(doc(getFirestoreDb(), "mediaIndex", record.id));
  }

  return { legacyRecordsRemoved: legacy.length, storageDeleted, storageDeleteErrors, formsRelinked };
}

export default { cleanupLegacyBossMediaAfterCanonicalImport };
