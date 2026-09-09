import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Link2, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { normalizeImageUrl, detectImageProvider, isHttpImageUrl } from '../../utils/normalizeImageUrl.js';
import { clearPlayerCardArtwork, savePlayerCardArtwork } from '../../../services/supabase/playerArtworkService.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function testImageLoad(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ ok: false, width: 0, height: 0 });
    img.src = src;
  });
}

export default function PlayerCardArtworkEditor({ card, currentArtwork = null, onClose, onSaved }) {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(currentArtwork?.artwork_original_url || currentArtwork?.artwork_url || '');
  const [previewUrl, setPreviewUrl] = useState(currentArtwork?.effective_url || currentArtwork?.artwork_url || '');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState(null);

  const provider = useMemo(() => detectImageProvider(url), [url]);

  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const applyExternal = async () => {
    const normalized = normalizeImageUrl(url);
    if (!isHttpImageUrl(normalized)) throw new Error('Informe uma URL HTTP/HTTPS válida.');
    const result = await testImageLoad(normalized);
    if (!result.ok || result.width < 1 || result.height < 1) {
      throw new Error(`Não foi possível carregar a imagem de ${provider}. O servidor pode bloquear hotlink.`);
    }
    return savePlayerCardArtwork({ cardId: card.id || card.card_id, externalUrl: normalized, sourceType: 'external' });
  };

  const handleSave = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = tab === 'upload'
        ? await savePlayerCardArtwork({ cardId: card.id || card.card_id, file })
        : await applyExternal();
      setMessage({ type: 'success', text: 'Arte pessoal salva. Ela substitui apenas a imagem desta carta no seu acervo.' });
      if (onSaved) await onSaved(result);
    } catch (error) {
      const messages = {
        CARD_NOT_OWNED: 'Esta carta não está no seu acervo.',
        IMAGE_TYPE_NOT_SUPPORTED: 'Use JPG, PNG, WEBP ou GIF.',
        IMAGE_TOO_LARGE: 'A imagem deve ter no máximo 10 MB.',
        INVALID_EXTERNAL_URL: 'A URL informada não é válida.'
      };
      setMessage({ type: 'error', text: messages[error.message] || error.message || 'Não foi possível salvar a arte.' });
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setMessage(null);
    try {
      await clearPlayerCardArtwork(card.id || card.card_id);
      setMessage({ type: 'success', text: 'Arte pessoal removida. A imagem oficial voltou a ser usada.' });
      if (onSaved) await onSaved(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível remover a arte.' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-y-auto rounded-2xl border border-primary/30 bg-card shadow-2xl max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-border/40 p-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><ImageIcon className="h-4 w-4" /> Arte pessoal</div>
            <h2 className="mt-1 text-lg font-black">{card?.name || 'Carta'}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Somente você verá esta alteração. A arte oficial não será modificada.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 border-b border-border/40">
          <button type="button" onClick={() => setTab('upload')} className={`p-3 text-xs font-black ${tab === 'upload' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><UploadCloud className="mr-2 inline h-4 w-4" />UPLOAD</button>
          <button type="button" onClick={() => setTab('url')} className={`p-3 text-xs font-black ${tab === 'url' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Link2 className="mr-2 inline h-4 w-4" />URL EXTERNA</button>
        </div>

        <div className="space-y-4 p-5">
          {tab === 'upload' ? (
            <label className="block cursor-pointer rounded-2xl border border-dashed border-primary/35 bg-muted/10 p-7 text-center hover:bg-primary/5">
              <UploadCloud className="mx-auto mb-3 h-9 w-9 text-primary" />
              <span className="block text-sm font-black">Escolha uma imagem</span>
              <span className="mt-1 block text-xs text-muted-foreground">JPG, PNG, WEBP ou GIF · até 10 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const next = event.target.files?.[0] || null; if (next && (!ALLOWED_TYPES.has(next.type) || next.size > MAX_FILE_BYTES)) { setMessage({ type: 'error', text: !ALLOWED_TYPES.has(next.type) ? 'Formato não suportado.' : 'A imagem excede 10 MB.' }); return; } setFile(next); setMessage(null); }} />
              {file && <span className="mt-3 block truncate text-xs font-mono text-primary">{file.name}</span>}
            </label>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">URL DA IMAGEM</label>
              <input value={url} onChange={(event) => { setUrl(event.target.value); setPreviewUrl(event.target.value); setMessage(null); }} placeholder="https://i.imgur.com/..." className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono outline-none focus:border-primary/60" />
              <p className="text-[10px] text-muted-foreground">Provedor detectado: <strong className="text-foreground">{provider}</strong></p>
            </div>
          )}

          <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-black/30">
            {previewUrl ? <img src={previewUrl} referrerPolicy="no-referrer" loading="lazy" alt={`Prévia de ${card?.name || 'carta'}`} className="max-h-[420px] max-w-full object-contain" onError={() => setMessage({ type: 'error', text: 'A imagem não pôde ser carregada. O provedor pode bloquear hotlink.' })} /> : <div className="text-center text-xs text-muted-foreground"><ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />Nenhuma imagem selecionada.</div>}
          </div>

          {message && <div className={`flex items-start gap-2 rounded-xl p-3 text-xs ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-destructive/10 text-destructive'}`}><CheckCircle2 className="h-4 w-4 shrink-0" />{message.text}</div>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-4">
            {currentArtwork && <button type="button" onClick={handleClear} disabled={busy || clearing} className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-black text-destructive disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{clearing ? 'REMOVENDO...' : 'USAR ARTE OFICIAL'}</button>}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={onClose} disabled={busy || clearing} className="rounded-xl border border-border px-4 py-2 text-xs font-black">CANCELAR</button>
              <button type="button" onClick={handleSave} disabled={busy || clearing || (tab === 'upload' ? !file : !url.trim())} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-40">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{busy ? 'SALVANDO...' : 'SALVAR ARTE'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
