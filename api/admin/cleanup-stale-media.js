import { createClient } from '@supabase/supabase-js';

const ALLOWED = new Set([
  'COL-01-AOT','COL-01-BER','COL-01-BCL','COL-01-BLC','COL-01-CSM','COL-01-DS','COL-01-DBZ','COL-01-FATE','COL-01-FMA','COL-01-HXH','COL-01-JOJO','COL-01-JJK','COL-01-MHA','COL-01-NRT','COL-01-OP','COL-01-OPM','COL-01-SS','COL-01-SL','COL-01-TG','COL-01-TOG','COL-01-VS','COL-01-YYH','COL-02-BB','COL-02-CP77','COL-02-DS','COL-02-DMC'
]);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rrujnjraonckjdtpsfol.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'cards';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY_MISSING' });
  const collectionId = String(req.query?.collection || '').trim();
  if (!ALLOWED.has(collectionId)) return res.status(400).json({ error: 'Unsupported collection' });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const [{ data: cards, error: cardsError }, { data: media, error: mediaError }] = await Promise.all([
      supabase.from('cards').select('id,is_active,image_url').eq('collection_id', collectionId),
      supabase.from('media_assets').select('id,storage_path,card_id,form_id,entity_type').eq('collection_id', collectionId)
    ]);
    if (cardsError || mediaError) throw cardsError || mediaError;

    const cardIds = (cards || []).map((c) => c.id);
    let forms = [];
    if (cardIds.length) {
      const { data, error } = await supabase.from('card_forms').select('id,card_id,is_active,image_url').in('card_id', cardIds);
      if (error) throw error;
      forms = data || [];
    }

    const activeCardIds = new Set((cards || []).filter((c) => c.is_active).map((c) => c.id));
    const activeFormIds = new Set(forms.filter((f) => f.is_active).map((f) => f.id));

    const stale = (media || []).filter((m) => {
      if (m.entity_type === 'collection') return false;
      if (m.form_id) return !activeFormIds.has(m.form_id);
      if (m.card_id) return !activeCardIds.has(m.card_id);
      return true;
    });

    if (stale.length) {
      const paths = stale.map((m) => m.storage_path).filter(Boolean);
      if (paths.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) throw error;
      }
      const { error } = await supabase.from('media_assets').delete().in('id', stale.map((m) => m.id));
      if (error) throw error;
    }

    const [{ data: collection, error: collectionError }, { data: finalMedia, error: finalMediaError }] = await Promise.all([
      supabase.from('collections').select('id,name,cover_url,is_active').eq('id', collectionId).single(),
      supabase.from('media_assets').select('id,card_id,form_id,entity_type').eq('collection_id', collectionId)
    ]);
    if (collectionError || finalMediaError) throw collectionError || finalMediaError;

    const activeCards = (cards || []).filter((c) => c.is_active);
    const activeForms = forms.filter((f) => f.is_active);
    const missingCardImages = activeCards.filter((c) => !c.image_url).length;
    const missingFormImages = activeForms.filter((f) => !f.image_url).length;
    const expectedMedia = 1 + activeCards.length + activeForms.length;

    return res.status(200).json({
      ok: true,
      collectionId,
      removedStaleMedia: stale.length,
      activeCards: activeCards.length,
      activeForms: activeForms.length,
      mediaAssets: (finalMedia || []).length,
      expectedMedia,
      hasCover: Boolean(collection?.cover_url),
      missingCardImages,
      missingFormImages,
      clean: Boolean(collection?.cover_url) && missingCardImages === 0 && missingFormImages === 0 && (finalMedia || []).length === expectedMedia
    });
  } catch (error) {
    console.error('cleanup-stale-media', collectionId, error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
