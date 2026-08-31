import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { parseMediaFilename } from '../services/media/mediaFilenameParser.js';

const EXPECTED_ZIPS = Number(process.env.EXPECTED_COLLECTION_ZIPS || 23);
const EXPECTED_ASSETS = Number(process.env.EXPECTED_COLLECTION_ASSETS || 1402);
const BUCKET = 'cards';
const localDir = process.env.COLLECTION_ZIP_DIR || '';
const driveToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN || '';
const driveFolderId = process.env.GOOGLE_DRIVE_COLLECTIONS_FOLDER_ID || '';
const replaceExisting = process.env.FORCE_MEDIA_RELINK === 'true';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!localDir && !(driveToken && driveFolderId)) {
  console.error('Set COLLECTION_ZIP_DIR or GOOGLE_DRIVE_ACCESS_TOKEN + GOOGLE_DRIVE_COLLECTIONS_FOLDER_ID.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const cleanName = (value) => path.basename(String(value || '')).replace(/[^A-Za-z0-9._-]/g, '_');

function mimeFromBytes(buffer) {
  const b = new Uint8Array(buffer);
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

async function listLocalPackages() {
  const names = (await fs.readdir(localDir)).filter((name) => /^COL-[A-Z0-9]+_.+\.zip$/i.test(name)).sort();
  return names.map((name) => ({ id: name, name, load: () => fs.readFile(path.join(localDir, name)) }));
}

async function driveJson(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${driveToken}` } });
  if (!response.ok) throw new Error(`DRIVE_${response.status}: ${await response.text()}`);
  return response.json();
}

async function listDrivePackages() {
  const files = [];
  let pageToken = '';
  do {
    const q = `'${driveFolderId}' in parents and trashed = false`;
    const params = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name,mimeType,size)', orderBy: 'name', pageSize: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await driveJson(`https://www.googleapis.com/drive/v3/files?${params}`);
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files
    .filter((file) => /^COL-[A-Z0-9]+_.+\.zip$/i.test(file.name || ''))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((file) => ({
      id: file.id,
      name: file.name,
      load: async () => {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
        if (!response.ok) throw new Error(`DRIVE_DOWNLOAD_${response.status}: ${file.name}`);
        return Buffer.from(await response.arrayBuffer());
      },
    }));
}

async function loadCatalogIndexes() {
  const [{ data: collections, error: ce }, { data: cards, error: cardError }, { data: forms, error: formError }] = await Promise.all([
    supabase.from('collections').select('id,name,cover_url'),
    supabase.from('cards').select('id,collection_id,entity_type,slug,name,image_url'),
    supabase.from('card_forms').select('id,card_id,slug,name,image_url'),
  ]);
  if (ce) throw ce;
  if (cardError) throw cardError;
  if (formError) throw formError;

  const collectionsById = new Map((collections || []).map((row) => [String(row.id).toUpperCase(), row]));
  const cardsByKey = new Map();
  for (const card of cards || []) {
    const slug = card.slug || slugify(card.name);
    cardsByKey.set(`${String(card.collection_id).toUpperCase()}|${card.entity_type}|${slug}`, card);
  }
  const formsByKey = new Map();
  const cardsById = new Map((cards || []).map((row) => [String(row.id), row]));
  for (const form of forms || []) {
    const card = cardsById.get(String(form.card_id));
    if (!card) continue;
    formsByKey.set(`${String(card.id)}|${form.slug || slugify(form.name)}`, form);
  }
  return { collectionsById, cardsByKey, formsByKey };
}

async function analyzePackages(packages, indexes) {
  const files = [];
  const invalid = [];
  for (const pkg of packages) {
    console.log(`Analyzing ${pkg.name}...`);
    const zip = await JSZip.loadAsync(await pkg.load());
    for (const [entryName, entry] of Object.entries(zip.files)) {
      if (entry.dir || entryName.includes('__MACOSX') || path.basename(entryName).startsWith('.')) continue;
      const parsed = parseMediaFilename(entryName);
      if (!parsed.valid) {
        invalid.push({ package: pkg.name, file: entryName, reason: parsed.error });
        continue;
      }
      const collection = indexes.collectionsById.get(String(parsed.collectionCodeCanonical).toUpperCase());
      if (!collection) {
        invalid.push({ package: pkg.name, file: entryName, reason: `COLLECTION_NOT_IN_DATABASE:${parsed.collectionCodeCanonical}` });
        continue;
      }

      let target = null;
      if (parsed.entityType === 'collection') {
        target = { kind: 'collection', collection };
      } else if (parsed.stateType === 'appearance') {
        invalid.push({ package: pkg.name, file: entryName, reason: 'APPEARANCE_NOT_CANONICAL_IN_V11' });
        continue;
      } else if (parsed.stateType === 'form') {
        if (!['character', 'boss'].includes(parsed.entityType)) {
          invalid.push({ package: pkg.name, file: entryName, reason: 'FORM_BASE_TYPE_UNSUPPORTED' });
          continue;
        }
        const baseCard = indexes.cardsByKey.get(`${parsed.collectionCodeCanonical}|${parsed.entityType}|${parsed.baseSlug}`);
        const form = baseCard ? indexes.formsByKey.get(`${baseCard.id}|${parsed.stateSlug}`) : null;
        if (!baseCard || !form) {
          invalid.push({ package: pkg.name, file: entryName, reason: `FORM_TARGET_NOT_FOUND:${parsed.entityType}:${parsed.baseSlug}:${parsed.stateSlug}` });
          continue;
        }
        target = { kind: 'form', collection, card: baseCard, form };
      } else {
        const card = indexes.cardsByKey.get(`${parsed.collectionCodeCanonical}|${parsed.entityType}|${parsed.slug}`);
        if (!card) {
          invalid.push({ package: pkg.name, file: entryName, reason: `CARD_TARGET_NOT_FOUND:${parsed.entityType}:${parsed.slug}` });
          continue;
        }
        target = { kind: 'card', collection, card };
      }

      files.push({ packageName: pkg.name, entryName, entry, parsed, target });
    }
  }
  return { files, invalid };
}

async function currentImage(target) {
  if (target.kind === 'collection') return target.collection.cover_url || '';
  if (target.kind === 'form') return target.form.image_url || '';
  return target.card.image_url || '';
}

async function linkImage(target, publicUrl) {
  const existing = await currentImage(target);
  if (existing && !replaceExisting) return { linked: false, reason: 'TARGET_ALREADY_HAS_IMAGE' };
  if (target.kind === 'collection') {
    const { error } = await supabase.from('collections').update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.collection.id);
    if (error) throw error;
    target.collection.cover_url = publicUrl;
  } else if (target.kind === 'form') {
    const { error } = await supabase.from('card_forms').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.form.id);
    if (error) throw error;
    target.form.image_url = publicUrl;
  } else {
    const { error } = await supabase.from('cards').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.card.id);
    if (error) throw error;
    target.card.image_url = publicUrl;
  }
  return { linked: true };
}

