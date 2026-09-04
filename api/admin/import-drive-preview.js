import crypto from 'node:crypto';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 300 };

const BUCKET = 'cards';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rrujnjraonckjdtpsfol.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SPECS = {
  DUNE: ['Dune','1a82w3NV6yahteeW5lc_y9NqdMZJl1wgI','COL-03-DUNE','Cinema'],
  ER: ['Elden Ring','12i67mqcZivXcBjEmB98dzRPUOQ-4SoPM','COL-02-ER','Games'],
  GOT: ['Game of Thrones','1xNWEHc2Pd6GoRQVT70G5e1ECDh2KeU4f','COL-03-GOT','Séries'],
  GOW: ['God of War','1l7W7bfXbaYVVXPLFTxwPbhtipuxTBcF1','COL-02-GOW','Games'],
  HP: ['Harry Potter','1fNhF6qxVNjXXqJH4vEWBC1wD9YEDqnGO','COL-03-HP','Literatura'],
  HAZBIN: ['Hazbin Hotel','1WXM2E6FaZuciNSE3L-LWho8dDKhN3ESo','COL-04-HAZBIN','Animações'],
  AT: ['Hora de Aventura','1jDcBqIX8PeqKXf91Vk_i9Z2AdhaUZ2Ap','COL-04-AT','Animações'],
  LOL: ['League of Legends','16UJWw04yUN4F9qlPXqEsGZeBhM2h3M7g','COL-02-LOL','Games'],
  LOTR: ['Lord of the Rings','1tM4xxAAoyrh057Vx1t7Ghli9ky6Mj4So','COL-03-LOTR','Literatura'],
  MK: ['Mortal Kombat','1DvG_F0GmEZljTF7QUcJWYIwaeKjMHRvT','COL-02-MK','Games'],
  ROR: ['Record of Ragnarok','11uhWwHJi823oJRa1jSQcuATdh9Fr3kBl','COL-01-ROR','Anime & Manga'],
  SKR: ['Skyrim','1TSGwZcnwjCY0JY69QWTADm9sWROxPB5D','COL-02-SKR','Games'],
  TLOU: ['The Last of Us','1MN7y7GRcaO8nxJBAuSROPuyJBz2rs9ZD','COL-02-TLOU','Games'],
  ZLD: ['The Legend of Zelda','1ewdgQ3O0PZRUSS_QLQv2hZlXD3mqNGTO','COL-02-ZLD','Games'],
  SDS: ['The Seven Deadly Sins / Nanatsu no Taizai','1DWkiGH9jppgQF6Eqr_tClfjMGEARdW5Y','COL-01-SDS','Anime & Manga'],
  WITCHER: ['The Witcher','1j4WXcUF5Mw3CZMhitN-Vp-hjCTy7jV0k','COL-02-WITCHER','Games'],
};

const KEEP_ITEMS = {
  DUNE: [],
  ER: ['dark_moon_greatsword','elden_ring','rune_of_death'],
  GOT: ['blackfyre','dark_sister','dragon_eggs','heartsbane','ice','longclaw','oathkeeper','widows_wail'],
  GOW: ['blade_of_olympus','pandoras_box'],
  HP: ['elder_wand','invisibility_cloak','philosophers_stone','resurrection_stone','sword_of_gryffindor','time_turner'],
  HAZBIN: [],
  AT: ['enchiridion','ice_crown'],
  LOL: ['blade_of_the_ruined_king','world_runes'],
  LOTR: ['anduril','narya','nenya','one_ring','palantir','silmarils','vilya'],
  MK: ['kamidogu','kronikas_crown','sento','shinnoks_amulet'],
  ROR: ['mjolnir'],
  SKR: ['auriels_bow','dawnbreaker','ebony_blade','elder_scroll','mace_of_molag_bal','mehrunes_razor','staff_of_magnus','volendrung','wabbajack'],
  TLOU: [],
  ZLD: ['bow_of_light','fierce_deity_mask','four_sword','hylian_shield','majoras_mask','master_sword','ocarina_of_time','triforce','wind_waker'],
  SDS: ['coffin_of_eternal_darkness'],
  WITCHER: ['aerondight'],
};

