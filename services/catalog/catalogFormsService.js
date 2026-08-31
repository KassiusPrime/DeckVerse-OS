import { parseMediaFilename } from "../media/mediaFilenameParser.js";
import { collectionMatches, getEntityCollectionCode, slugifyCatalogName } from "./catalogDataService.js";
import { classifyLegacyBoss } from "../migration/bossMigrationPolicy.js";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export function prettifyFormName(value = "") {
  return String(value || "").replace(/^form[_\s-]*/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function directImage(entity) {
  return entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || entity?.img_art || entity?.img_avatar || "";
}

function getCollectionCode(entity, fallback = "") {
  return getEntityCollectionCode(entity) || String(fallback || "").trim().toUpperCase();
}

function makeCharacterIndex(characters = []) {
  const byCodeAndSlug = new Map();
  for (const character of characters) {
    const code = getCollectionCode(character);
    if (!code) continue;
    const nameSlug = slugifyCatalogName(character?.name || character?.canonicalName || character?.title || "");
    const explicitSlug = slugifyCatalogName(character?.slug || "");
    for (const slug of [nameSlug, explicitSlug].filter(Boolean)) byCodeAndSlug.set(`${code}|${slug}`, character);
  }
  return byCodeAndSlug;
}

function findLongestBaseCharacter(characters = [], collectionCode, formSlug = "") {
  const target = slugifyCatalogName(formSlug);
  if (!target || !collectionCode) return null;
  let best = null;
  let bestLength = 0;
  for (const character of characters) {
    if (getCollectionCode(character) !== collectionCode) continue;
    const slug = slugifyCatalogName(character?.slug || character?.name || character?.canonicalName || character?.title || "");
    if (!slug) continue;
    if ((target === slug || target.startsWith(`${slug}_`) || target.endsWith(`_${slug}`) || target.includes(`_${slug}_`)) && slug.length > bestLength) {
      best = character;
      bestLength = slug.length;
    }
  }
  return best;
}

export function deriveCatalogForms(snapshot = {}) {
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
  const bosses = Array.isArray(snapshot.bosses) ? snapshot.bosses : [];
  const mediaIndex = Array.isArray(snapshot.mediaIndex) ? snapshot.mediaIndex : [];
  const characterIndex = makeCharacterIndex(characters);
  const forms = [];

  for (const character of characters) {
    const collectionCode = getCollectionCode(character);
    const baseSlug = slugifyCatalogName(character?.slug || character?.name || character?.canonicalName || character?.title || "");
    const characterForms = Array.isArray(character?.forms) ? character.forms : [];
    for (const rawForm of characterForms) {
      const form = typeof rawForm === "string" ? { name: rawForm } : (rawForm || {});
      const formName = form.name || form.version_name || form.title || form.formName || form.formId || form.id || "Forma";
      const stateSlug = slugifyCatalogName(form.slug || form.stateSlug || formName);
      const mediaSlug = form.mediaSlug || (baseSlug && stateSlug ? `${baseSlug}_form_${stateSlug}` : stateSlug);
      forms.push({
        ...form,
        id: form.id || form.formId || `form:${collectionCode}:${mediaSlug}`,
        name: prettifyFormName(formName),
        baseName: character?.name || character?.canonicalName || character?.title || "Personagem",
        baseCharacterId: character?.id || character?.card_id || null,
        collectionCode,
        mediaSlug,
        entityType: "character",
        sourceType: "character-form",
        image_url: directImage(form),
      });
    }
  }

  for (const record of mediaIndex) {
    if (!record || record.status === "deleted" || !record.downloadURL) continue;
    const filename = record.canonicalFilename || record.originalFilename || record.filename || "";
    const parsed = parseMediaFilename(filename);
    if (!parsed.valid || parsed.entityType !== "character" || parsed.stateType !== "form") continue;
    const collectionCode = parsed.collectionCodeCanonical;
    const baseCharacter = characterIndex.get(`${collectionCode}|${parsed.baseSlug}`) || findLongestBaseCharacter(characters, collectionCode, parsed.baseSlug);
    forms.push({
      id: `media-form:${collectionCode}:${parsed.slug}`,
      name: prettifyFormName(parsed.stateSlug),
      baseName: baseCharacter?.name || baseCharacter?.canonicalName || prettifyFormName(parsed.baseSlug),
      baseCharacterId: baseCharacter?.id || baseCharacter?.card_id || null,
      collectionCode,
      mediaSlug: parsed.slug,
      entityType: "character",
      sourceType: "media-form",
      image_url: record.downloadURL,
      mediaRecordId: record.id || null,
    });
  }

  // Compatibility window only: an unmigrated legacy Boss is shown as a Form
  // *only* when the semantic migration policy can identify a real base character.
  // Independent bosses disappear from this surface until they are migrated into Character.
  for (const boss of bosses) {
    const classification = classifyLegacyBoss(boss, characters);
    if (classification.kind !== "form" || !classification.baseCharacter) continue;
    const collectionCode = classification.collectionCode;
    const baseCharacter = classification.baseCharacter;
    const bossSlug = classification.bossSlug;
    const baseSlug = slugifyCatalogName(baseCharacter?.slug || baseCharacter?.name || baseCharacter?.canonicalName || baseCharacter?.title || "");
    forms.push({
      ...boss,
      id: `legacy-boss-form:${boss?.id || collectionCode}:${bossSlug}`,
      name: boss?.name || boss?.canonicalName || boss?.title || prettifyFormName(bossSlug),
      baseName: baseCharacter?.name || baseCharacter?.canonicalName || "Personagem",
      baseCharacterId: baseCharacter?.id || baseCharacter?.card_id || null,
      collectionCode,
      mediaSlug: `${baseSlug}_form_${bossSlug}`,
      entityType: "character",
      sourceType: "legacy-boss-form",
      legacyBoss: true,
      image_url: directImage(boss),
    });
  }

  const deduped = new Map();
  for (const form of forms) {
    const code = getCollectionCode(form, form.collectionCode);
    const slug = slugifyCatalogName(form.mediaSlug || form.name || form.id);
    const base = slugifyCatalogName(form.baseName || "");
    const key = `${code}|${base}|${slug}`;
    const current = deduped.get(key);
    if (!current || (!current.image_url && form.image_url) || current.legacyBoss) deduped.set(key, form);
  }

  return [...deduped.values()].sort((a, b) => {
    const collectionOrder = normalize(a.collectionCode).localeCompare(normalize(b.collectionCode), "pt-BR");
    if (collectionOrder !== 0) return collectionOrder;
    return normalize(a.name).localeCompare(normalize(b.name), "pt-BR", { numeric: true });
  });
}

export function formMatchesCollection(form, collection) {
  if (!form || !collection) return false;
  if (collectionMatches(form, collection)) return true;
  const code = normalize(form.collectionCode);
  return [collection.code, collection.collectionCode, collection.id].filter(Boolean).map(normalize).includes(code);
}

export default { deriveCatalogForms, formMatchesCollection, prettifyFormName };