async function commitFile(file) {
  const bytes = Buffer.from(await file.entry.async('uint8array'));
  const mime = mimeFromBytes(bytes);
  if (!mime) return { status: 'invalid', file: file.entryName, reason: 'UNSUPPORTED_MAGIC_BYTES' };
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const safeFilename = cleanName(file.entryName);
  const storageFolder = file.parsed.stateType === 'form' ? 'form' : file.parsed.entityType;
  const storagePath = `${file.parsed.collectionCodeCanonical}/${storageFolder}/${safeFilename}`;

  const upload = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: mime, upsert: false, cacheControl: '31536000' });
  let existed = false;
  if (upload.error) {
    const text = String(upload.error.message || upload.error).toLowerCase();
    if (text.includes('duplicate') || text.includes('already exists') || text.includes('resource already exists')) existed = true;
    else throw new Error(`STORAGE_UPLOAD:${file.entryName}:${upload.error.message}`);
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicData?.publicUrl || '';
  if (!publicUrl) throw new Error(`PUBLIC_URL_FAILED:${file.entryName}`);

  const mediaRow = {
    collection_id: file.target.collection.id,
    card_id: file.target.card?.id || null,
    form_id: file.target.form?.id || null,
    entity_type: file.parsed.stateType === 'form' ? 'form' : file.parsed.entityType,
    storage_path: storagePath,
    original_filename: file.entryName,
    sha256,
    mime_type: mime,
    byte_size: bytes.length,
    updated_at: new Date().toISOString(),
  };
  const { error: mediaError } = await supabase.from('media_assets').upsert(mediaRow, { onConflict: 'storage_path', ignoreDuplicates: true });
  if (mediaError) throw new Error(`MEDIA_INDEX:${file.entryName}:${mediaError.message}`);
  const link = await linkImage(file.target, publicUrl);
  return { status: existed ? 'already_uploaded' : 'uploaded', linked: link.linked, linkReason: link.reason || null, file: file.entryName };
}

async function main() {
  const packages = localDir ? await listLocalPackages() : await listDrivePackages();
  if (packages.length !== EXPECTED_ZIPS) throw new Error(`AUDIT_MISMATCH: expected ${EXPECTED_ZIPS} canonical ZIPs, found ${packages.length}.`);

  const indexes = await loadCatalogIndexes();
  const analysis = await analyzePackages(packages, indexes);
  if (analysis.files.length + analysis.invalid.length !== EXPECTED_ASSETS) {
    throw new Error(`ASSET_COUNT_MISMATCH: expected ${EXPECTED_ASSETS}, analyzed ${analysis.files.length + analysis.invalid.length}. No upload started.`);
  }
  if (analysis.invalid.length) {
    console.error(JSON.stringify({ invalid: analysis.invalid.slice(0, 100), invalidCount: analysis.invalid.length }, null, 2));
    throw new Error(`PRECHECK_FAILED: ${analysis.invalid.length} assets do not resolve canonically. No upload started.`);
  }

  console.log(`Precheck passed: ${packages.length} ZIPs / ${analysis.files.length} assets. Starting non-destructive upload.`);
  const summary = { uploaded: 0, alreadyUploaded: 0, linked: 0, preservedExistingImage: 0, failed: 0 };
  const failures = [];
  for (let index = 0; index < analysis.files.length; index += 1) {
    const file = analysis.files[index];
    try {
      const result = await commitFile(file);
      if (result.status === 'uploaded') summary.uploaded += 1;
      if (result.status === 'already_uploaded') summary.alreadyUploaded += 1;
      if (result.linked) summary.linked += 1;
      if (result.linkReason === 'TARGET_ALREADY_HAS_IMAGE') summary.preservedExistingImage += 1;
    } catch (error) {
      summary.failed += 1;
      failures.push({ file: file.entryName, error: error.message });
    }
    if ((index + 1) % 50 === 0 || index + 1 === analysis.files.length) console.log(`${index + 1}/${analysis.files.length}`, summary);
  }

  console.log(JSON.stringify({ summary, failures: failures.slice(0, 100) }, null, 2));
  if (summary.failed) process.exit(1);
}

main().catch((error) => {
  console.error('Media migration aborted safely:', error.message);
  process.exit(1);
});
