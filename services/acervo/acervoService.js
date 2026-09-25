import { claimAcervoImportItem, createCard, createAcervoImportJob, deleteEntry, finalizeAcervoImportJob, finishAcervoImportItem, getAcervoImportJob, importCollection, listAcervoImportJobs, listCollections, recordImportedMedia, searchEntries, updateCollectionImage, updateEntry } from './acervoRepository.js';
import JSZip from 'jszip';
import { parseMediaFilename } from '../../services/media/mediaFilenameParser.js';
import { getSupabaseBrowserClient } from '../supabase/client.js';

const normalizeRow = (row) => ({
  scope: row.scope,
  id: row.id,
  entityType: row.entity_type,
  name: row.name,
  synopsis: row.synopsis || '',
  description: row.description || '',
  imageUrl: row.image_url || '',
  collectionId: row.collection_id || '',
  collectionName: row.collection_name || '',
  baseName: row.base_name || '',
  rarity: row.rarity || '',
  isActive: row.is_active !== false,
});

export async function getAcervoCollections() {
  return listCollections();
}

export async function getAcervoEntries(filters = {}) {
  const result = await searchEntries(filters);
  return {
    rows: result.rows.map(normalizeRow),
    total: result.total,
  };
}

export async function saveAcervoEntry(scope, id, payload) {
  return updateEntry(scope, id, payload);
}

export async function createAcervoCard(collectionId, payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('O nome da carta é obrigatório.');
  const result = await createCard({ ...payload, collectionId, name });
  return normalizeRow({
    scope: 'card',
    entity_type: result.entity_type,
    id: result.id,
    name: result.name,
    synopsis: payload.synopsis,
    description: payload.description,
    image_url: payload.imageUrl,
    collection_id: result.collection_id || collectionId,
    collection_name: '',
    rarity: payload.rarity,
    is_active: payload.isActive !== false,
  });
}

export async function bulkUpdateAcervoEntries(entries, patch) {
  const items = Array.isArray(entries) ? entries : [];
  if (!items.length) return { ok: true, updated: 0 };
  if (patch?.isActive === undefined) throw new Error('A ação em lote atual aceita apenas alteração de status.');
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_bulk_set_acervo_status', {
    p_entries: items.map(({ scope, id }) => ({ scope, id })),
    p_is_active: Boolean(patch.isActive),
  });
  if (error) throw error;
  return data || { ok: true, updated: 0 };
}

export async function deactivateAcervoEntry(scope, id) {
  return deleteEntry(scope, id, false);
}

export async function permanentlyDeleteAcervoEntry(scope, id) {
  const result = await deleteEntry(scope, id, true);
  if (result?.mode === 'blocked') {
    const detail = (result.dependencies || []).map((item) => `${item.table}: ${item.count}`).join(', ');
    throw new Error(`EXCLUSÃO BLOQUEADA. Dependências: ${detail}`);
  }
  return result;
}

export async function uploadAcervoImage(file, collectionId) {
  if (!file) throw new Error('Selecione uma imagem.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2 MB.');

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
  if (!allowed.has(file.type)) throw new Error('Formato não suportado. Use JPG, PNG, WEBP, GIF ou AVIF.');

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const safeCollection = String(collectionId || 'uncategorized').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${safeCollection}/${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.storage.from('cards-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  const { data } = supabase.storage.from('cards-images').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('O upload terminou, mas a URL pública não foi gerada.');
  return data.publicUrl;
}


const IMPORT_IMAGE_MAX = 2 * 1024 * 1024;
const IMPORT_IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif','image/avif']);

function slugifyImport(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

function parseSimpleCsv(text) {
  const rows=[]; let row=[]; let cell=''; let quoted=false;
  const delimiter = text.split(/\r?\n/, 1)[0]?.includes(';') ? ';' : ',';
  for(let i=0;i<text.length;i+=1){
    const ch=text[i], next=text[i+1];
    if(ch==='"' && quoted && next==='"'){ cell+='"'; i+=1; continue; }
    if(ch==='"'){ quoted=!quoted; continue; }
    if(ch===delimiter && !quoted){ row.push(cell.trim()); cell=''; continue; }
    if((ch==='\n' || ch==='\r') && !quoted){
      if(ch==='\r' && next==='\n') i+=1;
      row.push(cell.trim()); cell='';
      if(row.some(Boolean)) rows.push(row);
      row=[]; continue;
    }
    cell+=ch;
  }
  if(cell || row.length){ row.push(cell.trim()); if(row.some(Boolean)) rows.push(row); }
  if(!rows.length) return [];
  const headers=rows[0].map((h)=>slugifyImport(h));
  return rows.slice(1).map((values)=>Object.fromEntries(headers.map((h,i)=>[h,values[i] ?? ''])));
}

function parseManifestText(text) {
  const clean=String(text || '').replace(/^\uFEFF/,'').trim();
  if(!clean) return [];
  try {
    const parsed=JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.entries)) return parsed.entries;
    if (Array.isArray(parsed.cards)) return parsed.cards;
    return [];
  } catch {}
  if ((clean.includes(',') || clean.includes(';')) && /(^|\n)\s*(name|nome)\s*[,;]/i.test(clean)) return parseSimpleCsv(clean);
  return clean.split(/\r?\n/).map((line)=>line.trim()).filter(Boolean).map((line)=>({name:line,entity_type:'character'}));
}

function deriveEntryFromFilename(parsed) {
  return {
    name: parsed.slug.replace(/_/g,' ').replace(/\b\w/g,(m)=>m.toUpperCase()),
    slug: parsed.slug,
    entity_type: parsed.entityType,
  };
}

async function sha256Hex(blob) {
  const bytes=await blob.arrayBuffer();
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2,'0')).join('');
}

