import crypto from 'node:crypto';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { parseMediaFilename } from '../../services/media/mediaFilenameParser.js';

export const config = { maxDuration: 60 };

const BUCKET = 'cards';
const IMPORTS = {
  cp77: { driveId: '1wZZeWrbn6UH73VlaI6tHzZ3altz3YnSF', collectionId: 'COL-02-CP77', expectedAssets: 71 },
  dmc: { driveId: '1TwzPeU9yM1tiyD8CbQ5kqtUALhYLZ878', collectionId: 'COL-02-DMC', expectedAssets: 39 },
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rrujnjraonckjdtpsfol.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mimeFromBytes(buffer) {
  const b = new Uint8Array(buffer);
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

async function downloadPublicDriveFile(fileId) {
  const urls = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`,
  ];
  let lastError = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        lastError = `HTTP_${response.status}`;
        continue;
      }
      const contentType = String(response.headers.get('content-type') || '');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return bytes;
      lastError = `NOT_ZIP:${contentType}:${bytes.length}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }
  throw new Error(`DRIVE_DOWNLOAD_FAILED:${lastError}`);
}

async function loadIndexes(supabase, collectionId) {
  const [{ data: collection, error: ce }, { data: cards, error: cde }] = await Promise.all([
    supabase.from('collections').select('id,name,cover_url,is_active').eq('id', collectionId).single(),
    supabase.from('cards').select('id,collection_id,entity_type,slug,name,image_url,is_active,rarity').eq('collection_id', collectionId),
  ]);
  if (ce) throw ce;
  if (cde) throw cde;
  const cardIds = (cards || []).map((row) => row.id);
  const { data: forms, error: fe } = cardIds.length
    ? await supabase.from('card_forms').select('id,card_id,slug,name,image_url,is_active').in('card_id', cardIds)
    : { data: [], error: null };
  if (fe) throw fe;

  const cardsByKey = new Map((cards || []).map((card) => [`${card.entity_type}|${card.slug}`, card]));
  const cardsById = new Map((cards || []).map((card) => [card.id, card]));
  const formsByKey = new Map();
  for (const form of forms || []) {
    const card = cardsById.get(form.card_id);
    if (card) formsByKey.set(`${card.id}|${form.slug}`, form);
  }
  return { collection, cards, forms: forms || [], cardsByKey, formsByKey };
}

async function resolveTarget(parsed, indexes) {
  if (parsed.entityType === 'collection') return { kind: 'collection', collection: indexes.collection };
  if (parsed.stateType === 'form') {
    const base = indexes.cardsByKey.get(`${parsed.entityType}|${parsed.baseSlug}`);
    const form = base ? indexes.formsByKey.get(`${base.id}|${parsed.stateSlug}`) : null;
    if (!base || !form) return null;
    return { kind: 'form', collection: indexes.collection, card: base, form };
  }
  const card = indexes.cardsByKey.get(`${parsed.entityType}|${parsed.slug}`);
  return card ? { kind: 'card', collection: indexes.collection, card } : null;
}

async function linkImage(supabase, target, publicUrl) {
  if (target.kind === 'collection') {
    const { error } = await supabase.from('collections').update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.collection.id);
    if (error) throw error;
  } else if (target.kind === 'form') {
    const { error } = await supabase.from('card_forms').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.form.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cards').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', target.card.id);
    if (error) throw error;
  }
}

