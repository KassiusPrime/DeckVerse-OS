import JSZip from 'jszip';
import { parseMediaFilename } from './mediaFilenameParser.js';
import { matchMediaEntity } from './mediaEntityMatcher.js';
import { getSupabaseBrowserClient } from '../supabase/client.js';

export const ZIP_SAFETY_LIMITS = { maxFiles: 1000, maxUncompressedSize: 500 * 1024 * 1024, maxSingleFileSize: 25 * 1024 * 1024, maxDepth: 5 };

export function validateZipEntryPath(relativePath) {
  if (typeof relativePath !== 'string') return { safe: false, reason: 'INVALID_PATH_TYPE' };
  const raw = relativePath.trim();
  if (raw.includes('..') || raw.startsWith('/') || raw.startsWith('\\')) return { safe: false, reason: 'PATH_TRAVERSAL_DETECTED' };
  if (raw.split(/[/\\]/).filter(Boolean).length > ZIP_SAFETY_LIMITS.maxDepth) return { safe: false, reason: 'EXCESSIVE_PATH_DEPTH' };
  return { safe: true };
}

async function calculateSha256(data) {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function detectMimeType(data) {
  if (!data || data.length < 4) return { valid: false, reason: 'FILE_TOO_SMALL' };
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return { valid: true, mime: 'image/png', ext: '.png' };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { valid: true, mime: 'image/jpeg', ext: '.jpg' };
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 && data.length >= 12 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return { valid: true, mime: 'image/webp', ext: '.webp' };
  return { valid: false, reason: 'UNSUPPORTED_MIME_MAGIC_BYTES' };
}

function canonicalFilename(parsed, mime) { return `${parsed.collectionCodeCanonical}__${parsed.entityType}__${parsed.slug}${mime.ext}`; }
function storagePath(parsed, mime) { return `deckverse-media/${parsed.collectionCodeCanonical}/${parsed.entityType}/${canonicalFilename(parsed, mime)}`; }

export async function analyzeMediaFile(rawFilename, data, catalog, existingMediaIndex = []) {
  const safe = validateZipEntryPath(rawFilename);
  if (!safe.safe) return { originalFilename: rawFilename, status: 'INVALID', reason: safe.reason, valid: false };
  const mime = detectMimeType(data);
  if (!mime.valid) return { originalFilename: rawFilename, status: 'INVALID', reason: mime.reason, valid: false };
  const sha256 = await calculateSha256(data);
  const parsed = parseMediaFilename(rawFilename);
  if (!parsed.valid) return { originalFilename: rawFilename, status: 'INVALID', reason: parsed.error, valid: false, sha256 };
  const match = matchMediaEntity(parsed, catalog);
  if (match.matchStatus !== 'MATCHED') return { originalFilename: rawFilename, status: match.matchStatus, reason: match.reason, valid: true, parsed, sha256, matchedEntity: null };
  const entityKey = `${parsed.collectionCodeCanonical}::${parsed.entityType}::${parsed.slug}`;
  const mediaRole = parsed.mediaRole || (parsed.entityType === 'collection' ? 'cover' : 'primary');
  const id = `${entityKey.replace(/::/g, '_')}__${mediaRole}`;
  const path = storagePath(parsed, mime);
  const activeRecord = existingMediaIndex.find((m) => m.id === id || (m.entityKey === entityKey && m.mediaRole === mediaRole && m.status === 'active'));
  const status = activeRecord ? (activeRecord.sha256 === sha256 ? 'ALREADY_EXISTS' : 'REPLACEMENT_REQUIRED') : 'READY';
  return { originalFilename: rawFilename, canonicalFilename: canonicalFilename(parsed, mime), storagePath: path, docId: id, entityKey, collectionCode: parsed.collectionCodeCanonical, entityType: parsed.entityType, mediaRole, status, reason: status === 'READY' ? 'File matched and validated. Ready to commit.' : status === 'ALREADY_EXISTS' ? 'Identical media already exists.' : 'Replacement confirmation required.', valid: true, parsed, mimeType: mime.mime, byteSize: data.length, sha256, matchedEntity: match.matchedEntity, activeRecord, fileData: data };
}

export async function preflightAnalyzePackage(input, catalog = {}, existingMediaIndex = []) {
  const results = [];
  let ignoredFiles = 0;
  let totalBytes = 0;
  const processFile = async (name, data) => { const parsed = parseMediaFilename(name); if (parsed.error === 'SYSTEM_OR_HIDDEN_FILE_IGNORED') { ignoredFiles += 1; return; } const item = await analyzeMediaFile(name, data, catalog, existingMediaIndex); results.push(item); totalBytes += data.length; };
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    const zip = await JSZip.loadAsync(input); const entries = []; zip.forEach((path, entry) => { if (!entry.dir) entries.push({ path, entry }); });
    if (entries.length > ZIP_SAFETY_LIMITS.maxFiles) throw new Error('ZIP_SAFETY_VIOLATION: too many files');
    for (const entry of entries) { if (!validateZipEntryPath(entry.path).safe) { results.push({ originalFilename: entry.path, status: 'INVALID', reason: 'PATH_TRAVERSAL_DETECTED', valid: false }); continue; } const data = await entry.entry.async('uint8array'); if (data.length > ZIP_SAFETY_LIMITS.maxSingleFileSize) { results.push({ originalFilename: entry.path, status: 'INVALID', reason: 'FILE_TOO_LARGE', valid: false }); continue; } await processFile(entry.path, data); }
  } else if (Array.isArray(input)) {
    for (const item of input) { const name = typeof item === 'string' ? item : item.name || item.filename || ''; const data = item.data || item.buffer || (item.arrayBuffer ? new Uint8Array(await item.arrayBuffer()) : null); if (!data) { results.push({ originalFilename: name, status: 'INVALID', reason: 'NO_FILE_DATA_PROVIDED', valid: false }); continue; } await processFile(name, data); }
  }
  if (totalBytes > ZIP_SAFETY_LIMITS.maxUncompressedSize) throw new Error('ZIP_SAFETY_VIOLATION: package exceeds 500MB');
  const targets = new Map();
  for (const item of results) { if (item.status !== 'READY') continue; const key = `${item.entityKey}::${item.mediaRole}`; if (targets.has(key)) { item.status = 'CONFLICT'; item.reason = `CONFLICT: multiple files target ${key}`; const first = targets.get(key); first.status = 'CONFLICT'; first.reason = item.reason; } else targets.set(key, item); }
  return { counts: { totalFiles: results.length, ignoredFiles, ready: results.filter((x) => x.status === 'READY').length, alreadyExists: results.filter((x) => x.status === 'ALREADY_EXISTS').length, replacementRequired: results.filter((x) => x.status === 'REPLACEMENT_REQUIRED').length, notFound: results.filter((x) => x.status === 'NOT_FOUND').length, conflicts: results.filter((x) => x.status === 'CONFLICT').length, invalid: results.filter((x) => x.status === 'INVALID').length }, items: results };
}

