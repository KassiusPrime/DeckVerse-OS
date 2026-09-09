import React, { useEffect, useMemo, useState } from 'react';
import { UploadCloud, Link2, Image as ImageIcon, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../../services/supabase/client.js';
import { normalizeImageUrl, detectImageProvider, isHttpImageUrl } from '../../utils/normalizeImageUrl.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_ENTITY_TYPES = new Set(['collection', 'character', 'item', 'boss']);

function slugify(value) {
  return String(value || 'card')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';
}

function testImageLoad(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ ok: false, width: 0, height: 0 });
    img.src = src;
  });
}

function getEntityType(card) {
  const raw = String(card?.entityType || card?.entity_type || card?.type || 'character').toLowerCase().trim();
  return ALLOWED_ENTITY_TYPES.has(raw) ? raw : 'character';
}

function buildStoragePath(card, file) {
  const collectionCode = String(card?.collection_id || card?.collection_code || 'MULTIVERSE').trim().toUpperCase();
  const entityType = getEntityType(card);
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExtension = extension === 'jpeg' ? 'jpg' : extension;
  const canonicalFilename = `${collectionCode}__${entityType}__${slugify(card?.slug || card?.card_id || card?.id || card?.name)}.${safeExtension}`;
  return `deckverse-media/${collectionCode}/${entityType}/${canonicalFilename}`;
}

export default function CardArtworkEditorModal({ card, onClose, onApply }) {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(card?.artwork_url || card?.img_oficial || card?.image_url || '');
  const [previewUrl, setPreviewUrl] = useState(card?.artwork_url || card?.img_oficial || card?.image_url || '');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const provider = useMemo(() => detectImageProvider(url), [url]);

  const validateFile = (candidate) => {
    if (!candidate) return 'Selecione uma imagem.';
    if (!ALLOWED_TYPES.has(candidate.type)) return 'Formato não suportado. Use JPG, PNG, WEBP ou GIF.';
    if (candidate.size > MAX_FILE_BYTES) return 'A imagem excede o limite de 25 MB.';
    return null;
  };

  const validateUrl = async () => {
    const normalized = normalizeImageUrl(url);
    if (!isHttpImageUrl(normalized)) throw new Error('Informe uma URL HTTP/HTTPS válida.');
    setUrl(normalized);
    const result = await testImageLoad(normalized);
    if (!result.ok || result.width < 1 || result.height < 1) throw new Error(`Não foi possível carregar a imagem de ${provider}. O servidor pode bloquear hotlink/CORS.`);
    setPreviewUrl(normalized);
    return { normalized, ...result };
  };

  const handleApply = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (tab === 'upload') {
        const fileError = validateFile(file);
        if (fileError) throw new Error(fileError);
        const supabase = getSupabaseBrowserClient();
        const path = buildStoragePath(card, file);
        const { error: uploadError } = await supabase.storage.from('cards').upload(path, file, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: true,
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('cards').getPublicUrl(path);
        const downloadUrl = publicData?.publicUrl;
        if (!downloadUrl) throw new Error('Não foi possível obter a URL pública da imagem.');

        await onApply({
          artwork_source_type: 'storage',
          artwork_url: downloadUrl,
          artwork_storage_path: path,
          artwork_original_url: null,
          img_oficial: downloadUrl,
          image_url: downloadUrl,
          updated_at: new Date().toISOString(),
        });
      } else {
        const result = await validateUrl();
        await onApply({
          artwork_source_type: 'external',
          artwork_url: result.normalized,
          artwork_storage_path: null,
          artwork_original_url: result.normalized,
          img_oficial: result.normalized,
          image_url: result.normalized,
          updated_at: new Date().toISOString(),
        });
      }
      setStatus({ type: 'success', message: 'Arte da carta aplicada e, quando enviada, armazenada no Supabase Storage.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Não foi possível atualizar a arte.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-primary/40 bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div><h2 className="font-heading text-sm font-bold tracking-widest">ALTERAR ARTE DA CARTA</h2><p className="text-xs text-muted-foreground mt-1">{card?.name || 'Carta'}</p></div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 border-b border-border/40">
          <button onClick={() => setTab('upload')} className={`p-3 text-xs font-heading font-bold ${tab === 'upload' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}><UploadCloud className="w-4 h-4 inline mr-2" />UPLOAD</button>
          <button onClick={() => setTab('url')} className={`p-3 text-xs font-heading font-bold ${tab === 'url' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}><Link2 className="w-4 h-4 inline mr-2" />URL EXTERNA</button>
        </div>
        <div className="p-5 space-y-4">
          {tab === 'upload' ? (
            <label className="block cursor-pointer rounded-xl border border-dashed border-primary/40 bg-muted/10 p-8 text-center hover:bg-primary/5">
              <UploadCloud className="w-9 h-9 mx-auto text-primary mb-3" />
              <span className="block text-sm font-heading font-bold">Selecione a arte no dispositivo</span>
              <span className="block text-xs text-muted-foreground mt-1">JPG, PNG, WEBP ou GIF · máximo 25 MB · Supabase Storage</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const next = e.target.files?.[0] || null; setFile(next); setStatus(null); }} />
              {file && <span className="block text-xs text-primary mt-3 font-mono">{file.name}</span>}
            </label>
          ) : (
            <div className="space-y-2"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">URL DA IMAGEM</label><input value={url} onChange={(e) => { setUrl(e.target.value); setPreviewUrl(e.target.value); setStatus(null); }} placeholder="https://..." className="w-full h-10 rounded-md border border-border/50 bg-muted/20 px-3 text-xs font-mono outline-none focus:border-primary/60" /><div className="text-[10px] text-muted-foreground">Provedor detectado: <span className="text-foreground font-semibold">{provider}</span>. URL externa é mantida como referência.</div></div>
          )}
          <div className="rounded-xl border border-border/40 bg-black/30 min-h-[260px] flex items-center justify-center overflow-hidden">
            {previewUrl ? <img src={previewUrl} referrerPolicy="no-referrer" loading="lazy" alt={`Prévia de ${card?.name || 'carta'}`} className="max-h-[420px] max-w-full object-contain" onError={() => setStatus({ type: 'error', message: 'A prévia não pôde ser carregada. O provedor pode bloquear hotlink.' })} /> : <div className="text-center text-muted-foreground text-xs"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />Nenhuma imagem selecionada.</div>}
          </div>
          {status && <div className={`flex items-start gap-2 rounded-lg p-3 text-xs ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>{status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}{status.message}</div>}
          <div className="flex justify-end gap-3 pt-3 border-t border-border/40"><button onClick={onClose} disabled={busy} className="px-4 py-2 text-xs font-heading border border-border/50 rounded">CANCELAR</button><button onClick={handleApply} disabled={busy || (tab === 'upload' ? !file : !url.trim())} className="px-5 py-2 bg-primary text-primary-foreground text-xs font-heading font-bold rounded disabled:opacity-40 flex items-center gap-2">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {busy ? 'APLICANDO...' : 'APLICAR ARTE'}</button></div>
        </div>
      </div>
    </div>
  );
}
