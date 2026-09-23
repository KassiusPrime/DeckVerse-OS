import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Pencil, Plus, RotateCcw,
  Save, Search, Trash2, Upload, X, Zap
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Navbar from './Navbar';
import {
  createAcervoCard,
  deactivateAcervoEntry,
  getAcervoCollections,
  getAcervoEntries,
  permanentlyDeleteAcervoEntry,
  saveAcervoEntry,
  uploadAcervoImage,
} from './services/acervo/acervoService.js';

const PAGE_SIZE = 48;
const TABS = [
  { key: 'character', label: 'Personagens' },
  { key: 'form', label: 'Formas' },
  { key: 'item', label: 'Itens' },
  { key: 'boss', label: 'Bosses' },
];

const RARITIES = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Especial'];

const emptyEditor = {
  id: '', scope: 'card', name: '', rarity: 'Comum', entityType: 'character',
  synopsis: '', description: '', imageUrl: '', isActive: true,
};

function normalizeCollectionId(value) {
  return decodeURIComponent(value || '');
}

function toastMessage(setMessage, message, type = 'ok') {
  setMessage({ text: message, type });
  window.setTimeout(() => setMessage((current) => current.text === message ? { text: '', type: 'ok' } : current), 3200);
}

export default function AcervoCollection() {
  const { collectionId: rawCollectionId } = useParams();
  const collectionId = normalizeCollectionId(rawCollectionId);

  const [collection, setCollection] = useState(null);
  const [tab, setTab] = useState('character');
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('all');
  const [status, setStatus] = useState('all');
  const [letter, setLetter] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [editor, setEditor] = useState(null);
  const [editorIndex, setEditorIndex] = useState(-1);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', rarity: 'Comum', entityType: 'character', synopsis: '', description: '', imageUrl: '' });
  const [message, setMessage] = useState({ text: '', type: 'ok' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAcervoEntries({
        query,
        kind: tab,
        collectionId,
        rarity: rarity === 'all' ? null : rarity,
        letter: letter || null,
        limit: 300,
      });
      setRows(data || []);
      setSelected(new Set());
      setPage(1);
    } catch (error) {
      toastMessage(setMessage, error?.message || 'Falha ao carregar o acervo.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, query, tab, rarity, letter]);

  useEffect(() => {
    let active = true;
    getAcervoCollections().then((items) => {
      if (!active) return;
      setCollection((items || []).find((item) => String(item.id) === collectionId) || null);
    }).catch((error) => toastMessage(setMessage, error?.message || 'Falha ao carregar a coleção.', 'error'));
    return () => { active = false; };
  }, [collectionId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (status === 'active' && !row.isActive) return false;
      if (status === 'inactive' && row.isActive) return false;
      return true;
    });
  }, [rows, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedRows = useMemo(() => filteredRows.filter((row) => selected.has(row.id)), [filteredRows, selected]);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

  const updateLocal = (id, patch) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const saveRow = async (row, patch, advance = false) => {
    const previous = { ...row };
    updateLocal(row.id, patch);
    setSaving(true);
    try {
      await saveAcervoEntry(row.scope, row.id, patch);
      toastMessage(setMessage, 'Alteração salva.');
      if (advance) {
        const index = filteredRows.findIndex((item) => item.id === row.id);
        if (index >= 0 && index < filteredRows.length - 1) openEditor(filteredRows[index + 1], index + 1);
      }
    } catch (error) {
      setRows((current) => current.map((item) => item.id === row.id ? previous : item));
      toastMessage(setMessage, error?.message || 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (row, index = filteredRows.findIndex((item) => item.id === row.id)) => {
    setEditor({ ...row });
    setEditorIndex(index);
  };

  const saveEditor = async (advance = false) => {
    if (!editor?.name?.trim()) return toastMessage(setMessage, 'O nome é obrigatório.', 'error');
    const current = filteredRows.find((item) => item.id === editor.id);
    if (!current) return;
    await saveRow(current, {
      name: editor.name.trim(),
      rarity: editor.rarity,
      entityType: editor.entityType,
      synopsis: editor.synopsis,
      description: editor.description,
      imageUrl: editor.imageUrl,
      isActive: editor.isActive,
    }, advance);
    if (!advance) setEditor((currentEditor) => ({ ...currentEditor, saved: true }));
  };

  const moveEditor = (direction) => {
    const next = editorIndex + direction;
    if (next >= 0 && next < filteredRows.length) openEditor(filteredRows[next], next);
  };

  const toggleSelection = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) pageRows.forEach((row) => next.delete(row.id));
      else pageRows.forEach((row) => next.add(row.id));
      return next;
    });
  };

  const bulkStatus = async (value) => {
    if (!selectedRows.length) return;
    const snapshot = selectedRows.map((row) => ({ id: row.id, isActive: row.isActive }));
    setRows((current) => current.map((row) => selected.has(row.id) ? { ...row, isActive: value } : row));
    setSaving(true);
    try {
      for (const row of selectedRows) await saveAcervoEntry(row.scope, row.id, { isActive: value });
      toastMessage(setMessage, `${selectedRows.length} cartas atualizadas.`);
      setSelected(new Set());
    } catch (error) {
      const rollback = new Map(snapshot.map((item) => [item.id, item.isActive]));
      setRows((current) => current.map((row) => rollback.has(row.id) ? { ...row, isActive: rollback.get(row.id) } : row));
      toastMessage(setMessage, error?.message || 'Falha na ação em lote.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (row) => {
    if (!window.confirm(`Desativar "${row.name}"?`)) return;
    const previous = row.isActive;
    updateLocal(row.id, { isActive: false });
    try {
      await deactivateAcervoEntry(row.scope, row.id);
      toastMessage(setMessage, 'Carta desativada.');
    } catch (error) {
      updateLocal(row.id, { isActive: previous });
      toastMessage(setMessage, error?.message || 'Falha ao desativar.', 'error');
    }
  };

  const hardDelete = async (row) => {
    if (!window.confirm(`Excluir definitivamente "${row.name}"? Esta operação não pode ser desfeita.`)) return;
    setSaving(true);
    try {
      await permanentlyDeleteAcervoEntry(row.scope, row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      toastMessage(setMessage, 'Carta excluída definitivamente.');
      setEditor(null);
    } catch (error) {
      toastMessage(setMessage, error?.message || 'Exclusão bloqueada.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createCard = async () => {
    if (!newCard.name.trim()) return toastMessage(setMessage, 'Informe o nome da carta.', 'error');
    setSaving(true);
    try {
      const created = await createAcervoCard(collectionId, newCard);
      setRows((current) => [created, ...current]);
      setNewCardOpen(false);
      setNewCard({ name: '', rarity: 'Comum', entityType: tab === 'form' ? 'character' : tab, synopsis: '', description: '', imageUrl: '' });
      toastMessage(setMessage, 'Carta criada.');
    } catch (error) {
      toastMessage(setMessage, error?.message || 'Falha ao criar carta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadFor = async (file, target, setter) => {
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadAcervoImage(file, collectionId);
      setter((current) => ({ ...current, imageUrl: url }));
      if (target?.id) await saveAcervoEntry(target.scope, target.id, { imageUrl: url });
      toastMessage(setMessage, 'Imagem enviada.');
    } catch (error) {
      toastMessage(setMessage, error?.message || 'Falha no upload.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (!editor) return null;
    return <div className="fixed inset-0 z-[70] bg-black/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Editor de carta">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-primary">Editor · {editor.scope}</p><h2 className="text-lg font-black">{editor.name || 'Nova carta'}</h2></div>
          <button onClick={() => setEditor(null)} className="rounded-xl p-2 hover:bg-muted" aria-label="Fechar"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[220px_1fr]">
          <div>
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-muted">
              {editor.imageUrl ? <img src={editor.imageUrl} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>}
            </div>
            <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-black hover:border-primary/50"><Upload className="h-4 w-4"/>{saving ? 'Enviando…' : 'Trocar imagem'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" disabled={saving} onChange={(e) => uploadFor(e.target.files?.[0], editor, setEditor)}/></label>
          </div>
          <div className="space-y-4">
            <label className="block"><span className="text-xs font-black">Nome</span><input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-black">Raridade</span><select value={editor.rarity} onChange={(e) => setEditor({ ...editor, rarity: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm">{RARITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="block"><span className="text-xs font-black">Tipo</span><select value={editor.entityType} onChange={(e) => setEditor({ ...editor, entityType: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="character">Personagem</option><option value="item">Item</option><option value="boss">Boss</option></select></label>
            </div>
            <label className="block"><span className="text-xs font-black">Sinopse</span><textarea value={editor.synopsis} onChange={(e) => setEditor({ ...editor, synopsis: e.target.value })} rows="3" className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"/></label>
            <label className="block"><span className="text-xs font-black">Descrição</span><textarea value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} rows="5" className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"/></label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={editor.isActive} onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })}/> Ativa</label>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          <div className="flex gap-2"><button disabled={editorIndex <= 0 || saving} onClick={() => moveEditor(-1)} className="rounded-xl border border-border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><button disabled={editorIndex >= filteredRows.length - 1 || saving} onClick={() => moveEditor(1)} className="rounded-xl border border-border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div>
          <div className="flex gap-2"><button disabled={saving} onClick={() => hardDelete(editor)} className="rounded-xl border border-destructive/30 px-3 py-2 text-xs font-black text-destructive"><Trash2 className="mr-1 inline h-4 w-4"/>Excluir</button><button disabled={saving} onClick={() => saveEditor(false)} className="rounded-xl border border-primary/30 px-4 py-2 text-xs font-black"><Save className="mr-1 inline h-4 w-4"/>Salvar</button><button disabled={saving} onClick={() => saveEditor(true)} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Salvar e Próximo</button></div>
        </div>
      </div>
    </div>;
  };

  if (!collection && !loading) return <><Navbar/><main className="min-h-screen bg-background px-4 pb-24 pt-6 text-foreground"><div className="mx-auto max-w-5xl"><Link to="/acervo" className="inline-flex items-center gap-2 text-xs font-black text-primary"><ArrowLeft className="h-4 w-4"/>Acervo</Link><div className="mt-6 rounded-3xl border border-border bg-card p-12 text-center"><h1 className="text-2xl font-black">Coleção não encontrada</h1></div></div></main></>;

  return <><Navbar/><main className="min-h-screen bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to="/acervo" className="inline-flex items-center gap-2 text-xs font-black text-primary"><ArrowLeft className="h-4 w-4"/>Acervo</Link><h1 className="mt-3 text-3xl font-black">{collection?.name || 'Carregando…'}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{collection?.synopsis || collection?.description || 'Gerenciamento de conteúdo da coleção.'}</p></div>
        <button onClick={() => setNewCardOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4"/>Nova carta</button>
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">{TABS.map((item) => <button key={item.key} onClick={() => { setTab(item.key); setPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-black ${tab === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{item.label}</button>)}</div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_170px_150px_auto]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou raridade…" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"/></label>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">Todas as raridades</option>{RARITIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">Todos os status</option><option value="active">Ativas</option><option value="inactive">Inativas</option></select>
          <button onClick={() => { setQuery(''); setRarity('all'); setStatus('all'); setLetter(''); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-black"><RotateCcw className="h-4 w-4"/>Limpar</button>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-4 py-3">{['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((item) => <button key={item} onClick={() => setLetter(letter === item ? '' : item)} className={`h-8 min-w-8 rounded-lg px-2 text-[10px] font-black ${letter === item ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div>
      </section>

      {selectedRows.length > 0 && <div className="sticky top-[70px] z-30 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3"><span className="mr-auto text-xs font-black">{selectedRows.length} selecionadas</span><button disabled={saving} onClick={() => bulkStatus(true)} className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Ativar</button><button disabled={saving} onClick={() => bulkStatus(false)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-black">Desativar</button><button onClick={() => setSelected(new Set())} className="rounded-xl border border-border bg-card p-2"><X className="h-4 w-4"/></button></div>}

      <div className="mt-5 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={allPageSelected} onChange={togglePage}/> Selecionar página</label><span className="text-xs text-muted-foreground">{filteredRows.length} resultados · página {safePage}/{totalPages}</span></div>

      {loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> :
        pageRows.length === 0 ? <div className="mt-4 rounded-3xl border border-dashed border-border p-14 text-center"><ImagePlus className="mx-auto h-10 w-10 text-muted-foreground"/><p className="mt-3 text-sm font-bold">Nenhuma entrada encontrada.</p></div> :
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">{pageRows.map((row) => <article key={row.id} className={`overflow-hidden rounded-2xl border bg-card ${row.isActive ? 'border-border' : 'border-destructive/30 opacity-70'}`}>
          <div className="relative aspect-[2/3] bg-muted">{row.imageUrl ? <img src={row.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>}<input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelection(row.id)} className="absolute left-3 top-3 h-4 w-4"/></div>
          <div className="p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-sm font-black">{row.name}</h2><p className="mt-1 text-[10px] text-muted-foreground">{row.rarity || 'Sem raridade'}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.isActive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{row.isActive ? 'ATIVA' : 'INATIVA'}</span></div><div className="mt-3 flex gap-2"><button onClick={() => openEditor(row)} className="flex-1 rounded-xl border border-border py-2 text-xs font-black hover:border-primary/50"><Pencil className="mr-1 inline h-3.5 w-3.5"/>Editar</button><button onClick={() => softDelete(row)} className="rounded-xl border border-border px-3 py-2 text-xs" title="Desativar"><Zap className="h-3.5 w-3.5"/></button></div></div>
        </article>)}</div>}

      <div className="mt-6 flex items-center justify-center gap-2"><button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><span className="min-w-24 text-center text-xs font-black">Página {safePage} de {totalPages}</span><button disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div>
    </div>
  </main>

  {newCardOpen && <div className="fixed inset-0 z-[70] bg-black/60 p-4 backdrop-blur-sm"><div className="mx-auto mt-[8vh] max-w-xl rounded-3xl border border-border bg-background p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Nova carta</h2><button onClick={() => setNewCardOpen(false)}><X className="h-5 w-5"/></button></div><div className="mt-5 space-y-4"><input autoFocus value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} placeholder="Nome" className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"/><div className="grid gap-3 sm:grid-cols-2"><select value={newCard.entityType} onChange={(e) => setNewCard({ ...newCard, entityType: e.target.value })} className="h-11 rounded-xl border border-border bg-card px-3 text-sm"><option value="character">Personagem</option><option value="item">Item</option><option value="boss">Boss</option></select><select value={newCard.rarity} onChange={(e) => setNewCard({ ...newCard, rarity: e.target.value })} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">{RARITIES.map((item) => <option key={item}>{item}</option>)}</select></div><textarea value={newCard.synopsis} onChange={(e) => setNewCard({ ...newCard, synopsis: e.target.value })} placeholder="Sinopse" rows="3" className="w-full rounded-xl border border-border bg-card p-3 text-sm"/><textarea value={newCard.description} onChange={(e) => setNewCard({ ...newCard, description: e.target.value })} placeholder="Descrição" rows="4" className="w-full rounded-xl border border-border bg-card p-3 text-sm"/><div className="flex justify-end gap-2"><button onClick={() => setNewCardOpen(false)} className="rounded-xl border border-border px-4 py-2 text-xs font-black">Cancelar</button><button disabled={saving} onClick={createCard} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">{saving ? 'Criando…' : 'Criar carta'}</button></div></div></div></div>}

  {renderEditor()}
  {message.text && <div className={`fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border p-4 text-xs font-bold shadow-2xl ${message.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/30 bg-card text-foreground'}`}>{message.text}</div>}
</>;
}