const basename = (value) => String(value || '').split(/[/\\]/).pop();
const safeId = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const humanize = (slug) => {
  const small = new Set(['of','the','and','de','da','do','dos','das','no','na']);
  return String(slug || '').split('_').filter(Boolean).map((word,index) => {
    if (/^(ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(word)) return word.toUpperCase();
    if (index && small.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

function mimeFromBytes(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return null;
}

async function downloadDrive(id) {
  const urls = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(id)}`,
  ];
  let last = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (response.ok && bytes[0] === 0x50 && bytes[1] === 0x4b) return bytes;
      last = `${response.status}:${response.headers.get('content-type')}:${bytes.length}`;
    } catch (error) {
      last = error?.message || String(error);
    }
  }
  throw new Error(`DRIVE_DOWNLOAD_FAILED:${last}`);
}

function parsePlan(key, entries) {
  const keepItems = new Set(KEEP_ITEMS[key] || []);
  const cards = new Map();
  const forms = new Map();
  const ignoredItems = [];
  const invalid = [];
  let cover = null;
  for (const entry of entries) {
    const filename = basename(entry.name);
    if (!filename || filename.startsWith('.') || filename.includes('__MACOSX')) continue;
    if (new RegExp(`^COL-${key}_collection_cover\\.(jpg|jpeg|png|webp)$`, 'i').test(filename)) {
      cover = filename;
      continue;
    }
    let match = filename.match(new RegExp(`^COL-${key}_(character|boss)_(.+?)_form_(.+?)\\.(jpg|jpeg|png|webp)$`, 'i'));
    if (match) {
      const baseType = match[1].toLowerCase();
      const baseSlug = match[2].toLowerCase();
      const slug = match[3].toLowerCase();
      forms.set(`${baseType}|${baseSlug}|${slug}`, { filename, baseType, baseSlug, slug, name: humanize(slug) });
      continue;
    }
    match = filename.match(new RegExp(`^COL-${key}_(character|boss|item)_(.+?)\\.(jpg|jpeg|png|webp)$`, 'i'));
    if (match) {
      const entityType = match[1].toLowerCase();
      const slug = match[2].toLowerCase();
      if (entityType === 'item' && !keepItems.has(slug)) {
        ignoredItems.push(filename);
        continue;
      }
      cards.set(`${entityType}|${slug}`, { filename, entityType, slug, name: humanize(slug) });
      continue;
    }
    invalid.push(filename);
  }
  if (!cover) invalid.push('MISSING_COLLECTION_COVER');
  const missingBases = [...forms.values()].filter((form) => !cards.has(`${form.baseType}|${form.baseSlug}`)).map((form) => form.filename);
  return { cover, cards: [...cards.values()], forms: [...forms.values()], ignoredItems, invalid, missingBases };
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

async function loadZipPlan(key) {
  const spec = SPECS[key];
  const zip = await JSZip.loadAsync(await downloadDrive(spec[1]));
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  return { zip, entries, plan: parsePlan(key, entries), spec };
}

async function inspect(key) {
  const { entries, plan, spec } = await loadZipPlan(key);
  return {
    key,
    name: spec[0],
    zipEntries: entries.length,
    characters: plan.cards.filter((entry) => entry.entityType === 'character').length,
    bosses: plan.cards.filter((entry) => entry.entityType === 'boss').length,
    items: plan.cards.filter((entry) => entry.entityType === 'item').length,
    forms: plan.forms.length,
    ignoredItems: plan.ignoredItems,
    invalid: plan.invalid,
    missingBases: plan.missingBases,
  };
}

async function importCollection(key) {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  const { entries, plan, spec } = await loadZipPlan(key);
  if (plan.invalid.length || plan.missingBases.length) throw new Error(`PRECHECK_FAILED:${JSON.stringify({ invalid: plan.invalid, missingBases: plan.missingBases })}`);

  const [name, , collectionId, category] = spec;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  const collectionWrite = await supabase.from('collections').upsert({ id: collectionId, name, category, is_active: false, updated_at: now }, { onConflict: 'id' });
  if (collectionWrite.error) throw collectionWrite.error;

  let cardsQuery = await supabase.from('cards').select('id,name,entity_type,slug,rarity,image_url,is_active,is_gacha_enabled').eq('collection_id', collectionId);
  if (cardsQuery.error) throw cardsQuery.error;
  let existingCards = cardsQuery.data || [];
  let byKey = new Map(existingCards.filter((card) => card.slug).map((card) => [`${card.entity_type}|${card.slug}`, card]));
  const inserts = [];
  for (const desired of plan.cards) {
    if (!byKey.has(`${desired.entityType}|${desired.slug}`)) {
      inserts.push({
        id: `card_zip_${safeId(collectionId)}_${desired.entityType}_${safeId(desired.slug)}`,
        collection_id: collectionId,
        name: desired.name,
        entity_type: desired.entityType,
        rarity: null,
        role: 'DPS', atk: 0, def: 0, mag: 0, speed: 0, hp: 0,
        slug: desired.slug,
        is_active: true,
        is_gacha_enabled: false,
        is_universal_equipment: desired.entityType === 'item',
        equipment_slots: 0,
      });
    }
  }
  if (inserts.length) {
    const write = await supabase.from('cards').insert(inserts);
    if (write.error) throw write.error;
  }

  cardsQuery = await supabase.from('cards').select('id,name,entity_type,slug,rarity,image_url,is_active,is_gacha_enabled').eq('collection_id', collectionId);
  if (cardsQuery.error) throw cardsQuery.error;
  existingCards = cardsQuery.data || [];
  byKey = new Map(existingCards.filter((card) => card.slug).map((card) => [`${card.entity_type}|${card.slug}`, card]));
  const desiredCardKeys = new Set(plan.cards.map((entry) => `${entry.entityType}|${entry.slug}`));
  await pool(plan.cards, 16, async (desired) => {
    const card = byKey.get(`${desired.entityType}|${desired.slug}`);
    if (!card) throw new Error(`CARD_NOT_FOUND:${desired.filename}`);
    const write = await supabase.from('cards').update({ name: card.name || desired.name, is_active: true, is_universal_equipment: desired.entityType === 'item', updated_at: now }).eq('id', card.id);
    if (write.error) throw write.error;
  });
  const staleCards = existingCards.filter((card) => !card.slug || !desiredCardKeys.has(`${card.entity_type}|${card.slug}`));
  if (staleCards.length) {
    const write = await supabase.from('cards').update({ is_active: false, is_gacha_enabled: false, image_url: null, updated_at: now }).in('id', staleCards.map((card) => card.id));
    if (write.error) throw write.error;
  }

  const freshCardsQuery = await supabase.from('cards').select('id,name,entity_type,slug,image_url,is_active').eq('collection_id', collectionId);
  if (freshCardsQuery.error) throw freshCardsQuery.error;
  const freshCards = freshCardsQuery.data || [];
  const cardsMap = new Map(freshCards.filter((card) => card.slug).map((card) => [`${card.entity_type}|${card.slug}`, card]));
  const cardIds = freshCards.map((card) => card.id);
  let forms = [];
  if (cardIds.length) {
    const formsQuery = await supabase.from('card_forms').select('id,card_id,slug,name,image_url,is_active').in('card_id', cardIds);
    if (formsQuery.error) throw formsQuery.error;
    forms = formsQuery.data || [];
  }
  let formsMap = new Map(forms.filter((form) => form.slug).map((form) => [`${form.card_id}|${form.slug}`, form]));
  const formInserts = [];
  for (let index = 0; index < plan.forms.length; index += 1) {
    const desired = plan.forms[index];
    const base = cardsMap.get(`${desired.baseType}|${desired.baseSlug}`);
    if (!base) throw new Error(`FORM_BASE_NOT_FOUND:${desired.filename}`);
    if (!formsMap.has(`${base.id}|${desired.slug}`)) {
      formInserts.push({ id: `form_zip_${safeId(collectionId)}_${safeId(base.id)}_${safeId(desired.slug)}`, card_id: base.id, name: desired.name, rarity: null, slug: desired.slug, order_index: index + 1, is_active: true });
    }
  }
  if (formInserts.length) {
    const write = await supabase.from('card_forms').insert(formInserts);
    if (write.error) throw write.error;
  }

  let refreshedForms = [];
  if (cardIds.length) {
    const formsQuery = await supabase.from('card_forms').select('id,card_id,slug,name,image_url,is_active').in('card_id', cardIds);
    if (formsQuery.error) throw formsQuery.error;
    refreshedForms = formsQuery.data || [];
  }
  formsMap = new Map(refreshedForms.filter((form) => form.slug).map((form) => [`${form.card_id}|${form.slug}`, form]));
  const desiredFormKeys = new Set();
  for (let index = 0; index < plan.forms.length; index += 1) {
    const desired = plan.forms[index];
    const base = cardsMap.get(`${desired.baseType}|${desired.baseSlug}`);
    const form = base && formsMap.get(`${base.id}|${desired.slug}`);
    if (!form) throw new Error(`FORM_NOT_FOUND:${desired.filename}`);
    desiredFormKeys.add(`${base.id}|${desired.slug}`);
    const write = await supabase.from('card_forms').update({ name: form.name || desired.name, order_index: index + 1, is_active: true, updated_at: now }).eq('id', form.id);
    if (write.error) throw write.error;
  }
  const staleForms = refreshedForms.filter((form) => !desiredFormKeys.has(`${form.card_id}|${form.slug}`));
  if (staleForms.length) {
    const write = await supabase.from('card_forms').update({ is_active: false, image_url: null, updated_at: now }).in('id', staleForms.map((form) => form.id));
    if (write.error) throw write.error;
  }

  const finalFormsQuery = cardIds.length ? await supabase.from('card_forms').select('id,card_id,slug,name,image_url,is_active').in('card_id', cardIds) : { data: [], error: null };
  if (finalFormsQuery.error) throw finalFormsQuery.error;
  const finalForms = finalFormsQuery.data || [];
  const finalFormsMap = new Map(finalForms.filter((form) => form.slug).map((form) => [`${form.card_id}|${form.slug}`, form]));
  const entryMap = new Map(entries.map((entry) => [basename(entry.name), entry]));
  const mediaPlan = [
    { kind: 'collection', filename: plan.cover },
    ...plan.cards.map((entry) => ({ kind: 'card', filename: entry.filename, entry })),
    ...plan.forms.map((entry) => ({ kind: 'form', filename: entry.filename, entry })),
  ];
  const desiredPaths = new Set();
  await pool(mediaPlan, 18, async (media) => {
    const zipEntry = entryMap.get(media.filename);
    if (!zipEntry) throw new Error(`ZIP_ENTRY_NOT_FOUND:${media.filename}`);
    const bytes = Buffer.from(await zipEntry.async('uint8array'));
    const mimeType = mimeFromBytes(bytes);
    if (!mimeType) throw new Error(`INVALID_IMAGE:${media.filename}`);
    let folder = 'collection';
    let card = null;
    let form = null;
    if (media.kind === 'card') {
      folder = media.entry.entityType;
      card = cardsMap.get(`${media.entry.entityType}|${media.entry.slug}`);
    } else if (media.kind === 'form') {
      folder = 'form';
      card = cardsMap.get(`${media.entry.baseType}|${media.entry.baseSlug}`);
      form = card && finalFormsMap.get(`${card.id}|${media.entry.slug}`);
    }
    const storagePath = `${collectionId}/${folder}/${media.filename}`;
    desiredPaths.add(storagePath);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const existingMediaQuery = await supabase.from('media_assets').select('id,sha256').eq('storage_path', storagePath).maybeSingle();
    const existingMedia = existingMediaQuery.data;
    if (!existingMedia || existingMedia.sha256 !== sha256) {
      const upload = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: mimeType, upsert: true, cacheControl: '31536000' });
      if (upload.error) throw upload.error;
    }
    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data?.publicUrl;
    if (!publicUrl) throw new Error(`PUBLIC_URL_FAILED:${media.filename}`);
    let link;
    if (media.kind === 'collection') link = await supabase.from('collections').update({ cover_url: publicUrl, updated_at: now }).eq('id', collectionId);
    else if (media.kind === 'form') link = await supabase.from('card_forms').update({ image_url: publicUrl, updated_at: now }).eq('id', form.id);
    else link = await supabase.from('cards').update({ image_url: publicUrl, updated_at: now }).eq('id', card.id);
    if (link.error) throw link.error;
    const mediaWrite = await supabase.from('media_assets').upsert({ collection_id: collectionId, card_id: card?.id || null, form_id: form?.id || null, entity_type: media.kind === 'collection' ? 'collection' : media.kind === 'form' ? 'form' : media.entry.entityType, storage_path: storagePath, original_filename: media.filename, sha256, mime_type: mimeType, byte_size: bytes.length, updated_at: now }, { onConflict: 'storage_path' });
    if (mediaWrite.error) throw mediaWrite.error;
  });

  const mediaQuery = await supabase.from('media_assets').select('id,storage_path').eq('collection_id', collectionId);
  if (mediaQuery.error) throw mediaQuery.error;
  const staleMedia = (mediaQuery.data || []).filter((row) => !desiredPaths.has(row.storage_path));
  if (staleMedia.length) {
    await supabase.storage.from(BUCKET).remove(staleMedia.map((row) => row.storage_path));
    const deletion = await supabase.from('media_assets').delete().in('id', staleMedia.map((row) => row.id));
    if (deletion.error) throw deletion.error;
  }

  const finalCardsQuery = await supabase.from('cards').select('id,image_url,is_active').eq('collection_id', collectionId).eq('is_active', true);
  if (finalCardsQuery.error) throw finalCardsQuery.error;
  const finalCards = finalCardsQuery.data || [];
  const finalCardIds = finalCards.map((card) => card.id);
  let activeForms = [];
  if (finalCardIds.length) {
    const formCheck = await supabase.from('card_forms').select('id,image_url,is_active').in('card_id', finalCardIds).eq('is_active', true);
    if (formCheck.error) throw formCheck.error;
    activeForms = formCheck.data || [];
  }
  const collectionCheck = await supabase.from('collections').select('cover_url').eq('id', collectionId).single();
  if (collectionCheck.error) throw collectionCheck.error;
  const ready = Boolean(collectionCheck.data?.cover_url) && finalCards.length === plan.cards.length && activeForms.length === plan.forms.length && !finalCards.some((card) => !card.image_url) && !activeForms.some((form) => !form.image_url);
  if (!ready) throw new Error(`POSTCHECK_FAILED:${JSON.stringify({ cover: Boolean(collectionCheck.data?.cover_url), cards: `${finalCards.length}/${plan.cards.length}`, forms: `${activeForms.length}/${plan.forms.length}` })}`);
  const activation = await supabase.from('collections').update({ is_active: true, updated_at: now }).eq('id', collectionId);
  if (activation.error) throw activation.error;

  return {
    key,
    name,
    zipEntries: entries.length,
    characters: plan.cards.filter((entry) => entry.entityType === 'character').length,
    bosses: plan.cards.filter((entry) => entry.entityType === 'boss').length,
    items: plan.cards.filter((entry) => entry.entityType === 'item').length,
    forms: plan.forms.length,
    ignoredItems: plan.ignoredItems.length,
    insertedCards: inserts.length,
    insertedForms: formInserts.length,
    staleCards: staleCards.length,
    staleForms: staleForms.length,
    staleMedia: staleMedia.length,
    active: true,
  };
}

export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = String(req.query?.collection || '').toUpperCase();
  const mode = String(req.query?.mode || 'inspect').toLowerCase();
  if (!SPECS[key]) return res.status(400).json({ error: 'Unsupported collection', supported: Object.keys(SPECS) });
  try {
    const result = mode === 'import' ? await importCollection(key) : await inspect(key);
    return res.status(200).json({ ok: true, mode, result });
  } catch (error) {
    console.error('protected-preview-import', key, mode, error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
