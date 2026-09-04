import crypto from 'node:crypto';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 300 };

const BUCKET = 'cards';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rrujnjraonckjdtpsfol.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Intentionally fixed, one-shot scope. This endpoint cannot import arbitrary files,
// collections, storage paths or database records.
const SPECS = {
  AT: {
    driveId: '1I3BjjyOyHOsQ8jBzxEP6fKrlkwArWSq6',
    collectionId: 'COL-04-AT',
    sourcePrefix: 'AT',
    existingPrefix: 'AT',
  },
  SDS: {
    driveId: '14MGGiB8pd135AWxjMGf5KwKbe0GX_giQ',
    collectionId: 'COL-01-SDS',
    sourcePrefix: 'SDS',
    existingPrefix: 'SDS',
  },
  WITCHER: {
    driveId: '1Bxr6XbHX8upsyv9B3JIpu4vxjuIP4L6_',
    collectionId: 'COL-02-WITCHER',
    sourcePrefix: 'WITCHER',
    existingPrefix: 'WITCHER',
  },
  HAZBIN: {
    driveId: '15lONyy5tsPnfhR0l2hx1jCGUVTBssFSF',
    collectionId: 'COL-04-HAZBIN',
    sourcePrefix: 'HZH',
    existingPrefix: 'HAZBIN',
  },
};

const basename = (value) => String(value || '').split(/[/\\]/).pop();
const nowIso = () => new Date().toISOString();

function semanticSuffix(filename, prefix) {
  const base = basename(filename);
  const marker = `COL-${prefix}_`;
  if (!base.toLowerCase().startsWith(marker.toLowerCase())) return null;
  return base.slice(marker.length).toLowerCase();
}

