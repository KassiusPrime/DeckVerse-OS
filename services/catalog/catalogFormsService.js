import { parseMediaFilename } from '../media/mediaFilenameParser.js';
import { collectionMatches, getEntityCollectionCode, slugifyCatalogName } from './catalogDataService.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

export function prettifyFormName(value = '') {
  return String(value || '')
    .replace(/^form[_\s-]*/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function directImage(entity) {
  return entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || entity?.img_art || entity?.img_avatar || '';
}

function getCollectionCode(entity, fallback = '') {
  return getEntityCollectionCode(entity) || String(fallback || '').trim().toUpperCase();
}

function getEntityType(entity) {
  const type = String(entity?.entity_type || entity?.entityType || '').trim().toLowerCase();
  return type === 'boss' ? 'boss' : 'character';
}

function makeBaseIndex(entities = []) {
  const byCodeTypeAndSlug = new Map();
  for (const entity of entities) {
    const code = getCollectionCode(entity);
    if (!code) continue;
    const type = getEntityType(entity);
    const nameSlug = slugifyCatalogName(entity?.name || entity?.canonicalName || entity?.title || '');
    const explicitSlug = slugifyCatalogName(entity?.slug || '');
    for (const slug of [nameSlug, explicitSlug].filter(Boolean)) byCodeTypeAndSlug.set(`${code}|${type}|${slug}`, entity);
  }
  return byCodeTypeAndSlug;
}

function findLongestBaseEntity(entities = [], collectionCode, entityType, formSlug = '') {
  const target = slugifyCatalogName(formSlug);
  if (!target || !collectionCode) return null;
  let best = null;
  let bestLength = 0;
  for (const entity of entities) {
    if (getCollectionCode(entity) !== collectionCode || getEntityType(entity) !== entityType) continue;
    const slug = slugifyCatalogName(entity?.slug || entity?.name || entity?.canonicalName || entity?.title || '');
    if (!slug) continue;
    if ((target === slug || target.startsWith(`${slug}_`) || target.includes(`_${slug}_`)) && slug.length > bestLength) {
      best = entity;
      bestLength = slug.length;
    }
  }
  return best;
}

export function deriveCatalogForms(snapshot = {}) {
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
  const bosses = Array.isArray(snapshot.bosses) ? snapshot.bosses : [];
  const baseEntities = [...characters, ...bosses];
  const mediaIndex = Array.isArray(snapshot.mediaIndex) ? snapshot.mediaIndex : [];
  const baseIndex = makeBaseIndex(baseEntities);
  const forms = [];

  for (const baseEntity of baseEntities) {
    const collectionCode = getCollectionCode(baseEntity);
    const entityType = getEntityType(baseEntity);
    const baseSlug = slugifyCatalogName(baseEntity?.slug || baseEntity?.name || baseEntity?.canonicalName || baseEntity?.title || '');
    const entityForms = Array.isArray(baseEntity?.forms) ? baseEntity.forms : [];
    for (const rawForm of entityForms) {
      const form = typeof rawForm === 'string' ? { name: rawForm } : (rawForm || {});
      const formName = form.name || form.version_name || form.title || form.formName || form.formId || form.id || 'Forma';
      const stateSlug = slugifyCatalogName(form.slug || form.stateSlug || formName);
      const mediaSlug = form.mediaSlug || (baseSlug && stateSlug ? `${baseSlug}_form_${stateSlug}` : stateSlug);
      const baseEntityId = baseEntity?.id || baseEntity?.card_id || null;
      forms.push({
        ...form,
        id: form.id || form.formId || `form:${collectionCode}:${entityType}:${mediaSlug}`,
        name: prettifyFormName(formName),
        baseName: baseEntity?.name || baseEntity?.canonicalName || baseEntity?.title || (entityType === 'boss' ? 'Boss' : 'Personagem'),
        baseEntityId,
        baseCharacterId: entityType === 'character' ? baseEntityId : null,
        collectionCode,
        mediaSlug,
        entityType,
        sourceType: `${entityType}-form`,
        image_url: directImage(form),
      });
    }
  }

  // Transitional compatibility for audited ZIP media. Boss remains a first-class
  // entity; a boss form is merely a state attached to that boss, never a character.
  for (const record of mediaIndex) {
    if (!record || record.status === 'deleted' || !record.downloadURL) continue;
    const filename = record.originalFilename || record.canonicalFilename || record.filename || '';
    const parsed = parseMediaFilename(filename);
    if (!parsed.valid || !['character', 'boss'].includes(parsed.entityType) || parsed.stateType !== 'form') continue;
    const collectionCode = parsed.collectionCodeCanonical;
    const baseEntity = baseIndex.get(`${collectionCode}|${parsed.entityType}|${parsed.baseSlug}`) || findLongestBaseEntity(baseEntities, collectionCode, parsed.entityType, parsed.baseSlug);
    const baseEntityId = baseEntity?.id || baseEntity?.card_id || null;
    forms.push({
      id: `media-form:${collectionCode}:${parsed.entityType}:${parsed.slug}`,
      name: prettifyFormName(parsed.stateSlug),
      baseName: baseEntity?.name || baseEntity?.canonicalName || prettifyFormName(parsed.baseSlug),
      baseEntityId,
      baseCharacterId: parsed.entityType === 'character' ? baseEntityId : null,
      collectionCode,
      mediaSlug: parsed.slug,
      entityType: parsed.entityType,
      sourceType: 'media-form',
      image_url: record.downloadURL,
      mediaRecordId: record.id || null,
    });
  }

  const deduped = new Map();
  for (const form of forms) {
    const code = getCollectionCode(form, form.collectionCode);
    const slug = slugifyCatalogName(form.mediaSlug || form.name || form.id);
    const base = slugifyCatalogName(form.baseName || '');
    const key = `${code}|${form.entityType || 'character'}|${base}|${slug}`;
    const current = deduped.get(key);
    if (!current || (!current.image_url && form.image_url)) deduped.set(key, form);
  }

  return [...deduped.values()].sort((a, b) => {
    const collectionOrder = normalize(a.collectionCode).localeCompare(normalize(b.collectionCode), 'pt-BR');
    if (collectionOrder !== 0) return collectionOrder;
    const baseOrder = normalize(a.baseName).localeCompare(normalize(b.baseName), 'pt-BR', { numeric: true });
    if (baseOrder !== 0) return baseOrder;
    return normalize(a.name).localeCompare(normalize(b.name), 'pt-BR', { numeric: true });
  });
}

export function formMatchesCollection(form, collection) {
  if (!form || !collection) return false;
  if (collectionMatches(form, collection)) return true;
  const code = normalize(form.collectionCode);
  return [collection.code, collection.collectionCode, collection.id].filter(Boolean).map(normalize).includes(code);
}

export default { deriveCatalogForms, formMatchesCollection, prettifyFormName };