async function importCollection(key, spec) {
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bytes = await downloadPublicDriveFile(spec.driveId);
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.includes('__MACOSX') && !entry.name.split('/').pop().startsWith('.'));
  if (entries.length !== spec.expectedAssets) throw new Error(`ASSET_COUNT_MISMATCH:${entries.length}:${spec.expectedAssets}`);

  const indexes = await loadIndexes(supabase, spec.collectionId);
  const planned = [];
  const invalid = [];
  for (const entry of entries) {
    const parsed = parseMediaFilename(entry.name);
    if (!parsed.valid || parsed.collectionCodeCanonical !== spec.collectionId) {
      invalid.push({ file: entry.name, reason: parsed.error || `WRONG_COLLECTION:${parsed.collectionCodeCanonical}` });
      continue;
    }
    if (parsed.entityType === 'item') {
      invalid.push({ file: entry.name, reason: 'ITEM_NOT_ALLOWED_FOR_THIS_CURATED_IMPORT' });
      continue;
    }
    const target = await resolveTarget(parsed, indexes);
    if (!target) {
      invalid.push({ file: entry.name, reason: `TARGET_NOT_FOUND:${parsed.entityType}:${parsed.slug}` });
      continue;
    }
    planned.push({ entry, parsed, target });
  }
  if (invalid.length) throw new Error(`PRECHECK_FAILED:${JSON.stringify(invalid.slice(0, 20))}`);

  const summary = { uploaded: 0, alreadyUploaded: 0, linked: 0 };
  for (const file of planned) {
    const fileBytes = Buffer.from(await file.entry.async('uint8array'));
    const mime = mimeFromBytes(fileBytes);
    if (!mime) throw new Error(`INVALID_IMAGE:${file.entry.name}`);
    const safeName = file.entry.name.split('/').pop().replace(/[^A-Za-z0-9._-]/g, '_');
    const storageFolder = file.parsed.stateType === 'form' ? 'form' : file.parsed.entityType;
    const storagePath = `${spec.collectionId}/${storageFolder}/${safeName}`;
    const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

    const upload = await supabase.storage.from(BUCKET).upload(storagePath, fileBytes, { contentType: mime, upsert: false, cacheControl: '31536000' });
    if (upload.error) {
      const msg = String(upload.error.message || upload.error).toLowerCase();
      if (!(msg.includes('duplicate') || msg.includes('already exists') || msg.includes('resource already exists'))) throw upload.error;
      summary.alreadyUploaded += 1;
    } else {
      summary.uploaded += 1;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error(`PUBLIC_URL_FAILED:${safeName}`);

    const mediaRow = {
      collection_id: spec.collectionId,
      card_id: file.target.card?.id || null,
      form_id: file.target.form?.id || null,
      entity_type: file.parsed.stateType === 'form' ? 'form' : file.parsed.entityType,
      storage_path: storagePath,
      original_filename: safeName,
      sha256,
      mime_type: mime,
      byte_size: fileBytes.length,
      updated_at: new Date().toISOString(),
    };
    const { error: me } = await supabase.from('media_assets').upsert(mediaRow, { onConflict: 'storage_path' });
    if (me) throw me;
    await linkImage(supabase, file.target, publicUrl);
    summary.linked += 1;
  }

  const refreshed = await loadIndexes(supabase, spec.collectionId);
  const missingCards = refreshed.cards.filter((c) => c.is_active && ['character', 'boss'].includes(c.entity_type) && !c.image_url);
  const missingForms = refreshed.forms.filter((f) => f.is_active && !f.image_url);
  const coverMissing = !refreshed.collection.cover_url;
  if (missingCards.length || missingForms.length || coverMissing) {
    throw new Error(`POSTCHECK_FAILED:cards=${missingCards.length},forms=${missingForms.length},cover=${coverMissing}`);
  }

  await supabase.from('cards').update({ is_gacha_enabled: true, updated_at: new Date().toISOString() })
    .eq('collection_id', spec.collectionId).eq('is_active', true).not('image_url', 'is', null).in('rarity', ['R','SR','SSR','UR','LR','MR']);
  const { error: activateError } = await supabase.from('collections').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', spec.collectionId);
  if (activateError) throw activateError;

  return { key, collectionId: spec.collectionId, assets: planned.length, ...summary };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = String(req.query?.collection || '').toLowerCase();
  const spec = IMPORTS[key];
  if (!spec) return res.status(400).json({ error: 'Unsupported collection' });
  try {
    const result = await importCollection(key, spec);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('completed-media-import', key, error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