function mimeFromName(name) {
  const ext=String(name||'').toLowerCase().split('.').pop();
  return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'})[ext] || '';
}

export async function inspectAcervoImport({ manifestFile=null, zipFile=null, collection={} } = {}) {
  const entries=[];
  const issues=[];
  if(manifestFile){
    const text=await manifestFile.text();
    entries.push(...parseManifestText(text));
  }
  const zipImages=[];
  if(zipFile){
    const zip=await JSZip.loadAsync(zipFile);
    for(const [name,file] of Object.entries(zip.files)){
      if(file.dir || name.includes('__MACOSX') || name.split('/').pop().startsWith('.')) continue;
      const parsed=parseMediaFilename(name);
      const mime=mimeFromName(name);
      if(!mime) continue;
      zipImages.push({name,parsed,file});
      if(!parsed.valid) issues.push({file:name,reason:parsed.error});
    }
  }
  const bySlug=new Map(entries.map((entry)=>[String(entry.slug||slugifyImport(entry.name)).toLowerCase(),{...entry,slug:String(entry.slug||slugifyImport(entry.name)).toLowerCase()}]));
  for(const item of zipImages){
    if(!item.parsed.valid) continue;
    if(item.parsed.entityType === 'collection') continue;
    if(item.parsed.stateType === 'form') {
      issues.push({file:item.name,reason:'FORM_IMPORT_REQUIRES_EXISTING_BASE_CARD'});
      continue;
    }
    const key=item.parsed.slug.toLowerCase();
    if(!bySlug.has(key)) bySlug.set(key,deriveEntryFromFilename(item.parsed));
    else bySlug.set(key,{...bySlug.get(key),slug:key,entity_type:bySlug.get(key).entity_type || item.parsed.entityType,image_filename:bySlug.get(key).image_filename || item.name});
    if(item.parsed.collectionCodeCanonical && collection.id && item.parsed.collectionCodeCanonical !== String(collection.id).toUpperCase())
      issues.push({file:item.name,reason:'COLLECTION_CODE_MISMATCH'});
  }
  const normalized=Array.from(bySlug.values()).map((entry)=>({
    name:String(entry.name||entry.nome||'').trim(),
    slug:String(entry.slug||slugifyImport(entry.name||entry.nome)).trim().toLowerCase(),
    entity_type:String(entry.entity_type||entry.entityType||'character').trim().toLowerCase(),
    rarity:entry.rarity||null, role:entry.role||null, synopsis:entry.synopsis||null, description:entry.description||null,
    image_filename:entry.image_filename||entry.imageFilename||null,
  }));
  for(const entry of normalized) if(!entry.name) issues.push({file:entry.slug,reason:'NAME_REQUIRED'});
  return {collection,entries:normalized,images:zipImages,issues};
}

export async function getAcervoImportHistory(limit = 20) {
  return listAcervoImportJobs(limit);
}

export async function getAcervoImportState(jobId) {
  return getAcervoImportJob(jobId);
}

function buildImportItems(plan, rowMap) {
  return (plan.images || [])
    .filter((item) => item?.parsed?.valid && item.parsed.entityType !== 'collection' && item.parsed.stateType !== 'form')
    .map((item) => {
      const entry = rowMap.get(item.parsed.slug.toLowerCase()) || rowMap.get(slugifyImport(item.parsed.slug));
      if (!entry) return null;
      const safeName = item.name.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');
      return {
        source_name: item.name,
        entry_id: entry.id,
        entry_slug: entry.slug,
        entity_type: entry.entity_type,
        storage_path: `${plan.collection.id}/${entry.entity_type}/${entry.slug}/${safeName}`,
        mime_type: mimeFromName(item.name),
        byte_size: null,
      };
    })
    .filter(Boolean);
}