function mimeFromBytes(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

function publicUrl(storagePath, sha256) {
  const path = storagePath.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}?v=${sha256.slice(0, 16)}`;
}

async function downloadDriveZip(fileId) {
  const urls = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`,
  ];
  let lastError = 'unknown';
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (response.ok && bytes[0] === 0x50 && bytes[1] === 0x4b) return bytes;
      lastError = `${response.status}:${response.headers.get('content-type') || 'unknown'}:${bytes.length}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }
  throw new Error(`DRIVE_DOWNLOAD_FAILED:${lastError}`);
}

async function pool(items, limit, worker) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  }));
}

async function loadPlan(supabase, key) {
  const spec = SPECS[key];
  const [{ data: mediaRows, error: mediaError }, zipBytes] = await Promise.all([
    supabase
      .from('media_assets')
      .select('id,collection_id,card_id,form_id,entity_type,storage_path,original_filename,sha256,mime_type,byte_size')
      .eq('collection_id', spec.collectionId),
    downloadDriveZip(spec.driveId),
  ]);
  if (mediaError) throw mediaError;

  const zip = await JSZip.loadAsync(zipBytes);
  const entries = Object.values(zip.files).filter((entry) => {
    const base = basename(entry.name);
    return !entry.dir && base && !entry.name.includes('__MACOSX') && !base.startsWith('.');
  });

  const dbBySuffix = new Map();
  const duplicateDb = [];
  for (const row of mediaRows || []) {
    const suffix = semanticSuffix(row.original_filename, spec.existingPrefix);
    if (!suffix) throw new Error(`DB_FILENAME_PREFIX_MISMATCH:${row.original_filename}`);
    if (dbBySuffix.has(suffix)) duplicateDb.push(suffix);
    dbBySuffix.set(suffix, row);
  }

  const zipBySuffix = new Map();
  const duplicateZip = [];
  for (const entry of entries) {
    const file = basename(entry.name);
    const suffix = semanticSuffix(file, spec.sourcePrefix);
    if (!suffix) throw new Error(`ZIP_FILENAME_PREFIX_MISMATCH:${file}`);
    if (zipBySuffix.has(suffix)) duplicateZip.push(suffix);
    zipBySuffix.set(suffix, { entry, file });
  }

  const missingInZip = [...dbBySuffix.keys()].filter((suffix) => !zipBySuffix.has(suffix));
  const extraInZip = [...zipBySuffix.keys()].filter((suffix) => !dbBySuffix.has(suffix));
  if (duplicateDb.length || duplicateZip.length || missingInZip.length || extraInZip.length || dbBySuffix.size !== zipBySuffix.size) {
    throw new Error(`MEDIA_CONTRACT_MISMATCH:${JSON.stringify({
      database: dbBySuffix.size,
      zip: zipBySuffix.size,
      duplicateDb,
      duplicateZip,
      missingInZip,
      extraInZip,
    })}`);
  }

  return {
    key,
    spec,
    rows: [...zipBySuffix.entries()].map(([suffix, source]) => ({ suffix, source, media: dbBySuffix.get(suffix) })),
  };
}

async function writeAsset(supabase, planRow) {
  const { source, media } = planRow;
  const bytes = Buffer.from(await source.entry.async('nodebuffer'));
  const mimeType = mimeFromBytes(bytes);
  if (!mimeType) throw new Error(`INVALID_IMAGE_MAGIC:${source.file}`);

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(media.storage_path, bytes, {
      upsert: true,
      contentType: mimeType,
      cacheControl: '60',
    });
  if (uploadError) throw uploadError;

  const imageUrl = publicUrl(media.storage_path, sha256);
  const updatedAt = nowIso();
  const { error: mediaUpdateError } = await supabase
    .from('media_assets')
    .update({
      original_filename: source.file,
      sha256,
      mime_type: mimeType,
      byte_size: bytes.length,
      updated_at: updatedAt,
    })
    .eq('id', media.id);
  if (mediaUpdateError) throw mediaUpdateError;

  if (media.form_id) {
    const { error } = await supabase.from('card_forms').update({ image_url: imageUrl, updated_at: updatedAt }).eq('id', media.form_id);
    if (error) throw error;
  } else if (media.card_id) {
    const { error } = await supabase.from('cards').update({ image_url: imageUrl, updated_at: updatedAt }).eq('id', media.card_id);
    if (error) throw error;
  } else if (media.entity_type === 'collection') {
    const { error } = await supabase.from('collections').update({ cover_url: imageUrl, updated_at: updatedAt }).eq('id', media.collection_id);
    if (error) throw error;
  } else {
    throw new Error(`UNBOUND_MEDIA_ASSET:${source.file}`);
  }

  return { filename: source.file, sha256, bytes: bytes.length, storagePath: media.storage_path };
}

async function refreshCollection(supabase, key) {
  const opKey = `ops.media_refresh_20260904_${key.toLowerCase()}_v1`;
  const { data: prior, error: priorError } = await supabase.from('game_settings').select('value').eq('key', opKey).maybeSingle();
  if (priorError) throw priorError;
  if (prior?.value?.status === 'completed') return { alreadyCompleted: true, ...prior.value };

  const plan = await loadPlan(supabase, key);
  const startedAt = nowIso();
  const { error: startError } = await supabase.from('game_settings').upsert({
    key: opKey,
    value: { status: 'running', collection: key, collectionId: plan.spec.collectionId, expectedAssets: plan.rows.length, startedAt },
    updated_at: startedAt,
  });
  if (startError) throw startError;

  const results = new Array(plan.rows.length);
  await pool(plan.rows, 10, async (row, index) => {
    results[index] = await writeAsset(supabase, row);
  });

  const report = {
    status: 'completed',
    collection: key,
    collectionId: plan.spec.collectionId,
    driveId: plan.spec.driveId,
    assetsUpdated: results.length,
    bytesWritten: results.reduce((sum, item) => sum + item.bytes, 0),
    startedAt,
    finishedAt: nowIso(),
  };
  const { error: finishError } = await supabase.from('game_settings').upsert({ key: opKey, value: report, updated_at: report.finishedAt });
  if (finishError) throw finishError;
  return report;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!SERVICE_KEY) return res.status(503).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY_MISSING' });

  const requestUrl = new URL(req.url || '/', 'https://deckverse.local');
  const requested = String(requestUrl.searchParams.get('collection') || '').trim().toUpperCase();
  if (!SPECS[requested]) return res.status(400).json({ ok: false, error: 'INVALID_COLLECTION', allowed: Object.keys(SPECS) });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const report = await refreshCollection(supabase, requested);
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    console.error('media-refresh', requested, error);
    return res.status(500).json({ ok: false, collection: requested, error: error?.message || String(error) });
  }
}