export async function validateAdminAuthForCommit() {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, reason: 'AUTH_REQUIRED: Usuário não autenticado.' };
  const { data: profile, error } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
  if (error) return { allowed: false, reason: error.message };
  if (profile?.role !== 'admin' || profile?.status !== 'active') return { allowed: false, reason: 'ADMIN_REQUIRED: conta sem permissão administrativa ativa.' };
  return { allowed: true };
}

async function updateEntityImage(supabase, item, publicUrl) {
  if (item.entityType === 'collection') { const { error } = await supabase.from('collections').update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', item.matchedEntity.id); if (error) throw error; return; }
  const { error } = await supabase.from('cards').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', item.matchedEntity.id);
  if (error) throw error;
}

export async function commitMediaPackage(report, { confirmReplacements = false } = {}) {
  const auth = await validateAdminAuthForCommit();
  if (!auth.allowed) throw new Error(auth.reason);
  const supabase = getSupabaseBrowserClient();
  const committed = []; const failed = [];
  for (const item of report?.items || []) {
    if (!item.valid || !['READY', 'REPLACEMENT_REQUIRED'].includes(item.status) || (item.status === 'REPLACEMENT_REQUIRED' && !confirmReplacements)) continue;
    try {
      const { error: uploadError } = await supabase.storage.from('cards').upload(item.storagePath, item.fileData, { upsert: true, contentType: item.mimeType, cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('cards').getPublicUrl(item.storagePath);
      await updateEntityImage(supabase, item, urlData.publicUrl);
      const { error: metaError } = await supabase.from('media_assets').upsert({ id: item.docId.length === 36 ? item.docId : undefined, collection_id: item.collectionCode, card_id: item.entityType === 'collection' ? null : item.matchedEntity.id, entity_type: item.entityType, storage_path: item.storagePath, original_filename: item.originalFilename, sha256: item.sha256, mime_type: item.mimeType, byte_size: item.byteSize, updated_at: new Date().toISOString() }, { onConflict: 'storage_path' });
      if (metaError) throw metaError;
      committed.push(item);
    } catch (error) { failed.push({ item, error: error.message || String(error) }); }
  }
  return { success: failed.length === 0, committedCount: committed.length, failedCount: failed.length, committed, failed };
}