export async function executeAcervoImport({ plan, onProgress, existingJobId = null } = {}) {
  if(!plan?.collection?.id || !plan?.collection?.name) throw new Error('Informe ID e nome da coleção.');
  if(plan.issues?.length) throw new Error(`Corrija ${plan.issues.length} problema(s) antes de importar.`);

  const imported = await importCollection({ collection: plan.collection, entries: plan.entries });
  const rowMap = new Map((imported.rows || []).map((row) => [String(row.slug || '').toLowerCase(), row]));
  const items = buildImportItems(plan, rowMap);
  let jobId = existingJobId;
  let jobState = null;

  if (jobId) {
    jobState = await getAcervoImportJob(jobId);
    if (jobState?.job?.collection_id !== plan.collection.id) throw new Error('A importação selecionada pertence a outra coleção.');
  } else {
    const createdJob = await createAcervoImportJob({
      collectionId: plan.collection.id,
      totalEntries: plan.entries.length,
      images: items,
    });
    jobId = createdJob.job_id;
    jobState = await getAcervoImportJob(jobId);
  }

  const supabase = getSupabaseBrowserClient();
  const persistedItems = Array.isArray(jobState?.items) ? jobState.items : [];
  const persistedBySource = new Map(persistedItems.map((item) => [item.source_name, item]));
  const total = items.length;
  let processed = 0, uploaded = 0, linked = 0, skippedExisting = 0, failed = 0;

  for (const planItem of items) {
    const persisted = persistedBySource.get(planItem.source_name);
    if (persisted?.status === 'completed' || persisted?.status === 'skipped') {
      processed += 1;
      if (onProgress) onProgress({ jobId, current: processed, total, uploaded, linked, failed, status: 'resumed' });
      continue;
    }

    const source = plan.images.find((image) => image.name === planItem.source_name);
    if (!source) continue;
    let claimed = false;
    let claimedItemId = persisted?.id || null;
    try {
      const claimedItem = await claimAcervoImportItem(jobId, persisted?.id || '');
      claimedItemId = claimedItem.id;
      claimed = true;
      const entry = rowMap.get(planItem.entry_slug.toLowerCase());
      if (!entry) throw new Error(`Entidade não encontrada: ${planItem.entry_slug}`);
      const bytes = await source.file.async('uint8array');
      if(bytes.byteLength > IMPORT_IMAGE_MAX) throw new Error(`Imagem acima de 2 MB: ${source.name}`);
      const mime = mimeFromName(source.name);
      if(!IMPORT_IMAGE_TYPES.has(mime)) throw new Error(`Formato não suportado: ${source.name}`);

      const { data: publicData } = supabase.storage.from('cards-images').getPublicUrl(planItem.storage_path);
      const { data: existing } = await supabase.from('media_assets').select('id').eq('storage_path', planItem.storage_path).maybeSingle();
      if (existing?.id) {
        skippedExisting += 1;
      } else {
        const blob = new Blob([bytes], { type: mime });
        const { error } = await supabase.storage.from('cards-images').upload(planItem.storage_path, blob, {
          contentType: mime, cacheControl: '31536000', upsert: true,
        });
        if(error) throw new Error(`Upload ${source.name}: ${error.message}`);
        uploaded += 1;
      }
      const sha = await sha256Hex(new Blob([bytes], { type: mime }));
      await recordImportedMedia({
        collectionId: plan.collection.id, cardId: entry.id, entityType: entry.entity_type,
        storagePath: planItem.storage_path, originalFilename: source.name, sha256: sha,
        mimeType: mime, byteSize: bytes.byteLength,
      });
      await updateEntry('card', entry.id, { imageUrl: publicData.publicUrl });
      linked += 1;
      await finishAcervoImportItem(jobId, claimedItemId, existing?.id ? 'skipped' : 'completed', null, sha);
      processed += 1;
    } catch (error) {
      failed += 1;
      if (claimed) {
        try {
          if (claimedItemId) {
            await finishAcervoImportItem(jobId, claimedItemId, 'failed', error?.message || 'Falha desconhecida');
          }
        } catch {}
      }
      if (onProgress) onProgress({ jobId, current: processed, total, uploaded, linked, failed, status: 'partial', error: error?.message || 'Falha desconhecida' });
    }
    if(onProgress) onProgress({ jobId, current: processed, total, uploaded, linked, failed, status: 'running' });
  }

  const cover = plan.images?.find((item) => item.parsed.valid && item.parsed.entityType === 'collection');
  if(cover){
    const bytes = await cover.file.async('uint8array');
    if(bytes.byteLength <= IMPORT_IMAGE_MAX){
      const mime = mimeFromName(cover.name);
      const storagePath = `${plan.collection.id}/collection/cover-${cover.name.split('/').pop().replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const blob = new Blob([bytes], { type: mime });
      const { error } = await supabase.storage.from('cards-images').upload(storagePath, blob, { contentType: mime, cacheControl: '31536000', upsert: true });
      if(error) throw error;
      const { data } = supabase.storage.from('cards-images').getPublicUrl(storagePath);
      await updateCollectionImage(plan.collection.id, data.publicUrl);
    }
  }

  const state = await finalizeAcervoImportJob(jobId);
  return {
    ok: true, jobId, collectionId: plan.collection.id, created: imported.created, updated: imported.updated,
    uploaded, linked, skippedExisting, failed, state: state?.job || null,
  };
}
